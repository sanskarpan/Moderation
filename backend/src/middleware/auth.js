const { ClerkExpressRequireAuth, ClerkExpressWithAuth, clerkClient } = require('@clerk/clerk-sdk-node');
const { PrismaClient } = require('@prisma/client');
const { StatusCodes } = require('http-status-codes');

const prisma = new PrismaClient();


// Middleware to make user auth data available, but doesn't require authentication
// Useful for routes that behave differently for logged-in vs anonymous users
const withAuth = ClerkExpressWithAuth({});
const requireAuth = ClerkExpressRequireAuth({});
/**
 * Middleware to sync Clerk user data with local database.
 */
const syncUserWithDb = async (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    // Log if called without auth, but proceed if possible (e.g., for public routes)
    // Or return an error if auth is strictly expected here
    // console.warn('syncUserWithDb called without req.auth.userId');
    return next();
  }

  const clerkUserId = req.auth.userId;

  try {
    // 1. Attempt to find the user first
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    // 2. If user exists, attach and continue
    if (user) {
      req.localUser = user;
      return next();
    }

    // 3. If user doesn't exist, *try* to create them.
    // This block might race with another concurrent request.
    console.log(`Local user for Clerk ID ${clerkUserId} not found. Attempting to fetch from Clerk and create.`);

    // Fetch details from Clerk (only if not found locally)
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (!clerkUser) {
      console.error(`User ${clerkUserId} not found in Clerk.`);
      // Decide response: maybe 404 or proceed without localUser?
      // For protected routes, an error is likely appropriate.
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found in authentication provider.' });
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress;

    if (!primaryEmail) {
      console.error(`Primary email not found for Clerk user ${clerkUserId}`);
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'User primary email not found.' });
    }

    // Prepare user data for creation
    const userDataToCreate = {
      clerkId: clerkUser.id,
      email: primaryEmail,
      username: clerkUser.username || `user_${clerkUser.id.substring(0, 8)}`, // Ensure username is unique or handle collisions
      role: 'USER', // Default role
    };

    try {
      // Attempt creation
      console.log(`Attempting to create user in DB for Clerk ID: ${clerkUserId}`);
      user = await prisma.user.create({
        data: userDataToCreate,
      });
      console.log(`Successfully created local user for Clerk ID ${clerkUserId}`);
      req.localUser = user;
      return next();

    } catch (error) {
      // Handle the potential P2002 (Unique Constraint Failed) error specifically
      if (error.code === 'P2002' && error.meta?.target?.includes('clerkId')) {
        console.warn(`Race condition detected: User creation for Clerk ID ${clerkUserId} failed (P2002). Attempting to fetch existing user again.`);
        // The user was likely created by a concurrent request. Try fetching again.
        user = await prisma.user.findUnique({
          where: { clerkId: clerkUserId },
        });

        if (user) {
          console.log(`Successfully fetched user for Clerk ID ${clerkUserId} after race condition.`);
          req.localUser = user;
          return next();
        } else {
          // This case is unlikely but means creation failed AND fetch failed right after.
          console.error(`Failed to fetch user ${clerkUserId} even after P2002 error.`);
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error synchronizing user data after race condition.' });
        }
      } else {
        // If it's a different error, re-throw it to be handled globally
        console.error(`Error creating user ${clerkUserId} in DB (non-P2002):`, error);
        throw error; // Let the global error handler deal with other DB errors
      }
    }

  } catch (error) {
    // Catch errors from findUnique, clerkClient.users.getUser, or re-thrown create errors
    console.error(`Error during user sync process for Clerk ID ${clerkUserId}:`, error);
    // Determine appropriate status code based on error type if possible
    if (error.clerkError) { // Assuming clerkClient errors might have this property
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
  requireAuth,
  withAuth,    
  syncUserWithDb, 
  authorizeAdmin, 
};