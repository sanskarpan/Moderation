const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const moderationService = require('../services/moderation.service');
const queueService = require('../services/queue.service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /admin/flagged:
 *   get:
 *     summary: Get all flagged content (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *         description: Filter by moderation status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COMMENT, REVIEW]
 *         description: Filter by content type
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of flagged content
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/flagged', authenticate, authorizeAdmin, async (req, res) => {
  const { status, type, userId, page, limit } = req.query;
  
  const result = await moderationService.getFlaggedContent({
    status,
    type,
    userId,
    page,
    limit,
  });

  return res.status(StatusCodes.OK).json(result);
});

/**
 * @swagger
 * /admin/flagged/{id}/approve:
 *   put:
 *     summary: Approve flagged content (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flagged content ID
 *     responses:
 *       200:
 *         description: Content approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Flagged content not found
 */
router.put('/flagged/:id/approve', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;

  // Check if flagged content exists
  const flaggedContent = await prisma.flaggedContent.findUnique({
    where: { id },
  });

  if (!flaggedContent) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Flagged content not found',
    });
  }

  // Queue admin action
  await queueService.addAdminActionJob({
    action: 'APPROVED',
    flaggedContentId: id,
  });

  return res.status(StatusCodes.OK).json({
    message: 'Content approval queued successfully',
  });
});

/**
 * @swagger
 * /admin/flagged/{id}/reject:
 *   put:
 *     summary: Reject flagged content (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flagged content ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Flagged content not found
 */
router.put('/flagged/:id/reject', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Check if flagged content exists
  const flaggedContent = await prisma.flaggedContent.findUnique({
    where: { id },
  });

  if (!flaggedContent) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Flagged content not found',
    });
  }

  // Queue admin action
  await queueService.addAdminActionJob({
    action: 'REJECTED',
    flaggedContentId: id,
    reason,
  });

  return res.status(StatusCodes.OK).json({
    message: 'Content rejection queued successfully',
  });
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/users', authenticate, authorizeAdmin, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
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
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count(),
  ]);

  return res.status(StatusCodes.OK).json({
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/users/:id/role', authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['USER', 'ADMIN'].includes(role)) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide a valid role (USER or ADMIN)',
    });
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'User not found',
    });
  }

  // Update user role
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
  });

  return res.status(StatusCodes.OK).json({
    message: 'User role updated successfully',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
    },
  });
});

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get system statistics (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', authenticate, authorizeAdmin, async (req, res) => {
  const [
    userCount,
    postCount,
    commentCount,
    reviewCount,
    flaggedCount,
    pendingCount,
    approvedCount,
    rejectedCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.review.count(),
    prisma.flaggedContent.count(),
    prisma.flaggedContent.count({ where: { status: 'PENDING' } }),
    prisma.flaggedContent.count({ where: { status: 'APPROVED' } }),
    prisma.flaggedContent.count({ where: { status: 'REJECTED' } }),
  ]);

  // Get recent flagged content
  const recentFlagged = await prisma.flaggedContent.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      comment: true,
      review: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  return res.status(StatusCodes.OK).json({
    stats: {
      users: userCount,
      posts: postCount,
      comments: commentCount,
      reviews: reviewCount,
      flagged: {
        total: flaggedCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    },
    recentFlagged,
  });
});

module.exports = router;