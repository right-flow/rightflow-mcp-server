import { query } from '../../config/database';
import { WahaClient } from './wahaClient';
import { config } from '../../config/env';
import { getByIdForOrg } from './channelService';
import { formatPhoneNumber } from './phoneUtils';
import { ValidationError } from '../../utils/errors';
import logger from '../../utils/logger';

// ── Types ─────────────────────────────────────────────────────────

interface SendFormLinkInput {
  organizationId: string;
  channelId: string;
  formId: string;
  recipientPhone: string;
  formUrl: string;
  caption?: string;
}

interface SendPdfInput {
  organizationId: string;
  channelId: string;
  formId: string;
  submissionId?: string;
  recipientPhone: string;
  pdfBase64: string;
  filename: string;
  caption?: string;
}

interface MessageLogEntry {
  id: string;
}

interface SendMessageInput {
  channelId: string;
  recipientPhone: string;
  message: string;
  mediaUrl?: string;
  organizationId?: string;
}

// ── Client Instance ───────────────────────────────────────────────

const wahaClient = new WahaClient(
  config.WAHA_API_URL,
  config.WAHA_API_KEY,
);

// ── Generic Send Message ──────────────────────────────────────────

/**
 * Send a generic WhatsApp message (text or with media)
 * Used by workflow ActionExecutor
 */
export async function sendMessage(
  input: SendMessageInput,
): Promise<MessageLogEntry> {
  const { channelId, recipientPhone, message, mediaUrl, organizationId } = input;

  // Get channel - for workflow usage, we may not have organizationId
  // In that case, we'll try to get the channel directly
  let channel;
  if (organizationId) {
    channel = await getByIdForOrg(channelId, organizationId);
  } else {
    // Direct query without org check (for internal workflow usage)
    const rows = await query(
      'SELECT * FROM whatsapp_channels WHERE id = $1',
      [channelId],
    );
    channel = rows[0];
  }

  if (!channel) {
    throw new ValidationError('WhatsApp channel not found');
  }

  if (channel.status !== 'WORKING') {
    throw new ValidationError('WhatsApp channel is not active');
  }

  const chatId = formatPhoneNumber(recipientPhone);

  try {
    let result;
    if (mediaUrl) {
      // Send message with media
      result = await wahaClient.sendFile(
        channel.sessionName,
        chatId,
        {
          data: mediaUrl,
          filename: 'media',
          mimetype: 'application/octet-stream',
        },
        message,
      );
    } else {
      // Send text message
      result = await wahaClient.sendText(
        channel.sessionName,
        chatId,
        message,
      );
    }

    logger.info('Message sent via WhatsApp', {
      channelId,
      recipient: chatId,
      hasMedia: !!mediaUrl,
      wahaMessageId: result.id,
    });

    return { id: result.id };
  } catch (error) {
    logger.error('Failed to send WhatsApp message', {
      channelId,
      recipient: chatId,
      error: (error as Error).message,
    });
    throw error;
  }
}

// ── Flow 1: Send Form Link ────────────────────────────────────────

export async function sendFormLink(
  input: SendFormLinkInput,
): Promise<MessageLogEntry> {
  const channel = await getByIdForOrg(
    input.channelId,
    input.organizationId,
  );

  if (channel.status !== 'WORKING') {
    throw new ValidationError('ערוץ הוואטסאפ אינו פעיל');
  }

  const chatId = formatPhoneNumber(input.recipientPhone);
  const text = input.caption
    ? `${input.caption}\n\n${input.formUrl}`
    : input.formUrl;

  try {
    const result = await wahaClient.sendText(
      channel.sessionName,
      chatId,
      text,
    );

    // Log success
    const logRows = await query(
      `INSERT INTO whatsapp_message_log
        (organization_id, channel_id, form_id, recipient_phone,
         message_type, content_ref, status, waha_message_id,
         attempts, sent_at)
       VALUES ($1, $2, $3, $4, 'link', $5, 'sent', $6, 1, NOW())
       RETURNING id`,
      [
        input.organizationId,
        input.channelId,
        input.formId,
        chatId,
        input.formUrl,
        result.id,
      ],
    );

    // Increment success counter
    await query(
      `UPDATE whatsapp_channels
       SET messages_sent_count = messages_sent_count + 1
       WHERE id = $1`,
      [input.channelId],
    );

    logger.info('Form link sent via WhatsApp', {
      channelId: input.channelId,
      formId: input.formId,
      recipient: chatId,
      wahaMessageId: result.id,
    });

    return { id: logRows[0].id };
  } catch (error) {
    // Log failure
    await query(
      `INSERT INTO whatsapp_message_log
        (organization_id, channel_id, form_id, recipient_phone,
         message_type, content_ref, status, error_message, attempts)
       VALUES ($1, $2, $3, $4, 'link', $5, 'failed', $6, 1)`,
      [
        input.organizationId,
        input.channelId,
        input.formId,
        chatId,
        input.formUrl,
        (error as Error).message,
      ],
    );

    // Increment failure counter
    await query(
      `UPDATE whatsapp_channels
       SET messages_failed_count = messages_failed_count + 1
       WHERE id = $1`,
      [input.channelId],
    );

    logger.error('Failed to send form link via WhatsApp', {
      channelId: input.channelId,
      formId: input.formId,
      error: (error as Error).message,
    });

    throw error;
  }
}

// ── Flow 2: Send PDF (Infrastructure) ─────────────────────────────

export async function sendPdf(
  input: SendPdfInput,
): Promise<MessageLogEntry> {
  const channel = await getByIdForOrg(
    input.channelId,
    input.organizationId,
  );

  if (channel.status !== 'WORKING') {
    throw new ValidationError('ערוץ הוואטסאפ אינו פעיל');
  }

  const chatId = formatPhoneNumber(input.recipientPhone);

  try {
    const result = await wahaClient.sendFile(
      channel.sessionName,
      chatId,
      {
        data: input.pdfBase64,
        filename: input.filename,
        mimetype: 'application/pdf',
      },
      input.caption,
    );

    const logRows = await query(
      `INSERT INTO whatsapp_message_log
        (organization_id, channel_id, form_id, submission_id,
         recipient_phone, message_type, content_ref, status,
         waha_message_id, attempts, sent_at)
       VALUES ($1, $2, $3, $4, $5, 'pdf', $6, 'sent', $7, 1, NOW())
       RETURNING id`,
      [
        input.organizationId,
        input.channelId,
        input.formId,
        input.submissionId || null,
        chatId,
        input.filename,
        result.id,
      ],
    );

    await query(
      `UPDATE whatsapp_channels
       SET messages_sent_count = messages_sent_count + 1
       WHERE id = $1`,
      [input.channelId],
    );

    logger.info('PDF sent via WhatsApp', {
      channelId: input.channelId,
      formId: input.formId,
      filename: input.filename,
      recipient: chatId,
    });

    return { id: logRows[0].id };
  } catch (error) {
    await query(
      `INSERT INTO whatsapp_message_log
        (organization_id, channel_id, form_id, submission_id,
         recipient_phone, message_type, content_ref, status,
         error_message, attempts)
       VALUES ($1, $2, $3, $4, $5, 'pdf', $6, 'failed', $7, 1)`,
      [
        input.organizationId,
        input.channelId,
        input.formId,
        input.submissionId || null,
        chatId,
        input.filename,
        (error as Error).message,
      ],
    );

    await query(
      `UPDATE whatsapp_channels
       SET messages_failed_count = messages_failed_count + 1
       WHERE id = $1`,
      [input.channelId],
    );

    logger.error('Failed to send PDF via WhatsApp', {
      channelId: input.channelId,
      formId: input.formId,
      error: (error as Error).message,
    });

    throw error;
  }
}

// ── Message Log ───────────────────────────────────────────────────

export async function getMessageLog(
  organizationId: string,
  filters?: {
    channelId?: string;
    formId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<any[]> {
  const conditions = ['organization_id = $1'];
  const params: any[] = [organizationId];
  let paramIndex = 2;

  if (filters?.channelId) {
    conditions.push(`channel_id = $${paramIndex++}`);
    params.push(filters.channelId);
  }
  if (filters?.formId) {
    conditions.push(`form_id = $${paramIndex++}`);
    params.push(filters.formId);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  const rows = await query(
    `SELECT * FROM whatsapp_message_log
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return rows;
}
