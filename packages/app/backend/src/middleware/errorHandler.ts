import { Request, Response, NextFunction } from 'express';
import { APIError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Attach request ID to error (for log correlation)
  const requestId = (req as any).id || `req_${Date.now()}`;

  if (err instanceof APIError) {
    // Known application error
    logger.warn('API error', {
      requestId,
      error: err.code,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method,
      user: (req as any).user?.id,
    });

    err.requestId = requestId;
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Unknown error (500)
  logger.error('Unhandled error', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: (req as any).user?.id,
  });

  // Don't leak internal error details to client
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'שגיאת שרת, נסה שוב מאוחר יותר',
      request_id: requestId,
      timestamp: new Date().toISOString(),
      docs_url: 'https://docs.rightflow.app/errors/INTERNAL_SERVER_ERROR',
    },
  });
}
