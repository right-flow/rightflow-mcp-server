import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env';
import { checkDatabaseConnection, closeDatabaseConnection } from './config/database';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import submissionsRouter from './routes/v1/submissions';
import formsRouter from './routes/v1/forms';
import webhooksRouter from './routes/v1/webhooks';
import analyticsRouter from './routes/v1/analytics';
import activityRouter from './routes/v1/activity';
import usersRouter from './routes/v1/users';
import connectorsRouter from './routes/v1/integrations/connectors';
import mappingsRouter from './routes/v1/integrations/mappings';
import whatsappRouter from './routes/v1/whatsapp';
import whatsappWebhookRouter from './routes/v1/whatsapp-webhook';
import extractionRouter from './routes/v1/extraction';
import './workers/webhookWorker'; // Initialize webhook worker
import './workers/whatsappHealthWorker'; // Initialize WhatsApp health worker

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.NODE_ENV === 'development'
      ? [config.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173']
      : config.FRONTEND_URL,
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware (add to all requests)
app.use(requestId);

// Health check endpoint (for Railway)
app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();

  if (!dbHealthy) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/submissions', submissionsRouter);
app.use('/api/v1/forms', formsRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/activity', activityRouter);
app.use('/api/v1/integrations/connectors', connectorsRouter);
app.use('/api/v1/integrations/mappings', mappingsRouter);
app.use('/api/v1/whatsapp', whatsappRouter);
app.use('/api/v1/whatsapp', whatsappWebhookRouter);
app.use('/api/v1', extractionRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'נתיב לא נמצא',
      path: _req.path,
      timestamp: new Date().toISOString(),
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.PORT;
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${config.FRONTEND_URL}`);

  // Check database connection on startup
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    logger.error('❌ Failed to connect to database - exiting');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    await closeDatabaseConnection();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    logger.info('HTTP server closed');
    await closeDatabaseConnection();
    process.exit(0);
  });
});

export default app;
