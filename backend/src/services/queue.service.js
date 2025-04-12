const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const moderationService = require('./moderation.service');
const emailService = require('./email.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Queue for content moderation
const moderationQueue = new Queue('moderation', { connection });

// Queue for email notifications
const emailQueue = new Queue('email', { connection });

// Queue for admin actions
const adminActionQueue = new Queue('adminAction', { connection });

/**
 * Add a content moderation job to the queue
 * @param {Object} data - Job data
 * @returns {Promise<Object>} - Created job
 */
const addModerationJob = async (data) => {
  try {
    return await moderationQueue.add('moderate-content', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  } catch (error) {
    console.error('Error adding moderation job to queue:', error);
    throw new Error(`Failed to queue moderation job: ${error.message}`);
  }
};

/**
 * Add an email notification job to the queue
 * @param {Object} data - Job data
 * @returns {Promise<Object>} - Created job
 */
const addEmailJob = async (data) => {
  try {
    return await emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  } catch (error) {
    console.error('Error adding email job to queue:', error);
    throw new Error(`Failed to queue email job: ${error.message}`);
  }
};

/**
 * Add an admin action job to the queue
 * @param {Object} data - Job data
 * @returns {Promise<Object>} - Created job
 */
const addAdminActionJob = async (data) => {
  try {
    return await adminActionQueue.add('process-admin-action', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  } catch (error) {
    console.error('Error adding admin action job to queue:', error);
    throw new Error(`Failed to queue admin action job: ${error.message}`);
  }
};

// Worker for processing moderation jobs
const moderationWorker = new Worker('moderation', async (job) => {
  const { content, contentId, contentType, userId } = job.data;

  try {
    console.log(`Processing moderation job for ${contentType} ${contentId}`);
    const moderationResult = await moderationService.moderateText(content);

    if (moderationResult.isToxic) {
      // Create flagged content record
      const flaggedContent = await moderationService.createFlaggedContent({
        contentId,
        contentType,
        userId,
        reason: moderationResult.toxicityReason,
        ...(contentType === 'COMMENT' ? { commentId: contentId } : {}),
        ...(contentType === 'REVIEW' ? { reviewId: contentId } : {}),
      });

      // Get user details for email notification
      const user = await prisma.user.findUnique({ where: { id: userId } });

      // Queue email notification if user has email notifications enabled
      if (user && user.emailNotification) {
        await addEmailJob({
          type: 'content-flagged',
          user,
          contentType,
          reason: moderationResult.toxicityReason,
        });
      }

      return { flagged: true, flaggedContent };
    }

    return { flagged: false };
  } catch (error) {
    console.error(`Error processing moderation job for ${contentType} ${contentId}:`, error);
    throw error;
  }
}, { connection });

// Worker for processing email jobs
const emailWorker = new Worker('email', async (job) => {
  const { type, user, contentType, reason } = job.data;

  try {
    console.log(`Processing email job: ${type} for user ${user.id}`);

    switch (type) {
      case 'content-flagged':
        return await emailService.sendContentFlaggedNotification(user, contentType, reason);
      case 'content-approved':
        return await emailService.sendContentApprovedNotification(user, contentType);
      case 'content-rejected':
        return await emailService.sendContentRejectedNotification(user, contentType, reason);
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  } catch (error) {
    console.error(`Error processing email job:`, error);
    throw error;
  }
}, { connection });

// Worker for processing admin action jobs
const adminActionWorker = new Worker('adminAction', async (job) => {
  const { action, flaggedContentId, reason } = job.data;

  try {
    console.log(`Processing admin action job: ${action} for flagged content ${flaggedContentId}`);

    // Get flagged content with related entities
    const flaggedContent = await prisma.flaggedContent.findUnique({
      where: { id: flaggedContentId },
      include: {
        user: true,
        comment: true,
        review: true,
      },
    });

    if (!flaggedContent) {
      throw new Error(`Flagged content not found: ${flaggedContentId}`);
    }

    // Process based on action
    switch (action) {
      case 'APPROVED':
        // Update flagged content status
        await moderationService.updateFlaggedContentStatus(flaggedContentId, 'APPROVED');

        // Queue email notification
        if (flaggedContent.user && flaggedContent.user.emailNotification) {
          await addEmailJob({
            type: 'content-approved',
            user: flaggedContent.user,
            contentType: flaggedContent.type,
          });
        }
        break;

      case 'REJECTED':
        // Update flagged content status
        await moderationService.updateFlaggedContentStatus(flaggedContentId, 'REJECTED');

        // Queue email notification
        if (flaggedContent.user && flaggedContent.user.emailNotification) {
          await addEmailJob({
            type: 'content-rejected',
            user: flaggedContent.user,
            contentType: flaggedContent.type,
            reason: reason || flaggedContent.reason,
          });
        }
        break;

      default:
        throw new Error(`Unknown admin action: ${action}`);
    }

    return { success: true, action };
  } catch (error) {
    console.error(`Error processing admin action job:`, error);
    throw error;
  }
}, { connection });

// Handle worker errors
moderationWorker.on('error', (error) => {
  console.error('Moderation worker error:', error);
});

emailWorker.on('error', (error) => {
  console.error('Email worker error:', error);
});

adminActionWorker.on('error', (error) => {
  console.error('Admin action worker error:', error);
});

// Handle completed jobs
moderationWorker.on('completed', (job, result) => {
  console.log(`Moderation job ${job.id} completed. Flagged: ${result.flagged}`);
});

emailWorker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

adminActionWorker.on('completed', (job, result) => {
  console.log(`Admin action job ${job.id} completed. Action: ${result.action}`);
});

module.exports = {
  addModerationJob,
  addEmailJob,
  addAdminActionJob,
  moderationQueue,
  emailQueue,
  adminActionQueue,
};