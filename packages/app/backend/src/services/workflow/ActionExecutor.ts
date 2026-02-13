/**
 * ActionExecutor Service
 * Executes various action types in workflows
 */

import { EventEmitter } from 'events';
import axios, { AxiosError } from 'axios';
import * as nodemailer from 'nodemailer';
import { db } from '../../db';
import {
  WorkflowActionType,
  ActionConfig,
  RetryPolicy,
  WorkflowContext,
  WebhookAuth
} from './types';
import * as pdfService from '../pdf/pdfService';
import * as whatsappService from '../whatsapp/sendService';

export class ActionExecutor extends EventEmitter {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter if configured
   */
  private initializeEmailTransporter(): void {
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Execute an action with optional retry policy
   */
  async execute(
    actionType: WorkflowActionType,
    config: ActionConfig,
    context: WorkflowContext,
    retryPolicy?: RetryPolicy
  ): Promise<any> {
    const maxRetries = retryPolicy?.maxRetries || 0;
    const retryDelay = retryPolicy?.retryDelay || 1000;
    const backoffMultiplier = retryPolicy?.backoffMultiplier || 1;

    let lastError: Error | null = null;
    let currentDelay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ActionExecutor] Executing ${actionType} (attempt ${attempt + 1}/${maxRetries + 1})`);

        const result = await this.executeAction(actionType, config, context);

        // Emit success event
        this.emit('action:success', {
          actionType,
          config,
          result,
          attempts: attempt + 1
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        console.error(`[ActionExecutor] Action failed (attempt ${attempt + 1}):`, error);

        // Check if we should retry
        if (attempt < maxRetries) {
          // Check if error matches retry conditions
          if (retryPolicy?.retryOn && error instanceof AxiosError) {
            const statusCode = error.response?.status;
            if (statusCode && !retryPolicy.retryOn.includes(statusCode)) {
              throw error; // Don't retry for this status code
            }
          }

          // Wait before retrying
          await this.sleep(currentDelay);
          currentDelay *= backoffMultiplier;
        }
      }
    }

    // All retries exhausted
    this.emit('action:failed', {
      actionType,
      config,
      error: lastError,
      attempts: maxRetries + 1
    });

    throw lastError;
  }

  /**
   * Execute a single action without retry
   */
  private async executeAction(
    actionType: WorkflowActionType,
    config: ActionConfig,
    context: WorkflowContext
  ): Promise<any> {
    switch (actionType) {
      case WorkflowActionType.SEND_WHATSAPP:
        return await this.sendWhatsApp(config.whatsapp!, context);

      case WorkflowActionType.SEND_EMAIL:
        return await this.sendEmail(config.email!, context);

      case WorkflowActionType.CALL_WEBHOOK:
        return await this.callWebhook(config.webhook!, context);

      case WorkflowActionType.GENERATE_PDF:
        return await this.generatePDF(config.pdf!, context);

      case WorkflowActionType.UPDATE_DATABASE:
        return await this.updateDatabase(config.database!, context);

      case WorkflowActionType.CREATE_TASK:
        return await this.createTask(config.task!, context);

      case WorkflowActionType.NOTIFY_USER:
        return await this.notifyUser(config, context);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsApp(
    config: ActionConfig['whatsapp'],
    context: WorkflowContext
  ): Promise<any> {
    if (!config) {
      throw new Error('WhatsApp configuration is required');
    }

    const { channelId, recipientPhone, template, message, mediaUrl } = config;

    // Replace variables in message
    const processedMessage = await this.processTemplate(
      message || template || '',
      context
    );

    // Send via WhatsApp service
    const result = await whatsappService.sendMessage({
      channelId,
      recipientPhone,
      message: processedMessage,
      mediaUrl
    });

    return {
      success: true,
      messageId: result.id,
      recipient: recipientPhone
    };
  }

  /**
   * Send email
   */
  private async sendEmail(
    config: ActionConfig['email'],
    context: WorkflowContext
  ): Promise<any> {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    if (!config) {
      throw new Error('Email configuration is required');
    }

    const { to, cc, subject, body, attachments, template } = config;

    // Process template variables
    const processedSubject = await this.processTemplate(subject, context);
    const processedBody = await this.processTemplate(
      body || template || '',
      context
    );

    // Send email
    const info = await this.emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@rightflow.com',
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      subject: processedSubject,
      html: processedBody,
      attachments: attachments?.map(path => ({
        path
      }))
    });

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted
    };
  }

  /**
   * Call webhook
   */
  private async callWebhook(
    config: ActionConfig['webhook'],
    context: WorkflowContext
  ): Promise<any> {
    if (!config) {
      throw new Error('Webhook configuration is required');
    }

    const { url, method, headers, body, authentication } = config;

    // Process URL template
    const processedUrl = await this.processTemplate(url, context);

    // Process body if it's a string template
    let processedBody = body;
    if (typeof body === 'string') {
      processedBody = await this.processTemplate(body, context);
      try {
        processedBody = JSON.parse(processedBody);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add authentication
    if (authentication) {
      const authHeaders = this.getAuthHeaders(authentication);
      Object.assign(requestHeaders, authHeaders);
    }

    // Make HTTP request
    const response = await axios({
      method: method || 'POST',
      url: processedUrl,
      headers: requestHeaders,
      data: processedBody,
      timeout: 30000, // 30 seconds timeout
      validateStatus: (status) => status < 500 // Don't throw on 4xx
    });

    return {
      success: response.status < 400,
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  }

  /**
   * Generate PDF
   */
  private async generatePDF(
    config: ActionConfig['pdf'],
    context: WorkflowContext
  ): Promise<any> {
    if (!config) {
      throw new Error('PDF configuration is required');
    }

    const { formId, templateId, outputName, sendTo } = config;

    // Get form data from context
    const formData = context.formData[formId] || context.formData;

    // Generate PDF using pdf service
    const pdfBuffer = await pdfService.generatePDF({
      templateId: templateId || formId,
      data: formData,
      outputName
    });

    // Save PDF reference
    const pdfUrl = await this.savePDF(pdfBuffer, outputName);

    // Send via email if recipients specified
    if (sendTo && sendTo.length > 0) {
      await this.sendEmail(
        {
          to: sendTo,
          subject: `PDF Document: ${outputName}`,
          body: `Please find attached the PDF document: ${outputName}`,
          attachments: [pdfUrl]
        },
        context
      );
    }

    return {
      success: true,
      pdfUrl,
      size: pdfBuffer.length,
      sentTo: sendTo
    };
  }

  /**
   * Update database
   */
  private async updateDatabase(
    config: ActionConfig['database'],
    context: WorkflowContext
  ): Promise<any> {
    if (!config) {
      throw new Error('Database configuration is required');
    }

    const { operation, table, data, where } = config;

    // Process data templates
    const processedData = await this.processObjectTemplates(data, context);
    const processedWhere = where
      ? await this.processObjectTemplates(where, context)
      : undefined;

    let result;

    switch (operation) {
      case 'insert':
        result = await db(table).insert(processedData).returning('*');
        break;

      case 'update':
        if (!processedWhere) {
          throw new Error('WHERE clause required for update operation');
        }
        result = await db(table).where(processedWhere).update(processedData);
        break;

      case 'upsert':
        // PostgreSQL upsert
        result = await db(table)
          .insert(processedData)
          .onConflict(Object.keys(processedWhere || {}))
          .merge()
          .returning('*');
        break;

      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }

    return {
      success: true,
      operation,
      table,
      affected: Array.isArray(result) ? result.length : result
    };
  }

  /**
   * Create task
   */
  private async createTask(
    config: ActionConfig['task'],
    context: WorkflowContext
  ): Promise<any> {
    if (!config) {
      throw new Error('Task configuration is required');
    }

    const { title, description, assignee, dueDate, priority } = config;

    // Process templates
    const processedTitle = await this.processTemplate(title, context);
    const processedDescription = await this.processTemplate(description, context);

    // Create task in task management system
    // This is a placeholder - integrate with actual task system
    const task = await db('tasks').insert({
      title: processedTitle,
      description: processedDescription,
      assignee_id: assignee,
      due_date: dueDate,
      priority: priority || 'medium',
      workflow_instance_id: context.metadata?.instanceId,
      created_at: new Date()
    }).returning('*');

    return {
      success: true,
      taskId: task[0].id,
      title: processedTitle
    };
  }

  /**
   * Notify user
   */
  private async notifyUser(
    config: ActionConfig,
    context: WorkflowContext
  ): Promise<any> {
    // This could send in-app notifications, push notifications, etc.
    // For now, we'll just log
    console.log('[ActionExecutor] User notification:', {
      userId: context.metadata?.userId,
      message: 'Workflow action completed',
      config
    });

    return {
      success: true,
      notified: true
    };
  }

  /**
   * Process template variables in string
   */
  private async processTemplate(
    template: string,
    context: WorkflowContext
  ): Promise<string> {
    if (!template) return '';

    let result = template;

    // Replace {{variable}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = template.match(variablePattern);

    if (matches) {
      for (const match of matches) {
        const varPath = match.slice(2, -2).trim(); // Remove {{ and }}
        const value = this.getValueFromContext(varPath, context);
        result = result.replace(match, String(value || ''));
      }
    }

    return result;
  }

  /**
   * Process template variables in object
   */
  private async processObjectTemplates(
    obj: Record<string, any>,
    context: WorkflowContext
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = await this.processTemplate(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = await this.processObjectTemplates(value, context);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get value from context using dot notation
   */
  private getValueFromContext(path: string, context: WorkflowContext): any {
    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(auth: WebhookAuth): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.credentials?.token}`;
        break;

      case 'basic':
        const encoded = Buffer.from(
          `${auth.credentials?.username}:${auth.credentials?.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;

      case 'api_key':
        const keyName = auth.credentials?.keyName || 'X-API-Key';
        headers[keyName] = auth.credentials?.key || '';
        break;

      case 'oauth2':
        headers['Authorization'] = `Bearer ${auth.credentials?.accessToken}`;
        break;
    }

    return headers;
  }

  /**
   * Save PDF to storage
   */
  private async savePDF(buffer: Buffer, filename: string): Promise<string> {
    // This would save to S3 or other storage
    // For now, save locally and return path
    const fs = require('fs').promises;
    const path = require('path');

    const dir = path.join(process.cwd(), 'uploads', 'pdfs');
    await fs.mkdir(dir, { recursive: true });

    const filepath = path.join(dir, `${Date.now()}-${filename}`);
    await fs.writeFile(filepath, buffer);

    return filepath;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}