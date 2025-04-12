const express = require('express');
const { StatusCodes } = require('http-status-codes');
const { authenticate } = require('../middleware/auth');
const moderationService = require('../services/moderation.service');

const router = express.Router();

/**
 * @swagger
 * /moderation/check:
 *   post:
 *     summary: Check content for moderation
 *     tags: [Moderation]
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
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Content moderation results
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/check', authenticate, async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide content',
    });
  }

  const moderationResult = await moderationService.moderateText(content);

  return res.status(StatusCodes.OK).json({ moderationResult });
});

/**
 * @swagger
 * /moderation/flagged:
 *   get:
 *     summary: Get flagged content for the authenticated user
 *     tags: [Moderation]
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
 */
router.get('/flagged', authenticate, async (req, res) => {
  const { status, type, page, limit } = req.query;
  
  const result = await moderationService.getFlaggedContent({
    userId: req.user.id,
    status,
    type,
    page,
    limit,
  });

  return res.status(StatusCodes.OK).json(result);
});

/**
 * @swagger
 * /moderation/preferences:
 *   put:
 *     summary: Update email notification preferences
 *     tags: [Moderation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailNotification
 *             properties:
 *               emailNotification:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', authenticate, async (req, res) => {
  const { emailNotification } = req.body;
  
  if (emailNotification === undefined) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Please provide emailNotification preference',
    });
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { emailNotification },
  });

  return res.status(StatusCodes.OK).json({
    message: 'Notification preferences updated successfully',
    emailNotification: updatedUser.emailNotification,
  });
});

module.exports = router;