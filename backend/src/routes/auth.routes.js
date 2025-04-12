const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { PrismaClient } = require('@prisma/client'); 

const router = express.Router();
const prisma = new PrismaClient(); 

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user information from local database
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information (local DB representation with counts)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserWithCounts' # Define UserWithCounts schema
 *       401:
 *         description: Unauthorized (handled by requireAuth middleware)
 *       404:
 *         description: User not found in local DB (should be created by syncUserWithDb)
 *       500:
 *         description: Internal server error
 */
router.get('/me', async (req, res) => { // Made async to fetch counts
  // req.localUser should be populated by the syncUserWithDb middleware
  if (!req.localUser) {
    // This indicates an issue with the middleware setup or DB sync
    console.error('Error: /auth/me reached without req.localUser populated.');
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not retrieve user data.' });
  }

  try {
    // Fetch counts separately as they might not be included in the basic localUser from middleware
    const userWithCounts = await prisma.user.findUnique({
      where: { id: req.localUser.id },
      select: {
        id: true,
        clerkId: true, // Include clerkId if needed frontend-side
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

    if (!userWithCounts) {
       // Should ideally not happen if req.localUser exists
       console.error(`Error: User found in req.localUser but not in DB during /me count fetch (ID: ${req.localUser.id})`);
       return res.status(StatusCodes.NOT_FOUND).json({ message: 'User details not found.' });
    }


    // Return the combined user data with counts
    return res.status(StatusCodes.OK).json({
      user: userWithCounts
    });

  } catch (error) {
      console.error(`Error fetching user counts for /me (User ID: ${req.localUser.id}):`, error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve full user details.' });
  }
});

// Define UserWithCounts schema in your Swagger setup (e.g., in utils/swagger.js)
/* Example Swagger Schema Definition:
components:
  schemas:
    UserWithCounts:
      type: object
      properties:
        id:
          type: string
          format: uuid
        clerkId:
           type: string
        email:
          type: string
          format: email
        username:
          type: string
        role:
          type: string
          enum: [USER, ADMIN]
        emailNotification:
          type: boolean
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        _count:
          type: object
          properties:
            posts:
              type: integer
            comments:
              type: integer
            reviews:
              type: integer
            flaggedContents:
              type: integer
*/


module.exports = router;