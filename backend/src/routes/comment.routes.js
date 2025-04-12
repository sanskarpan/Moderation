const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const queueService = require('../services/queue.service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - postId
 *             properties:
 *               content:
 *                 type: string
 *               postId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, async (req, res) => {
  const { content, postId } = req.body;
  
  // Validate request
  if (!content || !postId) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide content and postId',
    });
  }

  // Check if post exists
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Post not found',
    });
  }

  // Create comment
  const comment = await prisma.comment.create({
    data: {
      content,
      userId: req.user.id,
      postId,
    },
  });

  // Queue comment for moderation
  await queueService.addModerationJob({
    content,
    contentId: comment.id,
    contentType: 'COMMENT',
    userId: req.user.id,
  });

  return res.status(StatusCodes.CREATED).json({ comment });
});

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get all comments
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: postId
 *         schema:
 *           type: string
 *         description: Filter comments by post ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter comments by user ID
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
 *         description: A list of comments
 */
router.get('/', async (req, res) => {
  const { postId, userId, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const where = {};

  if (postId) {
    where.postId = postId;
  }

  if (userId) {
    where.userId = userId;
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        flaggedContent: true,
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return res.status(StatusCodes.OK).json({
    comments,
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
 * /comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment details
 *       404:
 *         description: Comment not found
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
        },
      },
      flaggedContent: true,
    },
  });

  if (!comment) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Comment not found',
    });
  }

  return res.status(StatusCodes.OK).json({ comment });
});

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  // Check if comment exists and belongs to user
  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Comment not found',
    });
  }

  if (comment.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to update this comment',
    });
  }

  // Update comment
  const updatedComment = await prisma.comment.update({
    where: { id },
    data: { content },
  });

  // Queue updated comment for moderation
  await queueService.addModerationJob({
    content,
    contentId: updatedComment.id,
    contentType: 'COMMENT',
    userId: req.user.id,
  });

  return res.status(StatusCodes.OK).json({ comment: updatedComment });
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Check if comment exists and belongs to user
  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Comment not found',
    });
  }

  if (comment.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to delete this comment',
    });
  }

  // Delete comment (will also delete related flagged content due to cascading)
  await prisma.comment.delete({
    where: { id },
  });

  return res.status(StatusCodes.OK).json({
    message: 'Comment deleted successfully',
  });
});

/**
 * @swagger
 * /comments/user/{userId}:
 *   get:
 *     summary: Get comments by user ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *         description: A list of comments by the user
 */
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        flaggedContent: true,
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.comment.count({ where: { userId } }),
  ]);

  return res.status(StatusCodes.OK).json({
    comments,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

module.exports = router;