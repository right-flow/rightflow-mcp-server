import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  (req as any).id = id;
  res.setHeader('X-Request-ID', id);
  next();
}
