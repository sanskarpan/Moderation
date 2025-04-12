const { Queue } = require('bullmq'); // Keep Queue import
const Redis = require('ioredis');
const moderationService = require('./moderation.service');
const emailService = require('./email.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  // enableReadyCheck: false,
});

connection.on('error', err => {
    console.error('Redis Connection Error:', err);
});

// --- Queues ---
const moderationQueue = new Queue('moderation', { connection });
const emailQueue = new Queue('email', { connection });
const adminActionQueue = new Queue('adminAction', { connection });

// --- Job Adding Functions ---
const addModerationJob = async (data) => {
  try {
    return await moderationQueue.add('moderate-content', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  } catch (error) {
    console.error('Error adding moderation job to queue:', error);
    // throw new Error(`Failed to queue moderation job: ${error.message}`);
  }
};

const addEmailJob = async (data) => {
 try {
    return await emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  } catch (error) {
    console.error('Error adding email job to queue:', error);
     // Don't throw
    // throw new Error(`Failed to queue email job: ${error.message}`);
  }
};

const addAdminActionJob = async (data) => {
 try {
    return await adminActionQueue.add('process-admin-action', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  } catch (error) {
    console.error('Error adding admin action job to queue:', error);
    // Don't throw
    // throw new Error(`Failed to queue admin action job: ${error.message}`);
  }
};


const processModerationJob = async (job) => {
  const { content, contentId, contentType, userId } = job.data;
  console.log(`Processing moderation job ${job.id} for ${contentType} ${contentId}`);
  try {
    const moderationResult = await moderationService.moderateText(content);

    if (moderationResult.isToxic) {
      const flaggedContent = await moderationService.createFlaggedContent({
        contentId,
        contentType,
        userId,
        reason: moderationResult.toxicityReason || 'Content flagged by AI moderation.', // Ensure reason exists
        ...(contentType === 'COMMENT' ? { commentId: contentId } : {}),
        ...(contentType === 'REVIEW' ? { reviewId: contentId } : {}),
      });
      console.log(`Flagged content created ${flaggedContent.id} for ${contentType} ${contentId}`);

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, username: true, emailNotification: true } });

      if (user && user.emailNotification) {
         console.log(`Queueing flagged notification email for user ${userId}`);
         await addEmailJob({ // Use await here
           type: 'content-flagged',
           user: { email: user.email, username: user.username, id: user.id }, // Pass only necessary fields
           contentType,
           reason: moderationResult.toxicityReason || 'Content flagged by AI moderation.',
         });
      } else {
           console.log(`Email notifications disabled or user not found for user ${userId}`);
      }
      return { flagged: true, flaggedContentId: flaggedContent.id }; // Return ID
    }
    console.log(`Moderation job ${job.id} completed. Not flagged.`);
    return { flagged: false };
  } catch (error) {
    console.error(`Error processing moderation job ${job.id} for ${contentType} ${contentId}:`, error);
    throw error; // Re-throw to let BullMQ handle retry/failure
  }
};

const processEmailJob = async (job) => {
  const { type, user, contentType, reason } = job.data;
  console.log(`Processing email job ${job.id}: ${type} for user ${user?.id || user?.email}`);
  try {
     if (!user || !user.email) {
       throw new Error(`Missing user email for job ${job.id}, type ${type}`);
     }
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
    console.error(`Error processing email job ${job.id}:`, error);
    throw error;
  }
};

const processAdminActionJob = async (job) => {
  const { action, flaggedContentId, reason, adminUserId } = job.data;
   console.log(`Processing admin action job ${job.id}: ${action} for flagged content ${flaggedContentId} by admin ${adminUserId}`);
  try {
    const flaggedContent = await prisma.flaggedContent.findUnique({
      where: { id: flaggedContentId },
      include: {
        user: { select: { id: true, email: true, username: true, emailNotification: true } }, // Fetch needed fields
        comment: true, // Include relations if needed downstream
        review: true,
      },
    });

    if (!flaggedContent) {
      throw new Error(`Flagged content not found: ${flaggedContentId}`);
    }

    let notificationType = null;
    let statusToUpdate = null;

    switch (action) {
      case 'APPROVED':
        statusToUpdate = 'APPROVED';
        notificationType = 'content-approved';
        break;
      case 'REJECTED':
         statusToUpdate = 'REJECTED';
         notificationType = 'content-rejected';
        break;
      default:
        throw new Error(`Unknown admin action: ${action}`);
    }

     // Update flagged content status
     await moderationService.updateFlaggedContentStatus(flaggedContentId, statusToUpdate);
     console.log(`Updated flagged content ${flaggedContentId} status to ${statusToUpdate}`);


     // Queue email notification if applicable
     if (notificationType && flaggedContent.user && flaggedContent.user.emailNotification) {
        console.log(`Queueing ${notificationType} email for user ${flaggedContent.user.id}`);
        await addEmailJob({ // use await
          type: notificationType,
          user: { email: flaggedContent.user.email, username: flaggedContent.user.username, id: flaggedContent.user.id },
          contentType: flaggedContent.type,
          reason: reason || flaggedContent.reason, // Pass reason for rejection
        });
     } else if (notificationType && flaggedContent.user) {
          console.log(`Email notifications disabled for user ${flaggedContent.user.id}, skipping ${notificationType} email.`);
     }


    return { success: true, action };
  } catch (error) {
    console.error(`Error processing admin action job ${job.id}:`, error);
    throw error;
  }
};


module.exports = {
  moderationQueue,
  emailQueue,
  adminActionQueue,
  addModerationJob,
  addEmailJob,
  addAdminActionJob,
   processModerationJob,
   processEmailJob,
   processAdminActionJob,
   connection,
};