# Security Implementation

Security is a critical aspect of the Content Moderation Microservice. This document outlines the key security measures implemented across the application stack.

## 1. Authentication

*   **Provider:** User authentication is handled externally by **Clerk**. Clerk manages user sign-up, sign-in, multi-factor authentication (if configured), password policies, and session management.
*   **Mechanism:** Clerk uses secure sessions and provides JWT (JSON Web Tokens) to the frontend upon successful authentication.
*   **Backend Verification:**
    *   The backend API uses the official Clerk Node.js SDK (`@clerk/clerk-sdk-node`).
    *   Middleware (`backend/src/middleware/auth.js`) protects specific API routes.
    *   `requireAuth`: Ensures a valid Clerk session token is present in the `Authorization: Bearer <token>` header for protected routes. It verifies the token signature and expiration against Clerk's public keys.
    *   `withAuth`: Allows requests to proceed even without a token but makes authentication information available if present.
    *   `syncUserWithDb`: Securely fetches user details from Clerk using the verified `userId` from the token and syncs/creates user records in the local database. This prevents users from claiming arbitrary local user IDs.

## 2. Authorization (Role-Based Access Control - RBAC)

*   **Roles:** A `Role` enum (`USER`, `ADMIN`) is defined in the Prisma schema and assigned to users in the local database (`User` model).
*   **Admin Protection:**
    *   Admin-specific API routes (e.g., `/api/admin/*`) are protected by the `authorizeAdmin` middleware (`backend/src/middleware/auth.js`).
    *   This middleware runs *after* `requireAuth` and `syncUserWithDb`.
    *   It checks the `role` property of the authenticated `req.localUser` object. If the role is not `ADMIN`, it returns a `403 Forbidden` response, preventing access.
*   **Ownership Checks:**
    *   API routes for modifying or deleting content (posts, comments, reviews) include logic to verify that the authenticated user (`req.localUser.id`) matches the `userId` associated with the content item being acted upon. This prevents users from modifying or deleting content they don't own (unless they are an ADMIN, which could be an additional check if needed).

## 3. Input Validation

*   **Library:** The `joi` library is used for schema-based validation of incoming API request data.
*   **Implementation:** Validation schemas are defined in `backend/src/middleware/validation.js` for various API inputs (request bodies, query parameters).
*   **Middleware:** A generic `validate` middleware function applies these Joi schemas to the relevant parts of the `req` object.
*   **Protection:** This prevents malformed data, unexpected fields, and basic injection attempts by ensuring data conforms to expected types, lengths, formats, and constraints before being processed by route handlers or database queries. Invalid requests are rejected early with a `400 Bad Request` response.

## 4. API Security Headers

*   **Library:** The `helmet` middleware is used in the Express application (`backend/src/index.js`).
*   **Protection:** Helmet applies various security-related HTTP headers by default (e.g., `X-Content-Type-Options`, `Strict-Transport-Security`, `X-Frame-Options`, `X-XSS-Protection`) to mitigate common web vulnerabilities like cross-site scripting (XSS) and clickjacking.

## 5. Rate Limiting

*   **Library:** `express-rate-limit` combined with `rate-limit-redis` is used.
*   **Implementation:** Middleware is applied in `backend/src/index.js`.
*   **Protection:**
    *   **General API Limiter (`apiLimiter`):** Applies a baseline limit to all API routes to prevent general abuse.
    *   **Authentication Limiter (`authLimiter`):** Applies stricter limits specifically to authentication-related endpoints to mitigate brute-force login attempts.
    *   **Content Creation Limiter (`contentCreationLimiter`):** Limits the frequency of `POST` requests to content creation endpoints (posts, comments, reviews) to prevent spamming.
    *   **Moderation Check Limiter (`moderationCheckLimiter`):** Limits calls to the AI preview endpoint.
    *   **Storage:** Uses Redis via `rate-limit-redis` to maintain rate limit counters across multiple backend instances (if scaled).

## 6. Secrets Management

*   **Method:** Sensitive configuration values (database URL, API keys for Clerk/GCP, email credentials, JWT secrets, Redis URL) are managed using environment variables.
*   **Local Development:** `.env` files are used locally (based on `.env.sample`). These `.env` files are listed in `.gitignore` and **must not** be committed to version control.
*   **Deployment (Render/Vercel):** Environment variables are configured securely through the hosting provider's dashboard or CLI tools.

## 7. Database Security

*   **ORM:** Using Prisma ORM significantly reduces the risk of SQL injection vulnerabilities compared to constructing raw SQL queries, as Prisma handles query generation and parameterization.
*   **Connection:** Database connection details are stored securely in environment variables. Ensure secure connection configurations (e.g., SSL) are used, typically handled by Supabase.

## 8. Cross-Origin Resource Sharing (CORS)

*   **Library:** The `cors` middleware is used in the Express application.
*   **Configuration:** Configured to allow requests specifically from the frontend origin (`process.env.FRONTEND_URL` or `http://localhost:3000` for development), preventing other websites from making direct requests to the API from a user's browser.

## 9. Dependency Management

*   **Practice:** While not explicitly enforced by a tool in the current setup, keeping dependencies (both frontend and backend) up-to-date using `pnpm update` or tools like `npm audit` / Dependabot is crucial to patch known vulnerabilities.

## 10. Error Monitoring

*   **Tool:** Sentry (`@sentry/node`, `@sentry/react`) is integrated.
*   **Benefit:** Captures unhandled exceptions and errors in both frontend and backend, providing visibility into issues occurring in production for faster debugging and resolution.