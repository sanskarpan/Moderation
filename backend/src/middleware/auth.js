const { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { PrismaClient } = require('@prisma/client');
const { StatusCodes } = require('http-status-codes');

const prisma = new PrismaClient();


// Middleware to make user auth data available, but doesn't require authentication
// Useful for routes that behave differently for logged-in vs anonymous users
const withAuth = ClerkExpressWithAuth({});

/**
 * Middleware to sync Clerk user data with local database.
 */
const syncUserWithDb = async (req, res, next) => {
  // req.auth should be populated by Clerk's middleware
  if (!req.auth || !req.auth.userId) {
    console.warn('syncUserWithDb called without req.auth.userId');
    return next(); 
  }

  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: req.auth.userId },
    });

    if (!user) {
      // Fetch user details from Clerk if not found locally
      const clerkUser = await clerkClient.users.getUser(req.auth.userId);
      if (!clerkUser) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found in Clerk' });
      }

      // Get primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;

      if (!primaryEmail) {
        console.error(`Primary email not found for Clerk user ${req.auth.userId}`);
         return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User primary email not found' });
      }

      // Create user in our database
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: primaryEmail,
          username: clerkUser.username || `user_${clerkUser.id.substring(0, 8)}`,
          role: 'USER', // default role
        },
      });
       console.log(`Created local user for Clerk user ${req.auth.userId}`);
    }

    // Attached local user object to the request for downstream handlers
    req.localUser = user;
    next();

  } catch (error) {
    console.error('Error syncing user with DB:', error);
     // Determine if the error is from Clerk API or DB
    if (error.clerkError) {
        return res.status(error.status || StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Clerk error during user sync' });
    }
    // Handle Prisma or other errors
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error processing user data' });
  }
};


/**
 * Authorization middleware that checks if the user is an admin based on local DB role.
 * Must run *after* syncUserWithDb.
 */
const authorizeAdmin = (req, res, next) => {
  // Use req.localUser populated by syncUserWithDb
  if (!req.localUser || req.localUser.role !== 'ADMIN') {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};


module.exports = {
  withAuth,    // Use this for optional login
  syncUserWithDb, // Run this after requireAuth/withAuth
  authorizeAdmin, // Run this after syncUserWithDb for admin routes
};