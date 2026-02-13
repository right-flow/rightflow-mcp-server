/**
 * Backend API Routes - Exported for integration with main server
 * This file exports all /api/v1 routes as a single Express Router
 */

import express from 'express';
import { requestId } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
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

// Initialize workers (side effects)
import './workers/webhookWorker';
import './workers/whatsappHealthWorker';

// Create main router for /api/v1
const apiV1Router = express.Router();

// Add request ID middleware
apiV1Router.use(requestId);

// Mount all routes
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/submissions', submissionsRouter);
apiV1Router.use('/forms', formsRouter);
apiV1Router.use('/webhooks', webhooksRouter);
apiV1Router.use('/analytics', analyticsRouter);
apiV1Router.use('/activity', activityRouter);
apiV1Router.use('/integrations/connectors', connectorsRouter);
apiV1Router.use('/integrations/mappings', mappingsRouter);
apiV1Router.use('/whatsapp', whatsappRouter);
apiV1Router.use('/whatsapp', whatsappWebhookRouter);
apiV1Router.use('/', extractionRouter);

// Export router and error handler separately
export { apiV1Router, errorHandler };
export default apiV1Router;