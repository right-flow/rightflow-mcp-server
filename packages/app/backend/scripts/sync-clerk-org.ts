#!/usr/bin/env node
/**
 * Sync Clerk Organization to Database
 * Ensures the Clerk organization exists in the local database
 */

import { query } from '../src/config/database';

async function main() {
  const clerkOrgId = process.argv[2];

  if (!clerkOrgId) {
    console.error('❌ Error: Organization ID required');
    console.error('\nUsage: npm run sync-clerk-org -- <clerk_org_id>');
    console.error('Example: npm run sync-clerk-org -- org_38NGytGdKH16xzb6x9QxEyIrCeO\n');
    process.exit(1);
  }

  try {
    console.log('🔍 Checking if organization exists in database...\n');

    // Check if organization exists
    const existing = await query(
      'SELECT id, name, clerk_organization_id FROM organizations WHERE clerk_organization_id = $1',
      [clerkOrgId]
    );

    if (existing && existing.length > 0) {
      console.log('✅ Organization already exists in database:');
      console.log(`   Name: ${existing[0].name}`);
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Clerk Org ID: ${existing[0].clerk_organization_id}\n`);
      process.exit(0);
    }

    console.log('📝 Organization not found. Creating...\n');

    // Create organization
    const result = await query(
      `
      INSERT INTO organizations (
        clerk_organization_id,
        name,
        settings,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, clerk_organization_id, created_at
      `,
      [
        clerkOrgId,
        'My Organization', // Default name - can be updated later
        JSON.stringify({}),
      ]
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to create organization');
    }

    const org = result[0];

    console.log('✅ Organization created successfully!\n');
    console.log('━'.repeat(80));
    console.log(`ID:               ${org.id}`);
    console.log(`Name:             ${org.name}`);
    console.log(`Clerk Org ID:     ${org.clerk_organization_id}`);
    console.log(`Created:          ${org.created_at}`);
    console.log('━'.repeat(80));
    console.log('\n✨ You can now create API keys!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
