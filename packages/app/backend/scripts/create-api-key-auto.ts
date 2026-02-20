#!/usr/bin/env node
/**
 * Create MCP API Key Script (Auto-detect Organization)
 *
 * Automatically finds the first organization and creates an API key for it.
 *
 * Usage:
 *   npm run create-api-key:auto
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../src/config/database';

async function main() {
  try {
    console.log('🔍 Finding organization...\n');

    // Find the first organization
    const orgs = await query('SELECT id, name FROM organizations LIMIT 1');

    if (!orgs || orgs.length === 0) {
      console.error('❌ No organizations found in database!');
      console.error('\nPlease create an organization first or use:');
      console.error('  npm run create-api-key -- --org-id <your_org_id>\n');
      process.exit(1);
    }

    const org = orgs[0];
    console.log(`✅ Found organization: ${org.name} (${org.id})\n`);

    // Generate API key
    const apiKey = 'rfk_' + crypto.randomBytes(32).toString('hex');
    const keyPrefix = apiKey.substring(0, 8);

    console.log('🔐 Generating API key...');
    const keyHash = await bcrypt.hash(apiKey, 10);

    console.log('💾 Saving to database...');
    const result = await query(
      `
      INSERT INTO mcp_api_keys (
        organization_id,
        name,
        key_prefix,
        key_hash,
        description,
        environment,
        permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, key_prefix, environment, created_at
      `,
      [
        org.id,
        'MCP Claude Code Key',
        keyPrefix,
        keyHash,
        'Auto-generated API key for MCP server',
        'development',
        JSON.stringify({
          templates: { read: true, write: false },
          fill: true,
          batch: false,
          audit: false,
        }),
      ],
    );

    if (!result || result.length === 0) {
      throw new Error('Failed to create API key');
    }

    const createdKey = result[0];

    // Success output
    console.log('\n' + '═'.repeat(80));
    console.log('✅ API KEY CREATED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log(`\nOrganization: ${org.name}`);
    console.log(`Key ID:       ${createdKey.id}`);
    console.log(`Key Prefix:   ${createdKey.key_prefix}`);
    console.log(`Environment:  ${createdKey.environment}`);
    console.log(`Created:      ${createdKey.created_at}`);
    console.log('\n' + '═'.repeat(80));
    console.log('🔑 YOUR API KEY (save this now - it won\'t be shown again!):');
    console.log('═'.repeat(80));
    console.log(`\n${apiKey}\n`);
    console.log('═'.repeat(80));
    console.log('\n📝 NEXT STEPS:\n');
    console.log('1. Copy the API key above');
    console.log('\n2. Configure Claude Code/Cowork:');
    console.log('   Edit: %APPDATA%\\Claude\\claude_desktop_config.json\n');
    console.log('   Add this configuration:\n');
    console.log('   {');
    console.log('     "mcpServers": {');
    console.log('       "rightflow": {');
    console.log('         "command": "node",');
    console.log('         "args": ["c:\\\\Dev\\\\Dev\\\\RightFlow\\\\packages\\\\mcp-server\\\\dist\\\\index.js"],');
    console.log('         "env": {');
    console.log('           "RIGHTFLOW_API_URL": "http://localhost:3003/api/v1",');
    console.log(`           "RIGHTFLOW_API_KEY": "${apiKey}"`);
    console.log('         }');
    console.log('       }');
    console.log('     }');
    console.log('   }\n');
    console.log('3. Restart Claude Code/Cowork\n');
    console.log('4. Test by asking Claude: "List available Hebrew PDF templates"\n');
    console.log('═'.repeat(80));

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
