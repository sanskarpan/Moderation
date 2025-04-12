const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client');
const moderationService = require('../services/moderation.service');
const queueService = require('../services/queue.service');
const {
    validate,
    flaggedContentFilterSchema, 
    updateUserRoleSchema,
    rejectFlaggedContentSchema, 
    paginationSchema 
} = require('../middleware/validation');


const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /admin/flagged:
 *   get:
 *     summary: Get all flagged content (admin only, paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       # ... Add parameters based on flaggedContentFilterSchema: status, type, userId, page, limit ...
 *     responses:
 *       200:
 *         description: A list of flagged content items
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized (handled by middleware)
 *       403:
 *         description: Forbidden (handled by middleware)
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
// Uses validation for query parameters
router.get('/flagged', validate(flaggedContentFilterSchema, 'query'), async (req, res) => {
    // Validation middleware populates req.query with validated/defaulted values
    const { status, type, userId, page, limit } = req.query;

    try {
        // Call the service layer to fetch the content based on filters
        // The service doesn't need the logged-in admin's ID for this specific query,
        // but the authorizeAdmin middleware ensured they *are* an admin.
        // Passing userId allows admins to filter by specific users if needed.
        const result = await moderationService.getFlaggedContent({
            status,
            type,
            userId, // Filter by specific user if provided in query
            page,
            limit,
        });

        return res.status(StatusCodes.OK).json(result); // result includes { flaggedContent, pagination }

    } catch (error) {
        console.error("Admin error fetching flagged content:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve flagged content.' });
    }
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
 *           format: uuid
 *         description: Flagged content ID
 *     responses:
 *       200:
 *         description: Content approval successfully queued
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Flagged content not found
 *       500:
 *         description: Internal server error or queueing failure
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
router.put('/flagged/:id/approve', async (req, res) => {
    const { id } = req.params;
    // req.localUser contains the admin user performing the action, useful for logging maybe

    try {
        // Check if flagged content exists first (optional but good practice)
        const flaggedContent = await prisma.flaggedContent.findUnique({
            where: { id },
            select: { id: true } // Just need to know if it exists
        });

        if (!flaggedContent) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Flagged content not found' });
        }

        // Queue admin action (handle potential queue errors)
        await queueService.addAdminActionJob({
            action: 'APPROVED',
            flaggedContentId: id,
            adminUserId: req.localUser.id // Log which admin took the action
        });

        return res.status(StatusCodes.OK).json({ message: 'Content approval queued successfully' });

    } catch (error) {
        console.error(`Admin error approving flagged content ${id}:`, error);
         if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Flagged Content ID format.' });
        }
         if (error.code === 'P2025') {
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Flagged content not found (possibly deleted concurrently).' });
        }
        // Distinguish between DB error and queue error if possible
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to process content approval.' });
    }
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
 *           format: uuid
 *         description: Flagged content ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectFlaggedContentInput' # Define this schema
 *     responses:
 *       200:
 *         description: Content rejection successfully queued
 *       400:
 *         description: Bad request (invalid reason)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Flagged content not found
 *       500:
 *         description: Internal server error or queueing failure
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
// Uses validation for the request body
router.put('/flagged/:id/reject', validate(rejectFlaggedContentSchema), async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body; // Reason might be optional depending on schema

     try {
        // Check if flagged content exists first (optional but good practice)
        const flaggedContent = await prisma.flaggedContent.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!flaggedContent) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Flagged content not found' });
        }

        // Queue admin action (handle potential queue errors)
        await queueService.addAdminActionJob({
            action: 'REJECTED',
            flaggedContentId: id,
            reason: reason || 'Content rejected by moderator.', // Provide a default reason if optional
            adminUserId: req.localUser.id
        });

        return res.status(StatusCodes.OK).json({ message: 'Content rejection queued successfully' });

    } catch (error) {
        console.error(`Admin error rejecting flagged content ${id}:`, error);
         if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid Flagged Content ID format.' });
        }
         if (error.code === 'P2025') {
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'Flagged content not found (possibly deleted concurrently).' });
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to process content rejection.' });
    }
});

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users (admin only, paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       # ... (Add page and limit parameters) ...
 *     responses:
 *       200:
 *         description: A list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
// Uses validation for query parameters
router.get('/users', validate(paginationSchema, 'query'), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          // Select fields needed for the admin user list
          select: {
            id: true,
            clerkId: true,
            email: true,
            username: true,
            role: true,
            emailNotification: true,
            createdAt: true,
            updatedAt: true,
            _count: { // Include counts for context
              select: {
                posts: true,
                comments: true,
                reviews: true,
                flaggedContents: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count(),
      ]);

      return res.status(StatusCodes.OK).json({
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
        console.error("Admin error fetching users:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve users.' });
    }
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
 *           format: uuid
 *         description: User ID (local database ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRoleInput' # Define this schema
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Bad request (invalid role or user ID)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (e.g., trying to demote the last admin - add check if needed)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
// Uses validation for request body
router.put('/users/:id/role', validate(updateUserRoleSchema), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body; // Validation ensures role is 'USER' or 'ADMIN'

  // Optional: Prevent admin from changing their own role? Or prevent demoting last admin?
   if (id === req.localUser.id) {
       return res.status(StatusCodes.FORBIDDEN).json({ message: "Admins cannot change their own role via this endpoint." });
   }
   // Add check for last admin if necessary

  try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true } // Just check existence
      });

      if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
      }

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role },
        select: { // Return relevant fields
            id: true,
            email: true,
            username: true,
            role: true,
        }
      });

      return res.status(StatusCodes.OK).json({
        message: 'User role updated successfully',
        user: updatedUser,
      });

   } catch (error) {
       console.error(`Admin error updating role for user ${id}:`, error);
       if (error.code === 'P2023' || error.message.includes('Malformed UUID')) {
           return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Invalid User ID format.' });
        }
       if (error.code === 'P2025') { // Should be caught by findUnique above, but belt-and-suspenders
           return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' });
       }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update user role.' });
   }
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
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth, syncUserWithDb, authorizeAdmin from global middleware
router.get('/stats', async (req, res) => {

    try {
        // Use Prisma aggregation for counts
        const userCount = await prisma.user.count();
        const postCount = await prisma.post.count();
        const commentCount = await prisma.comment.count();
        const reviewCount = await prisma.review.count();

        // Use aggregate for multiple counts on FlaggedContent
        const flaggedCounts = await prisma.flaggedContent.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });

        // Process flaggedCounts into a more usable format
        let flaggedStats = { total: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
        flaggedCounts.forEach(group => {
            const count = group._count.status;
            flaggedStats[group.status] = count;
            flaggedStats.total += count;
        });


        // Get recent flagged content
        const recentFlagged = await prisma.flaggedContent.findMany({
            include: {
                user: { select: { id: true, username: true } },
                // Conditionally include comment/review based on type if possible, or include both nullable
                comment: { select: { id: true, content: true, postId: true } },
                review: { select: { id: true, content: true, rating: true, postId: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5, // Limit to recent 5
        });

        return res.status(StatusCodes.OK).json({
            stats: {
                users: userCount,
                posts: postCount,
                comments: commentCount,
                reviews: reviewCount,
                flagged: {
                    total: flaggedStats.total,
                    pending: flaggedStats.PENDING,
                    approved: flaggedStats.APPROVED,
                    rejected: flaggedStats.REJECTED,
                },
            },
            recentFlagged,
        });

    } catch (error) {
         console.error("Admin error fetching stats:", error);
         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve system statistics.' });
    }
});

/* Define Swagger Schemas (e.g., in utils/swagger.js)

components:
  schemas:
    RejectFlaggedContentInput:
      type: object
      properties:
        reason:
          type: string
          minLength: 1
          maxLength: 500
          description: Optional reason for rejecting the content.
    UpdateUserRoleInput:
      type: object
      required:
        - role
      properties:
        role:
          type: string
          enum: [USER, ADMIN]
          description: The new role for the user.

*/


module.exports = router;