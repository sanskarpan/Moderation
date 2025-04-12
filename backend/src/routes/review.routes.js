const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const queueService = require('../services/queue.service');
const {
  validate,
  createReviewSchema,
  updateReviewSchema,
  paginationSchema
} = require('../middleware/validation');
// Removed authenticate import

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
 *             $ref: '#/components/schemas/CreateReviewInput'
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       409:
 *         description: Conflict (user already reviewed this post)
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth + syncUserWithDb globally
router.post('/', validate(createReviewSchema), async (req, res) => {
  const { content, rating, postId } = req.body; // Validation passed

  if (!req.localUser || !req.localUser.id) {
       console.error('Error: POST /reviews route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to create review.' });
   }

  try {
      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true }
      });

      if (!post) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Post not found' });
      }

      // Check if user has already reviewed this post
      const existingReview = await prisma.review.findFirst({
        where: {
          userId: req.localUser.id,
          postId,
        },
        select: { id: true } // Only need to know if it exists
      });

      if (existingReview) {
        return res.status(StatusCodes.CONFLICT).json({ message: 'You have already reviewed this post' });
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          content,
          rating, // Validation ensures it's 1-5
          userId: req.localUser.id,
          postId,
        },
        include: { // Include details in response
            user: { select: { id: true, username: true, clerkId: true}},
            post: { select: { id: true, title: true }}
        }
      });

      // Queue review for moderation (handle errors gracefully)
      try {
          await queueService.addModerationJob({
            content,
            contentId: review.id,
            contentType: 'REVIEW',
            userId: req.localUser.id,
          });
      } catch (queueError) {
           console.error(`Failed to queue moderation job for review ${review.id}:`, queueError);
           // Log but don't fail request
      }

      return res.status(StatusCodes.CREATED).json({ review });

  } catch (error) {
       console.error("Error creating review:", error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Post ID format.' });
       }
       // Handle other potential Prisma errors
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create review.' });
  }
});

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get all reviews (paginated)
 *     tags: [Reviews]
 *     # ... (parameters and responses as before) ...
 */
// Uses withAuth + syncUserWithDb globally
router.get('/', validate(paginationSchema, 'query'), async (req, res) => {
  const { postId, userId, rating } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {};

  if (postId) where.postId = postId;
  if (userId) where.userId = userId;
  if (rating && !isNaN(parseInt(rating))) where.rating = parseInt(rating); // Validate rating input

  try {
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: { select: { id: true, username: true, clerkId: true} },
            post: { select: { id: true, title: true } },
            flaggedContent: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where }),
      ]);

      return res.status(StatusCodes.OK).json({
        reviews,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
   } catch (error) {
       console.error("Error fetching reviews:", error);
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve reviews.' });
   }
});

/**
 * @swagger
 * /reviews/{id}:
 *   get:
 *     summary: Get a review by ID
 *     tags: [Reviews]
 *     # ... (parameters and responses as before) ...
 */
// Uses withAuth + syncUserWithDb globally
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
      const review = await prisma.review.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true, clerkId: true } },
          post: { select: { id: true, title: true } },
          flaggedContent: true,
        },
      });

      if (!review) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Review not found' });
      }

      return res.status(StatusCodes.OK).json({ review });
   } catch (error) {
       console.error(`Error fetching review ${id}:`, error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Review ID format.' });
       }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve review details.' });
   }
});

/**
 * @swagger
 * /reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     # ... (parameters, requestBody, responses as before) ...
 */
// Uses requireAuth + syncUserWithDb globally
router.put('/:id', validate(updateReviewSchema), async (req, res) => {
  const { id } = req.params;
  const { content, rating } = req.body; // Validation ensures at least one is present
  const updateData = {};

   if (!req.localUser || !req.localUser.id) {
       console.error('Error: PUT /reviews/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to update review.' });
   }

  // Add fields to updateData if provided
  if (content?.trim()) updateData.content = content.trim(); // Add trim
  if (rating !== undefined && rating >= 1 && rating <= 5) updateData.rating = rating; // Validation already handled by Joi, but good practice

  try {
      // Check if review exists and belongs to user
      const review = await prisma.review.findUnique({
        where: { id },
        select: { userId: true } // Only fetch owner ID
      });

      if (!review) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Review not found' });
      }

      if (review.userId !== req.localUser.id) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not authorized to update this review' });
      }

      // Update review
      const updatedReview = await prisma.review.update({
        where: { id },
        data: updateData,
        include: { // Include details in response
            user: { select: { id: true, username: true, clerkId: true }},
            post: { select: { id: true, title: true }},
            flaggedContent: true
        }
      });

      // Queue updated review for moderation if content was updated
      if (updateData.content) {
          try {
            await queueService.addModerationJob({
              content: updateData.content,
              contentId: updatedReview.id,
              contentType: 'REVIEW',
              userId: req.localUser.id,
            });
          } catch(queueError) {
             console.error(`Failed to queue moderation job for updated review ${updatedReview.id}:`, queueError);
             // Log but don't fail request
          }
      }

      return res.status(StatusCodes.OK).json({ review: updatedReview });

   } catch (error) {
       console.error(`Error updating review ${id}:`, error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Review ID format.' });
       }
       if (error.code === 'P2025') { // Handle case where review might be deleted between check and update
           return res.status(StatusCodes.NOT_FOUND).json({ message: 'Review not found' });
       }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update review.' });
   }
});

/**
 * @swagger
 * /reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     # ... (parameters and responses as before) ...
 */
// Uses requireAuth + syncUserWithDb globally
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

   if (!req.localUser || !req.localUser.id) {
       console.error('Error: DELETE /reviews/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to delete review.' });
   }

  try {
      // Check if review exists and belongs to user
      const review = await prisma.review.findUnique({
        where: { id },
        select: { userId: true } // Only need owner ID
      });

      if (!review) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Review not found' });
      }

      if (review.userId !== req.localUser.id) {
        // Optional: Allow admins to delete any review
        // if (req.localUser.role !== 'ADMIN') {
            return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not authorized to delete this review' });
        // }
      }

      // Delete review (cascades handle flagged content)
      await prisma.review.delete({ where: { id } });

      return res.status(StatusCodes.OK).json({ message: 'Review deleted successfully' });

   } catch (error) {
        console.error(`Error deleting review ${id}:`, error);
        if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Review ID format.' });
        }
        if (error.code === 'P2025') { // Record not found
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Review not found' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete review.' });
    }
});

/**
 * @swagger
 * /reviews/user/{userId}:
 *   get:
 *     summary: Get reviews by user ID
 *     tags: [Reviews]
 *     # ... (parameters and responses as before) ...
 */
// Uses withAuth + syncUserWithDb globally
router.get('/user/:userId', validate(paginationSchema, 'query'), async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
      // Optional: Check if user exists first
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found.' });
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where: { userId },
          include: {
            user: { select: { id: true, username: true, clerkId: true } },
            post: { select: { id: true, title: true } },
            flaggedContent: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where: { userId } }),
      ]);

      return res.status(StatusCodes.OK).json({
        reviews,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
   } catch (error) {
       console.error(`Error fetching reviews for user ${userId}:`, error);
        if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid User ID format.' });
        }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve user reviews.' });
   }
});

module.exports = router;