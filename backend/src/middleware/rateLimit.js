const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * General API rate limiter
 * Limits requests to 100 per 15 minutes window per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later.' },
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not properly typed in @types/ioredis
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

/**
 * Authentication rate limiter
 * More strict limits for auth endpoints to prevent brute force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not properly typed in @types/ioredis
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

/**
 * Content creation rate limiter
 * Limits content creation to prevent spam
 */
const contentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 content creation requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'You have created too much content. Please try again later.' },
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not properly typed in @types/ioredis
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

/**
 * Moderation check rate limiter
 * Limits moderation API checks
 */
const moderationCheckLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 moderation check requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many moderation check requests, please try again later.' },
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not properly typed in @types/ioredis
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

module.exports = {
  apiLimiter,
  authLimiter,
  contentCreationLimiter,
  moderationCheckLimiter,
  redisClient,
};