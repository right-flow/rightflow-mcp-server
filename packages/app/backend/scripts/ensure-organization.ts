#!/usr/bin/env node
/**
 * Ensure user has an organization
 * Creates an organization if the user doesn't have one
 */

import { query } from '../src/config/database';

async function main() {
  try {
    console.log('🔍 Checking for organizations...\n');

    // Check if there are any organizations
    const orgs = await query('SELECT id, name, clerk_organization_id FROM organizations LIMIT 5');

    if (orgs && orgs.length > 0) {
      console.log(`✅ Found ${orgs.length} organization(s):\n`);
      orgs.forEach((org: any) => {
        console.log(`   - ${org.name} (${org.id})`);
        console.log(`     Clerk Org ID: ${org.clerk_organization_id || 'N/A'}\n`);
      });
    } else {
      console.log('❌ No organizations found!');
      console.log('\n📝 You need to create an organization in Clerk Dashboard:');
      console.log('   1. Go to: https://dashboard.clerk.com');
      console.log('   2. Select your project');
      console.log('   3. Click "Organizations" in sidebar');
      console.log('   4. Create a new organization');
      console.log('   5. Add your user to the organization\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
