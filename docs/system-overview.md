# System Overview

## Introduction

This document provides a high-level overview of the AI-Powered Content Moderation Microservice architecture. The primary goal is to create a scalable and maintainable system for automatically detecting and managing potentially inappropriate user-generated content (comments and reviews) using AI, while providing a seamless experience for users and administrators.

## Core Components

The system is composed of several key components interacting with each other:

1.  **Frontend Application (`frontend/`)**:
    *   Technology: React, Vite, TailwindCSS, Shadcn UI, React Query, Axios.
    *   Responsibilities: Provides the user interface for browsing posts, creating/viewing comments and reviews, user authentication (via Clerk components), managing user profiles/settings, and displaying notification status. Hosted on Vercel.
    *   Interaction: Communicates with the Backend API via RESTful calls and interacts directly with Clerk for authentication flows.

2.  **Backend API (`backend/`)**:
    *   Technology: Node.js, Express.js, Prisma, PostgreSQL (via Supabase).
    *   Responsibilities: Handles incoming API requests from the frontend, manages user authentication (token verification via Clerk middleware), performs CRUD operations on the database (Users, Posts, Comments, Reviews), adds jobs to the processing queue (Redis/BullMQ), serves API documentation (Swagger). Hosted on Render.

3.  **Backend Worker (`backend/src/worker.js`)**:
    *   Technology: Node.js, BullMQ, ioredis.
    *   Responsibilities: Runs as a separate process, listening for jobs on the Redis queues. Processes tasks asynchronously, such as calling the external AI moderation service (Google NLP) and sending email notifications (via Nodemailer). Interacts with the Database and Queue System. Likely hosted on Render alongside the API.

4.  **Database (`prisma/schema.prisma`)**:
    *   Technology: PostgreSQL (hosted on Supabase).
    *   Responsibilities: Persists all application data, including users, posts, comments, reviews, and flagged content records. Managed via Prisma ORM.

5.  **Queue System (`backend/src/services/queue.service.js`)**:
    *   Technology: Redis (hosted on Upstash), BullMQ.
    *   Responsibilities: Decouples time-consuming or potentially fallible tasks (AI analysis, email sending) from the main API request flow. Stores jobs added by the API and processed by the Worker. Also used for Rate Limiting state.

6.  **External Services**:
    *   **Clerk:** Handles user authentication (signup, signin, session management, JWTs).
    *   **Google Cloud NLP:** Provides the AI capabilities for analyzing text content sentiment, entities, and categories to determine potential toxicity.
    *   **Email Service (e.g., Gmail via SMTP):** Used by Nodemailer (triggered by the worker) to send notifications to users.
    *   **Sentry:** Used for error tracking and monitoring in both frontend and backend.

## Key Workflows

### 1. User Authentication
   - User interacts with Clerk components on the Frontend.
   - Clerk handles the auth flow (signup/login).
   - Frontend receives a session token from Clerk.
   - Frontend sends token with authenticated API requests to Backend API.
   - Backend API middleware verifies the token with Clerk.
   - `syncUserWithDb` middleware ensures a corresponding user exists in the local PostgreSQL DB.

### 2. Content Creation & Moderation
   - User submits a comment/review via the Frontend.
   *   Frontend sends a `POST` request with content and token to Backend API.
   *   Backend API saves the content (Comment/Review) to the PostgreSQL DB (via Prisma).
   *   Backend API adds a `moderation` job to the Redis Queue (via BullMQ) containing content details and user ID.
   *   Backend API responds successful creation (201) to Frontend immediately.
   *   Backend Worker picks up the `moderation` job from the queue.
   *   Worker calls the Google Cloud NLP API to analyze the content.
   *   If NLP flags the content:
        *   Worker creates a `FlaggedContent` record in the DB.
        *   Worker adds an `email` job to the queue (if user notifications are enabled).
   *   Email Worker (can be the same worker process) picks up the `email` job.
   *   Email Worker checks the user's *current* notification preference in the DB.
   *   If enabled, Email Worker sends a notification via Nodemailer/Email Provider.

### 3. Admin Content Review
   *   Admin logs in (verified by Clerk + local DB role check).
   *   Admin accesses the `/admin/flagged-content` route on the Frontend.
   *   Frontend fetches pending `FlaggedContent` records from the Backend API.
   *   Admin approves/rejects content via Frontend UI buttons.
   *   Frontend sends `PUT` request to Backend API (`/admin/flagged/:id/approve` or `/reject`).
   *   Backend API adds an `adminAction` job to the queue.
   *   Backend Worker picks up the `adminAction` job.
   *   Worker updates the `FlaggedContent` status in the DB.
   *   Worker adds an `email` job (approved/rejected) to the queue (if user notifications enabled).
   *   Email Worker processes the job and sends the notification.

## Technology Stack Summary

*   **Frontend:** React, React Router, React Query, Axios, TailwindCSS, Shadcn UI, Clerk React SDK
*   **Backend:** Node.js, Express.js, Prisma, BullMQ, ioredis, Nodemailer, Joi, Clerk Node SDK, Swagger
*   **Database:** PostgreSQL (Supabase)
*   **Queue:** Redis (Upstash)
*   **AI:** Google Cloud Natural Language API
*   **Auth:** Clerk
*   **DevOps:** Docker, GitHub Actions, Sentry, Vercel (FE Hosting), Render (BE Hosting)