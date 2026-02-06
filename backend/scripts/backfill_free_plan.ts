// Backfill Script: Assign FREE plan to existing organizations
// Created: 2026-02-05
// Purpose: After migration 005, assign default FREE plan to all existing orgs

import { query } from '../src/config/database';

interface Organization {
  id: string;
  name: string;
  clerk_organization_id: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
}

async function backfillFreePlan() {
  console.log('🚀 Starting backfill of FREE plan for existing organizations...\n');

  try {
    // 1. Get FREE plan ID
    console.log('📋 Step 1: Fetching FREE plan...');
    const planResult = await query<SubscriptionPlan>(
      `SELECT id, name FROM subscription_plans WHERE name = 'FREE' LIMIT 1`,
    );

    if (planResult.length === 0) {
      throw new Error('FREE plan not found! Make sure migration 005 has been run.');
    }

    const freePlanId = planResult[0].id;
    console.log(`✅ FREE plan found: ${freePlanId}\n`);

    // 2. Get all organizations without subscriptions
    console.log('📋 Step 2: Finding organizations without subscriptions...');
    const orgsResult = await query<Organization>(
      `SELECT o.id, o.name, o.clerk_organization_id
       FROM organizations o
       LEFT JOIN organization_subscriptions os ON o.id = os.org_id
       WHERE os.id IS NULL
       AND o.deleted_at IS NULL`,
    );

    console.log(`Found ${orgsResult.length} organizations without subscriptions\n`);

    if (orgsResult.length === 0) {
      console.log('✅ No organizations to backfill. All done!');
      return;
    }

    // 3. Create FREE subscriptions for each org
    console.log('📋 Step 3: Creating FREE subscriptions...\n');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let successCount = 0;
    let errorCount = 0;

    for (const org of orgsResult) {
      try {
        await query(
          `INSERT INTO organization_subscriptions
           (org_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
           VALUES ($1, $2, 'active', 'monthly', $3, $4)`,
          [org.id, freePlanId, now, periodEnd],
        );

        console.log(`✅ ${org.name} (${org.clerk_organization_id})`);
        successCount++;
      } catch (error) {
        console.error(
          `❌ Failed for ${org.name}:`,
          error instanceof Error ? error.message : error,
        );
        errorCount++;
      }
    }

    // 4. Create initial usage records
    console.log('\n📋 Step 4: Creating initial usage records...\n');

    for (const org of orgsResult) {
      try {
        await query(
          `INSERT INTO organization_usage
           (org_id, billing_period_start, billing_period_end, total_submissions, quota_limit)
           VALUES ($1, $2, $3, 0, 50)
           ON CONFLICT (org_id, billing_period_start) DO NOTHING`,
          [org.id, now, periodEnd],
        );
      } catch (error) {
        console.error(
          `⚠️  Warning: Could not create usage record for ${org.name}`,
        );
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${orgsResult.length}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount === 0) {
      console.log('🎉 Backfill completed successfully!');
    } else {
      console.log('⚠️  Backfill completed with errors. Please review.');
    }
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  backfillFreePlan()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { backfillFreePlan };
