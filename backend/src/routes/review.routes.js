const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const queueService = require('../services/queue.service');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
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
 *               - rating
 *               - postId
 *             properties:
 *               content:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               postId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, async (req, res) => {
  const { content, rating, postId } = req.body;
  
  // Validate request
  if (!content || !rating || !postId) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide content, rating, and postId',
    });
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Rating must be between 1 and 5',
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

  // Check if user has already reviewed this post
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: req.user.id,
      postId,
    },
  });

  if (existingReview) {
    return res.status(StatusCodes.CONFLICT).json({
      message: 'You have already reviewed this post',
    });
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      content,
      rating,
      userId: req.user.id,
      postId,
    },
  });

  // Queue review for moderation
  await queueService.addModerationJob({
    content,
    contentId: review.id,
    contentType: 'REVIEW',
    userId: req.user.id,
  });

  return res.status(StatusCodes.CREATED).json({ review });
});

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get all reviews
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: postId
 *         schema:
 *           type: string
 *         description: Filter reviews by post ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter reviews by user ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *         description: Filter reviews by rating
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
 *         description: A list of reviews
 */
router.get('/', async (req, res) => {
  const { postId, userId, rating, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;
  const where = {};

  if (postId) {
    where.postId = postId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (rating) {
    where.rating = Number(rating);
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
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
    prisma.review.count({ where }),
  ]);

  return res.status(StatusCodes.OK).json({
    reviews,
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
 * /reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review details
 *       404:
 *         description: Review not found
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const review = await prisma.review.findUnique({
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

  if (!review) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Review not found',
    });
  }

  return res.status(StatusCodes.OK).json({ review });
});

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content, rating } = req.body;
  const updateData = {};

  // Validate rating if provided
  if (rating !== undefined) {
    if (rating < 1 || rating > 5) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Rating must be between 1 and 5',
      });
    }
    updateData.rating = rating;
  }

  // Add content to update data if provided
  if (content) {
    updateData.content = content;
  }

  // Check if review exists and belongs to user
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Review not found',
    });
  }

  if (review.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to update this review',
    });
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { id },
    data: updateData,
  });

  // Queue updated review for moderation if content was updated
  if (content) {
    await queueService.addModerationJob({
      content,
      contentId: updatedReview.id,
      contentType: 'REVIEW',
      userId: req.user.id,
    });
  }

  return res.status(StatusCodes.OK).json({ review: updatedReview });
});

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Review not found
 */
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  // Check if review exists and belongs to user
  const review = await prisma.review.findUnique({
    where: { id },
  });

  if (!review) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: 'Review not found',
    });
  }

  if (review.userId !== req.user.id) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'You are not authorized to delete this review',
    });
  }

  // Delete review (will also delete related flagged content due to cascading)
  await prisma.review.delete({
    where: { id },
  });

  return res.status(StatusCodes.OK).json({
    message: 'Review deleted successfully',
  });
});

/**
 * @swagger
 * /reviews/user/{userId}:
 *   get:
 *     summary: Get reviews by user ID
 *     tags: [Reviews]
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
 *         description: A list of reviews by the user
 */
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
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
    prisma.review.count({ where: { userId } }),
  ]);

  return res.status(StatusCodes.OK).json({
    reviews,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  });
});

module.exports = router;