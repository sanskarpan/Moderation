const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      emailNotification: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          posts: true,
          comments: true,
          reviews: true,
          flaggedContents: true,
        },
      },
    },
  });

  return res.status(StatusCodes.OK).json({ user });
});

/**
 * @swagger
 * /auth/webhooks/user:
 *   post:
 *     summary: Webhook endpoint for Clerk user events
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post('/webhooks/user', async (req, res) => {
  const evt = req.body;

  try {
    // Process webhook based on event type
    const eventType = evt.type;

    switch (eventType) {
      case 'user.created': {
        const { id: clerkId, email_addresses, username } = evt.data;

        // Check if primary email exists
        const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id);

        if (!primaryEmail) {
          console.error('No primary email found for user:', clerkId);
          return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'No primary email found',
          });
        }

        // Create user in our database
        await prisma.user.create({
          data: {
            clerkId,
            email: primaryEmail.email_address,
            username: username || `user-${clerkId.substring(0, 8)}`,
          },
        });

        console.log('User created:', clerkId);
        break;
      }

      case 'user.updated': {
        const { id: clerkId, email_addresses, username } = evt.data;

        // Find user in our database
        const user = await prisma.user.findUnique({
          where: { clerkId },
        });

        if (!user) {
          console.error('User not found:', clerkId);
          return res.status(StatusCodes.NOT_FOUND).json({
            message: 'User not found',
          });
        }

        // Get updated primary email
        const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)?.email_address;

        // Update user
        await prisma.user.update({
          where: { clerkId },
          data: {
            ...(primaryEmail && { email: primaryEmail }),
            ...(username && { username }),
          },
        });

        console.log('User updated:', clerkId);
        break;
      }

      case 'user.deleted': {
        const clerkId = evt.data.id;

        // Find user in our database
        const user = await prisma.user.findUnique({
          where: { clerkId },
        });

        if (!user) {
          console.error('User not found:', clerkId);
          return res.status(StatusCodes.NOT_FOUND).json({
            message: 'User not found',
          });
        }

        // Delete user
        await prisma.user.delete({
          where: { clerkId },
        });

        console.log('User deleted:', clerkId);
        break;
      }

      default:
        console.log('Unhandled webhook event type:', eventType);
    }

    return res.status(StatusCodes.OK).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Webhook processing failed',
      error: error.message,
    });
  }
});

module.exports = router;