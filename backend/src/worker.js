require('dotenv').config();
const { Worker } = require('bullmq');
const {
    connection, 
    processModerationJob,
    processEmailJob,
    processAdminActionJob,
 } = require('./services/queue.service'); 

console.log('🚀 Starting Moderation Workers...');

const moderationWorker = new Worker('moderation', processModerationJob, {
    connection,
    concurrency: 5, 
    limiter: { 
        max: 10,
        duration: 1000,
    },
});

const emailWorker = new Worker('email', processEmailJob, {
    connection,
    concurrency: 10, // Emails can often be sent faster
});

const adminActionWorker = new Worker('adminAction', processAdminActionJob, {
    connection,
    concurrency: 5,
});

// --- Event Listeners (Now attached to the correctly defined workers) ---
moderationWorker.on('active', job => console.log(`[Moderation] Processing job ${job.id}`));
emailWorker.on('active', job => console.log(`[Email] Processing job ${job.id}`));
adminActionWorker.on('active', job => console.log(`[AdminAction] Processing job ${job.id}`));

moderationWorker.on('completed', (job, result) => console.log(`[Moderation] Job ${job.id} completed. Flagged: ${result?.flagged}`));
emailWorker.on('completed', job => console.log(`[Email] Job ${job.id} completed.`));
adminActionWorker.on('completed', (job, result) => console.log(`[AdminAction] Job ${job.id} completed. Action: ${result?.action}`));


moderationWorker.on('failed', (job, err) => console.error(`[Moderation] Job ${job?.id} failed:`, err.message)); // Log only message for brevity
emailWorker.on('failed', (job, err) => console.error(`[Email] Job ${job?.id} failed:`, err.message));
adminActionWorker.on('failed', (job, err) => console.error(`[AdminAction] Job ${job?.id} failed:`, err.message));

console.log('Workers started and listening for jobs...');

// --- Graceful Shutdown ---
const shutdown = async () => {
    console.log('Shutting down workers...');
    await Promise.all([
        moderationWorker.close(),
        emailWorker.close(),
        adminActionWorker.close(),
    ]);
    console.log('Workers closed.');
    // Close redis connection used by workers
    if (connection && typeof connection.quit === 'function') {
        await connection.quit();
        console.log('Worker Redis connection closed.');
    }
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
