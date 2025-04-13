const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const queueService = require('../services/queue.service');
const {
  validate,
  createCommentSchema,
  updateCommentSchema,
  paginationSchema
} = require('../middleware/validation');
// Removed authenticate import - relying on global middleware

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
 *             $ref: '#/components/schemas/CreateCommentInput'
 *     responses:
 *       201:
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Bad request (validation error, missing fields)
 *       401:
 *         description: Unauthorized (handled by requireAuth middleware)
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth + syncUserWithDb from global middleware
// Applies specific validation middleware for this route
router.post('/', validate(createCommentSchema), async (req, res) => {
  const { content, postId } = req.body; // Validation ensures these exist

  // Middleware should guarantee localUser exists if requireAuth is used globally
  if (!req.localUser || !req.localUser.id) {
      console.error('Error: POST /comments route reached without req.localUser.id populated.');
       // This indicates a middleware setup issue if requireAuth was intended
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to create comment.' });
  }

  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true } // Only need to know if it exists
    });

    if (!post) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Post not found',
      });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content, // Content is already validated by Joi schema
        userId: req.localUser.id, // Use synced local user ID
        postId,
      },
      include: { // Include necessary details in the response
          user: { select: { id: true, username: true, clerkId: true }},
          post: { select: { id: true, title: true }},
          // flaggedContent: true // Optionally include immediately if needed
      }
    });

    // Queue comment for moderation (handle potential queue errors gracefully)
    try {
        await queueService.addModerationJob({
            content,
            contentId: comment.id,
            contentType: 'COMMENT',
            userId: req.localUser.id,
        });
    } catch (queueError) {
        console.error(`Failed to queue moderation job for comment ${comment.id}:`, queueError);
        // Decide if this should be a critical error or just logged.
        // For now, we'll log it but still return the created comment.
        // Sentry.captureException(queueError); // Report to Sentry if configured
    }


    return res.status(StatusCodes.CREATED).json({ comment });

  } catch (error) {
      console.error("Error creating comment:", error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Post ID format.' });
       }
       // Handle other potential Prisma errors
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to create comment.' });
  }
});

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get all comments (paginated)
 *     tags: [Comments]
 *     parameters:
 *      # ... (pagination and filter parameters as before) ...
 *     responses:
 *       200:
 *         description: A list of comments
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
// Uses withAuth + syncUserWithDb globally
router.get('/', validate(paginationSchema, 'query'), async (req, res) => {
  const { postId, userId } = req.query; // Validation middleware ensures page/limit exist
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {};

  if (postId) where.postId = postId;
  if (userId) where.userId = userId;

  try {
      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            user: { select: { id: true, username: true, clerkId: true } },
            post: { select: { id: true, title: true } },
            flaggedContent: true,
          },
          skip,
          take: limit, // Use parsed limit
          orderBy: { createdAt: 'desc' },
        }),
        prisma.comment.count({ where }),
      ]);

      return res.status(StatusCodes.OK).json({
        comments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
   } catch (error) {
       console.error("Error fetching comments:", error);
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve comments.' });
   }
});

/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Get a comment by ID
 *     tags: [Comments]
 *     # ... (parameters and responses as before) ...
 */
// Uses withAuth + syncUserWithDb globally
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
      const comment = await prisma.comment.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, username: true, clerkId: true } },
          post: { select: { id: true, title: true } },
          flaggedContent: true,
        },
      });

      if (!comment) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
      }

      return res.status(StatusCodes.OK).json({ comment });

  } catch (error) {
      console.error(`Error fetching comment ${id}:`, error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Comment ID format.' });
       }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve comment details.' });
  }
});

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     # ... (parameters, requestBody, responses as before) ...
 */
// Uses requireAuth + syncUserWithDb globally
router.put('/:id', validate(updateCommentSchema), async (req, res) => {
  const { id } = req.params;
  const { content } = req.body; // Validated to exist

  if (!req.localUser || !req.localUser.id) {
       console.error('Error: PUT /comments/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to update comment.' });
   }

  try {
      // Fetch comment to check ownership
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { userId: true } // Only fetch necessary field
      });

      if (!comment) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
      }

      // Check ownership
      if (comment.userId !== req.localUser.id) {
        return res.status(StatusCodes.FORBIDDEN).json({ // Use FORBIDDEN for authz errors
          message: 'You are not authorized to update this comment',
        });
      }

      // Update comment
      const updatedComment = await prisma.comment.update({
        where: { id },
        data: { content }, // Content is validated by schema
        include: { // Include details in response
            user: { select: { id: true, username: true, clerkId: true }},
            post: { select: { id: true, title: true }},
            flaggedContent: true
        }
      });

      // Queue updated comment for moderation (handle potential errors)
       try {
           await queueService.addModerationJob({
               content,
               contentId: updatedComment.id,
               contentType: 'COMMENT',
               userId: req.localUser.id,
           });
       } catch (queueError) {
           console.error(`Failed to queue moderation job for updated comment ${updatedComment.id}:`, queueError);
           // Log but don't fail the request
       }

      return res.status(StatusCodes.OK).json({ comment: updatedComment });

   } catch (error) {
       console.error(`Error updating comment ${id}:`, error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Comment ID format.' });
       }
       if (error.code === 'P2025') { // Handle case where comment might be deleted between check and update
           return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
       }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update comment.' });
   }
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     # ... (parameters and responses as before) ...
 */
// Uses requireAuth + syncUserWithDb globally
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

   if (!req.localUser || !req.localUser.id) {
       console.error('Error: DELETE /comments/:id route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user to delete comment.' });
   }

   try {
        // Check if comment exists and belongs to user
        const comment = await prisma.comment.findUnique({
            where: { id },
            select: { userId: true } // Only need owner ID
        });

        if (!comment) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
        }

        // Check ownership
        if (comment.userId !== req.localUser.id) {
             // Optional: Allow admins to delete any comment
            // if (req.localUser.role !== 'ADMIN') {
                return res.status(StatusCodes.FORBIDDEN).json({ message: 'You are not authorized to delete this comment' });
            // }
        }

        // Delete comment (cascades defined in schema should handle FlaggedContent)
        await prisma.comment.delete({ where: { id } });

        return res.status(StatusCodes.OK).json({ message: 'Comment deleted successfully' });

    } catch (error) {
        console.error(`Error deleting comment ${id}:`, error);
        if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Comment ID format.' });
        }
        if (error.code === 'P2025') { // Record not found
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Comment not found' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to delete comment.' });
    }
});

/**
 * @swagger
 * /comments/user/{userId}:
 *   get:
 *     summary: Get comments by user ID
 *     tags: [Comments]
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

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where: { userId },
          include: {
            user: { select: { id: true, username: true, clerkId: true} },
            post: { select: { id: true, title: true } },
            flaggedContent: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.comment.count({ where: { userId } }),
      ]);

      return res.status(StatusCodes.OK).json({
        comments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });

    } catch (error) {
        console.error(`Error fetching comments for user ${userId}:`, error);
        if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid User ID format.' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve user comments.' });
    }
});

module.exports = router;