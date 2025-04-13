const { Queue } = require('bullmq');
const Redis = require('ioredis');
const moderationService = require('./moderation.service');
const emailService = require('./email.service');
const { PrismaClient } = require('@prisma/client'); // Import PrismaClient

const prisma = new PrismaClient(); // Instantiate PrismaClient

// Create Redis connection
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Prevent infinite retries on connection issues
  // enableReadyCheck: false, // Can sometimes help with certain Redis setups
});

connection.on('error', err => {
    console.error('Redis Connection Error in Queue Service:', err);
});

// --- Queues ---
const moderationQueue = new Queue('moderation', { connection });
const emailQueue = new Queue('email', { connection });
const adminActionQueue = new Queue('adminAction', { connection });

// --- Job Adding Functions ---
// These functions remain the same - they just add data to the queue.
const addModerationJob = async (data) => {
  try {
    const job = await moderationQueue.add('moderate-content', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    console.log(`Added moderation job ${job.id} for ${data.contentType} ${data.contentId}`);
    return job;
  } catch (error) {
    console.error('Error adding moderation job to queue:', error);
    // Decide if you want to throw or just log
    // throw new Error(`Failed to queue moderation job: ${error.message}`);
  }
};

const addEmailJob = async (data) => {
 try {
    const job = await emailQueue.add('send-email', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    console.log(`Added email job ${job.id} of type ${data.type} for user ${data.recipient?.userId}`);
    return job;
  } catch (error) {
    console.error('Error adding email job to queue:', error);
    // Don't throw, email is lower priority usually
  }
};

const addAdminActionJob = async (data) => {
 try {
    const job = await adminActionQueue.add('process-admin-action', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
     console.log(`Added admin action job ${job.id} for action ${data.action} on ${data.flaggedContentId}`);
    return job;
  } catch (error) {
    console.error('Error adding admin action job to queue:', error);
    // Decide if you want to throw or just log
  }
};


// --- Job Processing Functions ---

const processModerationJob = async (job) => {
  const { content, contentId, contentType, userId } = job.data;
  console.log(`Processing moderation job ${job.id} for ${contentType} ${contentId}`);
  try {
    const moderationResult = await moderationService.moderateText(content);

    // Check if toxic AND if analysis wasn't skipped (e.g., due to short text)
    if (moderationResult.isToxic && !moderationResult.skipped) {
      const flaggedContent = await moderationService.createFlaggedContent({
        contentId,
        contentType,
        userId,
        reason: moderationResult.toxicityReason || 'Content flagged by AI moderation.',
        ...(contentType === 'COMMENT' ? { commentId: contentId } : {}),
        ...(contentType === 'REVIEW' ? { reviewId: contentId } : {}),
      });
      console.log(`Flagged content created ${flaggedContent.id} for ${contentType} ${contentId}`);

      // Fetch minimal user details needed for the email template + userId
      const userForTemplate = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, username: true } // Fetch email/username for template
      });

      if (userForTemplate) {
          console.log(`Queueing 'content-flagged' email job for user ${userId}`);
          // Pass only necessary data, including userId for re-fetching preference later
          await addEmailJob({
              type: 'content-flagged',
              recipient: {
                  userId: userForTemplate.id,
                  email: userForTemplate.email,
                  username: userForTemplate.username
              },
              contentType,
              reason: moderationResult.toxicityReason || 'Content flagged by AI moderation.',
          });
      } else {
          console.warn(`User ${userId} not found when queueing email after flagging content ${contentId}.`);
      }
      return { flagged: true, flaggedContentId: flaggedContent.id };
    }

    // Log if skipped or not toxic
    if (moderationResult.skipped) {
        console.log(`Moderation job ${job.id} skipped analysis (Reason: ${moderationResult.toxicityReason}).`);
    } else {
        console.log(`Moderation job ${job.id} completed. Not flagged.`);
    }
    return { flagged: false, skipped: moderationResult.skipped };

  } catch (error) {
    console.error(`Error processing moderation job ${job.id} for ${contentType} ${contentId}:`, error);
    throw error; // Re-throw to let BullMQ handle retry/failure
  }
};

const processEmailJob = async (job) => {
  // Expect 'recipient' object with userId, email, username
  const { type, recipient, contentType, reason } = job.data;

  // Validate essential recipient data
  if (!recipient || !recipient.userId || !recipient.email) {
      console.error(`Email job ${job.id} (Type: ${type}) is missing recipient data (userId, email). Skipping.`);
      // Consider this a failure of the job data itself
      throw new Error(`Missing recipient data for job ${job.id}`);
  }

  const userId = recipient.userId;
  console.log(`Processing email job ${job.id}: ${type} for user ${userId}`);

  try {
    // *** Fetch the LATEST notification preference from DB ***
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailNotification: true } // Only select the needed field
    });

    // Handle case where user might have been deleted between job queuing and processing
    if (!currentUser) {
        console.warn(`User ${userId} not found when processing email job ${job.id}. Skipping email.`);
        return; // Job succeeded in a sense (user gone), so don't throw error
    }

    // *** Check the FRESHLY fetched preference ***
    if (!currentUser.emailNotification) {
        console.log(`Email notifications confirmed disabled for user ${userId} (checked before sending). Skipping email job ${job.id}.`);
        return; // Job succeeded, no email needed
    }

    console.log(`Email notifications ENABLED for user ${userId}. Proceeding to send ${type} email.`);

    // Construct the user object needed by the email service functions
    const userForEmailService = {
        id: userId,
        email: recipient.email, // From job data
        username: recipient.username, // From job data
        emailNotification: true // We've confirmed it's true
    };

    // Call the appropriate email sending function
    switch (type) {
      case 'content-flagged':
        await emailService.sendContentFlaggedNotification(userForEmailService, contentType, reason);
        break;
      case 'content-approved':
        await emailService.sendContentApprovedNotification(userForEmailService, contentType);
        break;
      case 'content-rejected':
        await emailService.sendContentRejectedNotification(userForEmailService, contentType, reason);
        break;
      default:
        console.error(`Unknown email type in job ${job.id}: ${type}`);
        throw new Error(`Unknown email type: ${type}`); // Fail the job for unknown types
    }
     console.log(`Email service call successful for job ${job.id}.`);

  } catch (error) {
    // Catch errors from DB fetch or email sending
    console.error(`Error processing email job ${job.id} for user ${userId}:`, error);
    // Log specific Nodemailer errors if identifiable
    if (error.code === 'EENVELOPE' || error.responseCode >= 500) { // Example SMTP error checks
        console.error(`Nodemailer SMTP error for ${recipient.email}: ${error.message}`);
    }
    throw error; // Re-throw so BullMQ can potentially retry
  }
};

const processAdminActionJob = async (job) => {
  const { action, flaggedContentId, reason, adminUserId } = job.data;
   console.log(`Processing admin action job ${job.id}: ${action} for flagged content ${flaggedContentId} by admin ${adminUserId}`);
  try {
    // Fetch flagged content AND the associated user's details needed for email
    const flaggedContent = await prisma.flaggedContent.findUnique({
      where: { id: flaggedContentId },
      include: {
        // Select necessary fields from the related user
        user: { select: { id: true, email: true, username: true } },
        // Optional: Include comment/review if needed for context (though not used in email logic below)
        // comment: true,
        // review: true,
      },
    });

    // Check if content and associated user exist
    if (!flaggedContent) {
      console.warn(`Flagged content ${flaggedContentId} not found for admin action job ${job.id}. Skipping.`);
      return; // Nothing to process
    }
     if (!flaggedContent.user) {
       console.warn(`User associated with flagged content ${flaggedContentId} not found for admin action job ${job.id}. Skipping notification.`);
       // Still update status below, but cannot notify
     }

    let notificationType = null;
    let statusToUpdate = null;

    // Determine status and notification type based on action
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
        console.error(`Unknown admin action in job ${job.id}: ${action}`);
        throw new Error(`Unknown admin action: ${action}`); // Fail the job
    }

     // Update flagged content status in the database
     await moderationService.updateFlaggedContentStatus(flaggedContentId, statusToUpdate);
     console.log(`Updated flagged content ${flaggedContentId} status to ${statusToUpdate}`);


     // Queue email notification job IF a notification type is set AND we found the user
     if (notificationType && flaggedContent.user) {
        console.log(`Queueing ${notificationType} email job for user ${flaggedContent.user.id}`);
        await addEmailJob({
          type: notificationType,
          // Pass recipient data needed for the email job
          recipient: {
              userId: flaggedContent.user.id,
              email: flaggedContent.user.email,
              username: flaggedContent.user.username
          },
          contentType: flaggedContent.type,
          // Pass the rejection reason only if the action was REJECTED
          reason: action === 'REJECTED' ? (reason || 'Content rejected by moderator.') : undefined,
        });
     } else if (notificationType && !flaggedContent.user) {
         console.log(`Skipping ${notificationType} email for job ${job.id} because user was not found.`);
     }


    return { success: true, action }; // Indicate successful processing
  } catch (error) {
    console.error(`Error processing admin action job ${job.id}:`, error);
    throw error; // Re-throw for retries
  }
};


// --- Exports ---
module.exports = {
  // Queues
  moderationQueue,
  emailQueue,
  adminActionQueue,
  // Job Adders
  addModerationJob,
  addEmailJob,
  addAdminActionJob,
  // Job Processors (used by worker.js)
  processModerationJob,
  processEmailJob,
  processAdminActionJob,
  // Redis Connection (for potential external monitoring/management)
  connection,
};