require('dotenv').config();
require('express-async-errors');
require('events').EventEmitter.defaultMaxListeners = 20; 
const express = require('express');
const Sentry = require('@sentry/node');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const specs = require('./utils/swagger');
const { PrismaClient } = require('@prisma/client'); 
const { requireAuth, withAuth, syncUserWithDb, authorizeAdmin } = require('./middleware/auth');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const reviewRoutes = require('./routes/review.routes');
const moderationRoutes = require('./routes/moderation.routes');
const adminRoutes = require('./routes/admin.routes');

// Import Other Middleware
const errorHandlerMiddleware = require('./middleware/errorHandler');
const notFoundMiddleware = require('./middleware/notFound');
const {
  apiLimiter,
  authLimiter,
  contentCreationLimiter,
  moderationCheckLimiter
} = require('./middleware/rateLimit');

const prisma = new PrismaClient();

const app = express();

// Sentry setup
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || 'development',
});

// --- Core Middleware ---
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());


app.use('/api/auth', authLimiter); // Specific for /api/auth/**
app.post('/api/posts', contentCreationLimiter); // Only for POST /api/posts
app.post('/api/comments', contentCreationLimiter); // Only for POST /api/comments
app.post('/api/reviews', contentCreationLimiter); // Only for POST /api/reviews
app.post('/api/moderation/check', moderationCheckLimiter); // Only for POST /api/moderation/check
app.use('/api', apiLimiter); // General API limiter for all other /api routes


app.use('/api/posts', withAuth, syncUserWithDb);
app.use('/api/comments', withAuth, syncUserWithDb);
app.use('/api/reviews', withAuth, syncUserWithDb);

// Protected Routes + Sync User
app.use('/api/auth/me', requireAuth, syncUserWithDb);
app.use('/api/moderation', requireAuth, syncUserWithDb);
app.use('/api/admin', requireAuth, syncUserWithDb, authorizeAdmin);

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);


// --- Swagger Docs & Health Check ---
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));


// --- Error Handlers ---
app.use(Sentry.Handlers.errorHandler());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);


// --- Server Start & Graceful Shutdown ---
let server;
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

function startServer(port) {
  server = app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is in use. Trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server startup error:', err);
      Sentry.captureException(err); 
      process.exit(1);
    }
  });
}

async function gracefulShutdown(signal) {
  console.log(`🔄 Received ${signal}. Gracefully shutting down...`);
  try {
    // Stop accepting new connections
    if (server) {
        server.close(async () => {
            console.log('✅ Server closed.');
            await prisma.$disconnect();
            console.log('✅ Prisma disconnected');
            // Close Redis connection if rate limiter client is exposed
             if (require('./middleware/rateLimit').redisClient?.quit) {
                await require('./middleware/rateLimit').redisClient.quit();
                 console.log('✅ Redis client disconnected.');
             }
             // Close Queue connections if queues are exposed
             const queueService = require('./services/queue.service');
             await Promise.all([
                 queueService.moderationQueue?.close(),
                 queueService.emailQueue?.close(),
                 queueService.adminActionQueue?.close()
             ]);
              console.log('✅ BullMQ queues closed.');
            process.exit(0);
      });
    } else {
         await prisma.$disconnect();
         console.log('✅ Prisma disconnected (no server running).');
         process.exit(0);
    }

    // Force shutdown after a timeout if server doesn't close
    setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000); // 10 seconds timeout

  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    Sentry.captureException(err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error('Reason:', reason);
  Sentry.captureException(reason instanceof Error ? reason : new Error(`Unhandled Rejection: ${reason}`));
});

process.on('uncaughtException', (err, origin) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error('Error:', err);
    console.error('Origin:', origin);
    Sentry.captureException(err);
    process.exit(1); 
});

module.exports = { app, prisma }; 
startServer(DEFAULT_PORT);