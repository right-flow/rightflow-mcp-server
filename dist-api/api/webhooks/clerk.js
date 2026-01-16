/**
 * Clerk Webhook Endpoint (Phase 0/1)
 * Handles user lifecycle events from Clerk
 *
 * Events: user.created, user.updated, user.deleted
 */
import { clerkService } from '../../src/services/auth/clerk.service';
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only POST is supported',
        });
    }
    try {
        // Verify webhook signature
        const signature = req.headers['svix-signature'];
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('CLERK_WEBHOOK_SECRET not configured');
            return res.status(500).json({
                error: 'Webhook secret not configured',
            });
        }
        const payload = JSON.stringify(req.body);
        // Validate signature
        const isValid = clerkService.validateWebhookSignature(payload, signature, webhookSecret);
        if (!isValid) {
            return res.status(401).json({
                error: 'Invalid signature',
                message: 'Webhook signature validation failed',
            });
        }
        // Process webhook
        const webhookData = req.body;
        const result = await clerkService.handleWebhook(webhookData);
        if (!result.success) {
            return res.status(400).json({
                error: 'Webhook processing failed',
                message: result.error,
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
        });
    }
    catch (error) {
        console.error('Clerk webhook error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
//# sourceMappingURL=clerk.js.map