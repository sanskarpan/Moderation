const { clerkClient } = require('@clerk/clerk-sdk-node');
const { PrismaClient } = require('@prisma/client');
const { StatusCodes } = require('http-status-codes');

const prisma = new PrismaClient();

/**
 * Authentication middleware that verifies the JWT token
 * and attaches the user to the request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get session token from header
    const sessionToken = req.header('Authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Authentication invalid',
      });
    }

    // Verify session with Clerk
    const sessions = await clerkClient.sessions.verifySession(sessionToken);
    if (!sessions || !sessions.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Authentication invalid',
      });
    }

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(sessions.userId);
    if (!clerkUser) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Authentication invalid',
      });
    }

    // Get or create user in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      // Get primary email
      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;

      if (!primaryEmail) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'User email not found',
        });
      }

      // Create user in our database
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: primaryEmail,
          username: clerkUser.username || `user-${clerkUser.id.substring(0, 8)}`,
        },
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'Authentication invalid',
    });
  }
};

/**
 * Authorization middleware that checks if the user is an admin
 */
const authorizeAdmin = async (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
};