/**
 * Plan Limits Enforcement Service
 * Checks and enforces plan limits for forms, responses, and storage
 */
import { getDb } from '../../lib/db';
export class LimitsService {
    db;
    constructor() {
        this.db = getDb();
    }
    /**
     * Check if user can perform action based on plan limits
     */
    async checkLimit(params) {
        const { userId, action, resourceSize } = params;
        // Get user's plan and usage
        const user = await this.db('users')
            .where({ id: userId })
            .first();
        if (!user) {
            return {
                allowed: false,
                reason: 'User not found',
            };
        }
        const plan = await this.db('plans')
            .where({ id: user.plan_id })
            .first();
        if (!plan) {
            return {
                allowed: false,
                reason: 'Plan not found',
            };
        }
        const usage = await this.db('usage_metrics')
            .where({ user_id: userId })
            .first();
        if (!usage) {
            return {
                allowed: false,
                reason: 'Usage metrics not found',
            };
        }
        // Check limit based on action
        switch (action) {
            case 'create_form':
                return this.checkFormsLimit(plan, usage);
            case 'submit_response':
                return this.checkResponsesLimit(plan, usage);
            case 'upload_file':
                if (resourceSize === undefined) {
                    throw new Error('resourceSize is required for upload_file action');
                }
                return this.checkStorageLimit(plan, usage, resourceSize);
            default:
                return {
                    allowed: false,
                    reason: 'Unknown action',
                };
        }
    }
    /**
     * Check forms limit
     */
    checkFormsLimit(plan, usage) {
        // -1 means unlimited
        if (plan.max_forms === -1) {
            return { allowed: true };
        }
        const currentUsage = usage.forms_count;
        const limit = plan.max_forms;
        if (currentUsage >= limit) {
            return {
                allowed: false,
                reason: `You've reached the maximum of ${limit} forms on the ${plan.name} plan`,
                currentUsage,
                limit,
                upgradeRequired: true,
            };
        }
        return { allowed: true };
    }
    /**
     * Check responses limit
     */
    checkResponsesLimit(plan, usage) {
        // -1 means unlimited
        if (plan.max_responses_monthly === -1) {
            return { allowed: true };
        }
        const currentUsage = usage.responses_count;
        const limit = plan.max_responses_monthly;
        if (currentUsage >= limit) {
            return {
                allowed: false,
                reason: `You've reached the maximum of ${limit} responses this month on the ${plan.name} plan`,
                currentUsage,
                limit,
                upgradeRequired: true,
            };
        }
        return { allowed: true };
    }
    /**
     * Check storage limit
     */
    checkStorageLimit(plan, usage, additionalBytes) {
        // -1 means unlimited
        if (plan.max_storage_mb === -1) {
            return { allowed: true };
        }
        const currentUsageBytes = usage.storage_used_bytes;
        const limitBytes = plan.max_storage_mb * 1024 * 1024;
        const newUsageBytes = currentUsageBytes + additionalBytes;
        if (newUsageBytes > limitBytes) {
            const currentUsageMB = Math.round(currentUsageBytes / 1024 / 1024);
            const limitMB = plan.max_storage_mb;
            return {
                allowed: false,
                reason: `This upload would exceed your storage limit of ${limitMB}MB on the ${plan.name} plan. Current usage: ${currentUsageMB}MB`,
                currentUsage: currentUsageBytes,
                limit: limitBytes,
                upgradeRequired: true,
            };
        }
        return { allowed: true };
    }
    /**
     * Get user's plan details with limits and current usage
     */
    async getUserPlanLimits(userId) {
        const user = await this.db('users')
            .where({ id: userId })
            .first();
        if (!user) {
            throw new Error('User not found');
        }
        const plan = await this.db('plans')
            .where({ id: user.plan_id })
            .first();
        if (!plan) {
            throw new Error('Plan not found');
        }
        const usage = await this.db('usage_metrics')
            .where({ user_id: userId })
            .first();
        if (!usage) {
            throw new Error('Usage metrics not found');
        }
        // Calculate limits reached
        const limitsReached = {
            forms: plan.max_forms !== -1 && usage.forms_count >= plan.max_forms,
            responses: plan.max_responses_monthly !== -1 && usage.responses_count >= plan.max_responses_monthly,
            storage: plan.max_storage_mb !== -1 && usage.storage_used_bytes >= plan.max_storage_mb * 1024 * 1024,
        };
        return {
            plan,
            usage: {
                forms_count: usage.forms_count,
                responses_count: usage.responses_count,
                storage_used_bytes: usage.storage_used_bytes,
                period_start: new Date(usage.period_start),
                period_end: new Date(usage.period_end),
            },
            limitsReached,
        };
    }
    /**
     * Check if user has access to a feature
     * Features are stored in plan.features as a JSON object
     */
    async hasFeatureAccess(userId, feature) {
        const user = await this.db('users')
            .where({ id: userId })
            .first();
        if (!user) {
            return false;
        }
        const plan = await this.db('plans')
            .where({ id: user.plan_id })
            .first();
        if (!plan) {
            return false;
        }
        // Free plan always has access to basic_forms
        if (feature === 'basic_forms') {
            return true;
        }
        // Check if feature exists in plan features
        return plan.features?.[feature] === true;
    }
}
//# sourceMappingURL=limits.service.js.map