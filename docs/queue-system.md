# Queue System Architecture

## Introduction

To ensure scalability, responsiveness, and resilience, this application utilizes a queue-based system for handling asynchronous tasks like AI content moderation and email notifications. This decouples these potentially time-consuming or failure-prone operations from the main API request-response cycle.

We use **Redis** as the queue broker (hosted on Upstash) and **BullMQ** as the robust queue management library in the Node.js backend.

## Components

1.  **Redis (Upstash):** A fast in-memory data store used by BullMQ to persist job queues and related metadata. It also serves the `rate-limit-redis` middleware for API rate limiting.
2.  **BullMQ:** A Node.js library providing a reliable job queue system built on top of Redis. It handles job queuing, retries, scheduling, and worker management.
3.  **Backend API (Job Producer):** The Express API service acts as a producer, adding jobs to the relevant queues when specific events occur (e.g., new comment/review posted, admin action taken).
4.  **Backend Worker (Job Consumer):** A separate Node.js process (`backend/src/worker.js`) continuously listens to the queues via BullMQ and executes the corresponding job processing logic when a new job arrives.

## Queues Defined

The system utilizes the following queues:

1.  **`moderation` Queue:**
    *   **Purpose:** Handles the asynchronous task of analyzing user-generated content (comments, reviews) using the Google Cloud NLP service.
    *   **Jobs Added By:** Backend API (`/api/comments` and `/api/reviews` POST routes) after successfully saving the content to the database.
    *   **Job Data:** Contains `content`, `contentId` (ID of the comment/review), `contentType` (`COMMENT` or `REVIEW`), and `userId`.
    *   **Processed By:** `processModerationJob` function in the Backend Worker.

2.  **`email` Queue:**
    *   **Purpose:** Manages the sending of email notifications to users (e.g., content flagged, approved, rejected).
    *   **Jobs Added By:**
        *   Backend Worker (`processModerationJob`) when content is flagged.
        *   Backend Worker (`processAdminActionJob`) after an admin approves/rejects content.
    *   **Job Data:** Contains `type` (e.g., 'content-flagged'), `recipient` (object with `userId`, `email`, `username`), `contentType`, and optionally `reason`.
    *   **Processed By:** `processEmailJob` function in the Backend Worker.

3.  **`adminAction` Queue:**
    *   **Purpose:** Handles the processing of actions taken by administrators on flagged content (approve/reject).
    *   **Jobs Added By:** Backend API (`/api/admin/flagged/:id/approve` and `/reject` PUT routes).
    *   **Job Data:** Contains `action` (`APPROVED` or `REJECTED`), `flaggedContentId`, `adminUserId`, and optionally `reason` (for rejection).
    *   **Processed By:** `processAdminActionJob` function in the Backend Worker.

## Job Processing Logic

*   **`processModerationJob`:**
    1.  Receives job data.
    2.  Calls `moderationService.moderateText()` (which calls Google NLP).
    3.  If flagged:
        *   Calls `moderationService.createFlaggedContent()` to save to DB.
        *   Fetches minimal user details (email, username).
        *   Adds a job to the `email` queue using `addEmailJob`.
    4.  Returns flagging status.

*   **`processEmailJob`:**
    1.  Receives job data (including `recipient` object).
    2.  Fetches the *current* `emailNotification` preference for the `recipient.userId` from the DB.
    3.  If notifications are enabled:
        *   Calls the appropriate function in `emailService` (e.g., `sendContentFlaggedNotification`) with recipient details.
    4.  Handles potential email sending errors.

*   **`processAdminActionJob`:**
    1.  Receives job data.
    2.  Fetches the `FlaggedContent` record and associated user details (for email).
    3.  Updates the `FlaggedContent` status in the DB via `moderationService.updateFlaggedContentStatus()`.
    4.  Adds a job (`content-approved` or `content-rejected`) to the `email` queue using `addEmailJob`.

## Configuration & Error Handling

*   **Retries:** BullMQ is configured with default retry logic (3 attempts with exponential backoff) for failed jobs, increasing resilience.
*   **Logging:** Job processing start, success, failure, and specific steps (like queuing emails) are logged for observability.
*   **Connection:** Redis connection details are managed via the `REDIS_URL` environment variable.

## Benefits

*   **Improved API Response Time:** API requests (like posting comments) return quickly without waiting for AI analysis or email sending.
*   **Scalability:** Workers can be scaled independently of the API server to handle varying job loads.
*   **Resilience:** Job retries handle temporary failures (e.g., network issues to GCP or email provider). Decoupling prevents API failures if the worker or external services are temporarily down.
*   **Decoupling:** Separates concerns, making the API focused on CRUD and the worker focused on background processing.