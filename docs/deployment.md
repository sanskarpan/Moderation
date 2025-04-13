# Deployment Guide: AI Content Moderation Service

This document outlines the steps and considerations for deploying the AI Content Moderation Microservice frontend and backend components.

## Deployment Targets

*   **Frontend:** [Vercel](https://vercel.com/) (React/Vite application)
*   **Backend API & Worker:** [Render](https://render.com/) (Node.js/Express application using Docker)
*   **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **Queue/Cache:** [Upstash](https://upstash.com/) (Redis)

## Prerequisites

Before deploying, ensure you have accounts for:
*   Vercel
*   Render
*   Supabase (or another PostgreSQL provider)
*   Upstash (or another Redis provider)
*   Clerk
*   Google Cloud Platform (with NLP API enabled and credentials)
*   GitHub (repository hosting)
*   Necessary tools installed locally (Git, Node.js, pnpm) for potential troubleshooting or CLI usage.

## Deployment Steps

### 1. Database (Supabase)

*   If not already done during development, create a new project on Supabase.
*   Navigate to **Project Settings > Database > Connection string**.
*   Copy the connection string (URI format). This will be your `DATABASE_URL` environment variable for the backend.
*   Ensure any necessary database migrations have been applied. Prisma migrations should ideally be run as part of the backend deployment build process or manually before deploying the first time.

### 2. Queue / Cache (Upstash Redis)

*   Create a new Redis database instance on Upstash.
*   Choose a region close to your Render backend service region for lower latency.
*   Once created, navigate to the database details and copy the **Upstash Redis REST URL (using `@upstash/redis`) or the standard Redis connection string (using `ioredis`)**. Ensure you copy the one compatible with `ioredis` (which BullMQ uses by default, e.g., `redis://default:<password>@<host>:<port>`).
*   This URL will be your `REDIS_URL` environment variable for the backend API and worker.

### 3. Backend (Render)

The backend consists of two services on Render: the API Web Service and the Background Worker. Both use the same codebase and Dockerfile but different start commands.

**a) Backend API (Web Service):**

1.  **Create Service:** On the Render dashboard, click "New +" -> "Web Service".
2.  **Connect Repository:** Connect your GitHub account and select the `moderation-microservice` repository.
3.  **Settings:**
    *   **Name:** e.g., `moderation-api`
    *   **Region:** Choose a region close to your users/database/Redis.
    *   **Branch:** Select your deployment branch (e.g., `main`).
    *   **Runtime:** Select **Docker**. Render will detect your `backend/Dockerfile`.
    *   **Root Directory:** Set this to `backend`.
    *   **Dockerfile Path:** Should be `./backend/Dockerfile` (relative to root). Render might auto-detect this if Root Directory is set.
    *   **Build Filter (Optional):** Set paths to `backend/**` so builds only trigger on backend changes.
4.  **Environment Variables:** Go to the "Environment" tab and add **Secret Files** and **Environment Variables** based on your `backend/.env.sample`:
    *   `DATABASE_URL`: Paste the Supabase connection string.
    *   `REDIS_URL`: Paste the Upstash Redis connection string.
    *   `CLERK_SECRET_KEY`: Your Clerk Secret Key.
    *   `GCP_CREDENTIALS_JSON`: **(Secret File)** Create a Secret File named `gcp-credentials.json` and paste the entire content of your downloaded GCP service account key file into it. In your regular Environment Variables, add `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/gcp-credentials.json`.
    *   `EMAIL_SERVICE`: e.g., `gmail`
    *   `EMAIL_USER`: Your sending email address.
    *   `EMAIL_PASSWORD`: Your email account password or (preferably) an App Password.
    *   `PORT`: `5001` (or the port exposed in your *final* backend Dockerfile).
    *   `NODE_ENV`: `production`
    *   `FRONTEND_URL`: The URL of your deployed Vercel frontend (e.g., `https://your-app.vercel.app`).
    *   *(Add any other secrets like SENTRY_DSN)*
5.  **Start Command:** Render should infer this from the Dockerfile's `CMD` (`pnpm run start`). Verify your `package.json`'s `start` script executes the production build (e.g., `node dist/index.js`).
6.  **Health Check:** Configure a health check path using `/health` (or your defined health check endpoint).
7.  **Deploy:** Create the service. Render will build the Docker image and deploy.

**b) Backend Worker (Background Worker):**

1.  **Create Service:** On Render, click "New +" -> "Background Worker".
2.  **Connect Repository:** Connect GitHub and select the *same* repository.
3.  **Settings:**
    *   **Name:** e.g., `moderation-worker`
    *   **Region:** **Use the same region as the API service.**
    *   **Branch:** Select the same deployment branch.
    *   **Runtime:** Select **Docker**.
    *   **Root Directory:** `backend`.
    *   **Dockerfile Path:** `./backend/Dockerfile`.
    *   **Build Filter (Optional):** `backend/**`.
4.  **Environment Variables:** Add the **same** environment variables and secret files as the API service (DATABASE_URL, REDIS_URL, CLERK_SECRET_KEY, GCP_CREDENTIALS_JSON/GOOGLE_APPLICATION_CREDENTIALS, EMAIL_*, NODE_ENV=production, SENTRY_DSN etc.). The worker needs access to these resources too.
5.  **Start Command:** **Override** the default Docker `CMD`. Set the start command to `pnpm run worker` (assuming your `package.json` has a `worker` script that runs `node src/worker.js`).
6.  **Deploy:** Create the service.

### 4. Frontend (Vercel)

1.  **Create Project:** On the Vercel dashboard, click "Add New..." -> "Project".
2.  **Import Repository:** Select your GitHub repository.
3.  **Configure Project:**
    *   **Project Name:** e.g., `content-moderation-ui`
    *   **Framework Preset:** Vercel should automatically detect "Vite" or "Create React App". Verify it's correct. If it detected CRA, ensure build commands match `react-scripts`. If Vite, ensure `dist` is the output dir.
    *   **Root Directory:** Set this to `frontend`.
4.  **Environment Variables:** Go to Project Settings -> Environment Variables. Add variables based on `frontend/.env.sample`:
    *   `REACT_APP_API_URL`: The URL of your **deployed Render backend API** service (e.g., `https://moderation-api.onrender.com/api`).
    *   `REACT_APP_CLERK_PUBLISHABLE_KEY`: Your Clerk Publishable Key.
    *   *(Add any other keys like SENTRY_DSN)*
5.  **Deploy:** Click "Deploy". Vercel will build and deploy the frontend.

### 5. Post-Deployment Checks

*   Verify both Render services (API & Worker) are running without errors in the logs. Pay close attention to Redis connection logs in the worker.
*   Verify the Vercel deployment is live.
*   Test the entire user flow: Signup -> Login -> Create Post -> Create Comment (benign) -> Create Comment (problematic) -> Check Admin flagged content -> Check user notifications (if email configured).

## CI/CD Integration (Optional)

The included GitHub Actions workflow (`.github/workflows/ci-cd.yml`) primarily focuses on linting, testing, and building Docker images (pushing to ghcr.io).

*   **Vercel/Render Integration:** Both Vercel and Render have excellent Git integration. Pushing to your specified deployment branch (`main`) will automatically trigger new builds and deployments on their respective platforms. You typically don't need the GitHub Action to *trigger* the deployment itself unless you have more complex requirements.
*   **Using Built Images:** You could modify the Render deployment settings to use a pre-built Docker image from a registry (like ghcr.io pushed by the GitHub Action) instead of building from source, potentially speeding up Render deployments.

## Environment Variables Summary

**Never commit `.env` files containing secrets to Git.**

*   **Backend (Render):** `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` (via Secret File), `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASSWORD`, `PORT`, `NODE_ENV`, `FRONTEND_URL`, `SENTRY_DSN` (optional).
*   **Frontend (Vercel):** `REACT_APP_API_URL`, `REACT_APP_CLERK_PUBLISHABLE_KEY`, `SENTRY_DSN` (optional).

## Troubleshooting Common Issues

*   **Backend 5xx Errors:** Check Render API logs. Often related to database/Redis connection issues or unhandled exceptions in code. Verify environment variables.
*   **Worker Not Processing Jobs:** Check Render Worker logs. Verify Redis connection (`REDIS_URL`). Ensure the start command is correctly running the worker script. Check for errors within the job processing logic.
*   **Frontend CORS Errors:** Ensure `FRONTEND_URL` on the backend matches the Vercel deployment URL exactly. Check the `cors` configuration in `backend/src/index.js`.
*   **Authentication Issues:** Double-check Clerk keys on both frontend and backend. Ensure the Backend API URL is correct in Vercel's environment variables.
*   **Emails Not Sending:** Verify `EMAIL_*` variables on the backend worker. Check the sending account's security settings (App Password likely required for Gmail). Check worker logs for Nodemailer errors.