import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../../middleware/auth';
import { syncUser } from '../../middleware/syncUser';
import { validateRequest } from '../../utils/validation';
import * as channelService from '../../services/whatsapp/channelService';
import * as sendService from '../../services/whatsapp/sendService';

const router = Router();

// All routes require authentication + user sync
router.use(authenticateJWT);
router.use(syncUser);

// ── Validation Schemas ────────────────────────────────────────────

const createChannelSchema = z.object({
  displayName: z.string().min(1).max(255),
});

const sendLinkSchema = z.object({
  channelId: z.string().uuid(),
  formId: z.string().uuid(),
  recipientPhone: z.string().min(9).max(20),
  formUrl: z.string().url(),
  caption: z.string().max(1000).optional(),
});

const sendPdfSchema = z.object({
  channelId: z.string().uuid(),
  formId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
  recipientPhone: z.string().min(9).max(20),
  pdfBase64: z.string().min(1),
  filename: z.string().min(1).max(255),
  caption: z.string().max(1000).optional(),
});

const messageLogQuerySchema = z.object({
  channelId: z.string().uuid().optional(),
  formId: z.string().uuid().optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Channel CRUD ──────────────────────────────────────────────────

router.get(
  '/channels',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const channels = await channelService.listForOrg(organizationId);
      res.json({ data: channels });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/channels',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const { displayName } = validateRequest(createChannelSchema, req.body);
      const channel = await channelService.create({
        organizationId,
        displayName,
      });
      res.status(201).json({ data: channel });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/channels/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const channel = await channelService.getByIdForOrg(
        req.params.id,
        organizationId,
      );
      res.json({ data: channel });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/channels/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      await channelService.disconnect(req.params.id, organizationId);
      res.json({ message: 'הערוץ נותק בהצלחה' });
    } catch (error) {
      next(error);
    }
  },
);

// ── QR & Status ───────────────────────────────────────────────────

router.post(
  '/channels/:id/qr',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const qr = await channelService.getQrCode(
        req.params.id,
        organizationId,
      );
      res.json({ data: qr });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/channels/:id/refresh',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const channel = await channelService.refreshStatus(
        req.params.id,
        organizationId,
      );
      res.json({ data: channel });
    } catch (error) {
      next(error);
    }
  },
);

// ── Send ──────────────────────────────────────────────────────────

router.post(
  '/send-link',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const data = validateRequest(sendLinkSchema, req.body);
      const result = await sendService.sendFormLink({
        organizationId,
        ...data,
      } as any);
      res.json({ data: result, message: 'הקישור נשלח בהצלחה' });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/send-pdf',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const data = validateRequest(sendPdfSchema, req.body);
      const result = await sendService.sendPdf({
        organizationId,
        ...data,
      } as any);
      res.json({ data: result, message: 'הטופס נשלח בהצלחה' });
    } catch (error) {
      next(error);
    }
  },
);

// ── Message Log ───────────────────────────────────────────────────

router.get(
  '/messages',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId } = req.user!;
      const filters = validateRequest(messageLogQuerySchema, req.query);
      const messages = await sendService.getMessageLog(
        organizationId,
        filters,
      );
      res.json({ data: messages });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
