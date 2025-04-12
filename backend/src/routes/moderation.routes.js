const express = require('express');
const { StatusCodes } = require('http-status-codes');
const moderationService = require('../services/moderation.service');
const { PrismaClient } = require('@prisma/client'); // Import PrismaClient
const { validate, moderationCheckSchema, updatePreferencesSchema, flaggedContentFilterSchema } = require('../middleware/validation'); // Import validation schemas

const router = express.Router();
const prisma = new PrismaClient(); // Instantiate PrismaClient

/**
 * @swagger
 * /moderation/check:
 *   post:
 *     summary: Check content for moderation using AI
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerationCheckInput' # Define this schema
 *     responses:
 *       200:
 *         description: Content moderation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 moderationResult:
 *                   $ref: '#/components/schemas/ModerationResult' # Define this schema
 *       400:
 *         description: Bad request (validation error or empty content)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error (moderation service failure)
 */
// Uses requireAuth + syncUserWithDb globally
// Uses specific validation for the request body
router.post('/check', validate(moderationCheckSchema), async (req, res) => {
  const { content } = req.body; // Validation ensures content exists and is a string

  // Although validation ensures content exists, double-check it's not just whitespace
  if (!content?.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Content cannot be empty or just whitespace.',
    });
  }

  try {
    // req.localUser is available if needed for context, but not strictly required for moderation check itself
    console.log(`Moderation check requested by user: ${req.localUser?.id || 'Unknown (middleware issue?)'}`);

    const moderationResult = await moderationService.moderateText(content);

    return res.status(StatusCodes.OK).json({ moderationResult });

  } catch (error) {
      console.error("Error during content moderation check:", error);
      // Provide a generic error to the client but log the specific one
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: 'Failed to perform content moderation check.'
      });
  }
});

/**
 * @swagger
 * /moderation/flagged:
 *   get:
 *     summary: Get flagged content for the authenticated user (paginated)
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       # ... (Add parameters based on flaggedContentFilterSchema: status, type, page, limit) ...
 *     responses:
 *       200:
 *         description: A list of the user's flagged content
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth + syncUserWithDb globally
// Uses validation for query parameters
router.get('/flagged', validate(flaggedContentFilterSchema, 'query'), async (req, res) => {
  // Extract validated query parameters (Joi defaults handle page/limit)
  const { status, type, page, limit } = req.query;

  if (!req.localUser || !req.localUser.id) {
       console.error('Error: GET /moderation/flagged route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user.' });
   }

  try {
      // Pass the validated filters and the specific userId to the service
      const result = await moderationService.getFlaggedContent({
        userId: req.localUser.id, // Filter specifically for the logged-in user
        status,
        type,
        page,
        limit,
      });

      return res.status(StatusCodes.OK).json(result); // Result includes { flaggedContent, pagination }

   } catch (error) {
       console.error(`Error fetching flagged content for user ${req.localUser.id}:`, error);
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to retrieve flagged content.' });
   }
});

/**
 * @swagger
 * /moderation/preferences:
 *   put:
 *     summary: Update user's email notification preferences
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              $ref: '#/components/schemas/UpdatePreferencesInput' # Define this schema
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                      type: string
 *                  emailNotification:
 *                      type: boolean
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Uses requireAuth + syncUserWithDb globally
// Uses specific validation for the request body
router.put('/preferences', validate(updatePreferencesSchema), async (req, res) => {
  const { emailNotification } = req.body; // Validation ensures this is a boolean

   if (!req.localUser || !req.localUser.id) {
       console.error('Error: PUT /moderation/preferences route reached without req.localUser.id populated.');
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Could not identify user.' });
   }

  try {
      const updatedUser = await prisma.user.update({
        where: { id: req.localUser.id },
        data: { emailNotification },
        select: { emailNotification: true } // Only select the updated field
      });

      return res.status(StatusCodes.OK).json({
        message: 'Notification preferences updated successfully',
        emailNotification: updatedUser.emailNotification,
      });

   } catch (error) {
       console.error(`Error updating preferences for user ${req.localUser.id}:`, error);
        // Handle case where user might not exist (P2025 - should not happen if middleware works)
        if (error.code === 'P2025') {
             return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found.' });
        }
       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to update notification preferences.' });
   }
});


/* Define Swagger Schemas (e.g., in utils/swagger.js)

components:
  schemas:
    ModerationCheckInput:
      type: object
      required:
        - content
      properties:
        content:
          type: string
          minLength: 1
          maxLength: 10000
          description: The text content to check for moderation.
    ModerationResult:
      type: object
      properties:
        isToxic:
          type: boolean
        toxicityReason:
          type: string
        sentiment:
           # ... define sentiment object structure
        entities:
           # ... define entities array structure
        categories:
           # ... define categories array structure
    UpdatePreferencesInput:
      type: object
      required:
        - emailNotification
      properties:
        emailNotification:
          type: boolean
          description: Enable or disable email notifications for moderation events.

*/

module.exports = router;