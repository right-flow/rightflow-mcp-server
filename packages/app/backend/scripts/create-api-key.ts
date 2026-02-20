#!/usr/bin/env node
/**
 * Create MCP API Key Script
 *
 * Generates an API key directly in the database, bypassing the need for authentication.
 *
 * Usage:
 *   npm run create-api-key -- --org-id <organization_id> [--name "Key Name"] [--description "Description"]
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../src/config/database';

interface CreateKeyOptions {
  organizationId: string;
  name?: string;
  description?: string;
  environment?: 'development' | 'staging' | 'production';
}

async function createApiKey(options: CreateKeyOptions) {
  const {
    organizationId,
    name = 'MCP API Key',
    description = 'Generated via create-api-key script',
    environment = 'development',
  } = options;

  console.log('🔑 Creating MCP API Key...\n');

  // Generate API key: rfk_ + 64 random hex characters
  const apiKey = 'rfk_' + crypto.randomBytes(32).toString('hex');
  const keyPrefix = apiKey.substring(0, 8);

  console.log(`Organization ID: ${organizationId}`);
  console.log(`Key Prefix: ${keyPrefix}`);
  console.log(`Environment: ${environment}\n`);

  // Hash the API key (bcrypt)
  console.log('🔐 Hashing API key...');
  const keyHash = await bcrypt.hash(apiKey, 10);

  // Insert into database
  console.log('💾 Inserting into database...');
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
      organizationId,
      name,
      keyPrefix,
      keyHash,
      description,
      environment,
      JSON.stringify({
        templates: { read: true, write: false },
        fill: true,
        batch: false,
        audit: false,
      }),
    ],
  );

  if (!result || result.length === 0) {
    throw new Error('Failed to create API key - no result returned');
  }

  const createdKey = result[0];

  console.log('\n✅ API Key Created Successfully!\n');
  console.log('━'.repeat(80));
  console.log(`ID:          ${createdKey.id}`);
  console.log(`Name:        ${createdKey.name}`);
  console.log(`Prefix:      ${createdKey.key_prefix}`);
  console.log(`Environment: ${createdKey.environment}`);
  console.log(`Created:     ${createdKey.created_at}`);
  console.log('━'.repeat(80));
  console.log('\n🔑 YOUR API KEY (save this - it will not be shown again!):\n');
  console.log(`   ${apiKey}\n`);
  console.log('━'.repeat(80));
  console.log('\n📝 Next Steps:\n');
  console.log('1. Copy the API key above');
  console.log('2. Configure Claude Code:');
  console.log('   - Windows: %APPDATA%\\Claude\\claude_desktop_config.json\n');
  console.log('   Add this configuration:');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "rightflow": {');
  console.log('         "command": "node",');
  console.log(`         "args": ["c:\\\\Dev\\\\Dev\\\\RightFlow\\\\packages\\\\mcp-server\\\\dist\\\\index.js"],`);
  console.log('         "env": {');
  console.log('           "RIGHTFLOW_API_URL": "http://localhost:3003/api/v1",');
  console.log(`           "RIGHTFLOW_API_KEY": "${apiKey}"`);
  console.log('         }');
  console.log('       }');
  console.log('     }');
  console.log('   }\n');
  console.log('3. Restart Claude Code\n');
}

// Parse command line arguments
function parseArgs(): CreateKeyOptions | null {
  const args = process.argv.slice(2);
  const options: Partial<CreateKeyOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--org-id' && nextArg) {
      options.organizationId = nextArg;
      i++;
    } else if (arg === '--name' && nextArg) {
      options.name = nextArg;
      i++;
    } else if (arg === '--description' && nextArg) {
      options.description = nextArg;
      i++;
    } else if (arg === '--environment' && nextArg) {
      if (['development', 'staging', 'production'].includes(nextArg)) {
        options.environment = nextArg as 'development' | 'staging' | 'production';
      }
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run create-api-key -- --org-id <organization_id> [options]\n');
      console.log('Options:');
      console.log('  --org-id <id>          Organization ID (required)');
      console.log('  --name <name>          Key name (default: "MCP API Key")');
      console.log('  --description <desc>   Key description');
      console.log('  --environment <env>    Environment: development|staging|production (default: development)');
      console.log('  --help, -h             Show this help message\n');
      console.log('Example:');
      console.log('  npm run create-api-key -- --org-id org_123abc --name "Claude Code Key"');
      return null;
    }
  }

  if (!options.organizationId) {
    console.error('❌ Error: --org-id is required\n');
    console.error('Usage: npm run create-api-key -- --org-id <organization_id>\n');
    console.error('Run with --help for more options');
    return null;
  }

  return options as CreateKeyOptions;
}

// Main execution
async function main() {
  const options = parseArgs();

  if (!options) {
    process.exit(1);
  }

  try {
    await createApiKey(options);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating API key:', error);
    process.exit(1);
  }
}

main();
