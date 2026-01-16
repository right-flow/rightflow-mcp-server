/**
 * Plans API Endpoint
 * Public endpoint to list all available pricing plans
 *
 * GET /api/plans - Returns all active plans sorted by price
 */
import { getDb } from '../src/lib/db';
export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Method not allowed',
            message: 'Only GET requests are supported',
        });
    }
    try {
        // Fetch all active plans sorted by price
        const plans = await getDb()('plans')
            .where({ is_active: true })
            .orderBy('monthly_price_ils', 'asc')
            .select('id', 'name', 'monthly_price_ils', 'max_forms', 'max_responses_monthly', 'max_storage_mb', 'features');
        // Return plans with proper CORS headers for public access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).json({ plans });
    }
    catch (error) {
        console.error('Error fetching plans:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch plans',
        });
    }
}
//# sourceMappingURL=plans.js.map