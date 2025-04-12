require('dotenv').config();
require('express-async-errors');
require('events').EventEmitter.defaultMaxListeners = 20; //remove in prod

const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const specs = require('./utils/swagger');
const { PrismaClient } = require('@prisma/client');

// Routes
const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const commentRoutes = require('./routes/comment.routes');
const reviewRoutes = require('./routes/review.routes');
const moderationRoutes = require('./routes/moderation.routes');
const adminRoutes = require('./routes/admin.routes');

// Middleware
const errorHandlerMiddleware = require('./middleware/errorHandler');
const notFoundMiddleware = require('./middleware/notFound');

// Prisma
const prisma = new PrismaClient();

// Express app
const app = express();

// Sentry setup
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || 'development',
});

// Middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(compression());

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Error handlers
app.use(Sentry.Handlers.errorHandler());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

// Server + graceful shutdown
let server;
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

/**
 * Start server with fallback in case of port conflict
 */
function startServer(port) {
  server = app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} in use. Trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server startup error:', err);
      process.exit(1);
    }
  });
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  console.log('🔄 Gracefully shutting down...');
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');

    if (server) {
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  gracefulShutdown();
});

module.exports = { app, prisma };
startServer(DEFAULT_PORT);
