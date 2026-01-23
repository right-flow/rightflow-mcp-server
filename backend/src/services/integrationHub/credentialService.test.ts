/**
 * Tests for Credential Service (Integration Hub)
 * Following TDD methodology - tests written BEFORE implementation
 *
 * Test Coverage:
 * - Encryption/Decryption with AES-256-GCM
 * - Key validation on startup
 * - Credential storage and retrieval
 * - Key rotation support
 * - Error handling for corrupt data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { query } from '../../config/database';
import * as credentialService from './credentialService';
import * as connectorService from './connectorService';

// Test data
let testOrgId: string;
let testConnectorId: string;
const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;

beforeAll(async () => {
  // Set encryption key for tests (64 hex characters = 256 bits)
  process.env.INTEGRATION_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // Create test organization
  const org = await query(
    `INSERT INTO organizations (clerk_organization_id, name)
     VALUES ($1, $2) RETURNING id`,
    ['test-cred-org', 'Test Credentials Org'],
  );
  testOrgId = org[0].id;

  // Create test connector
  const connector = await connectorService.create({
    organizationId: testOrgId,
    definitionSlug: 'priority-cloud',
    name: 'Test Connector for Credentials',
    config: {},
  });
  testConnectorId = connector.id;
});

afterAll(async () => {
  // Cleanup
  await query('DELETE FROM organizations WHERE clerk_organization_id = $1', ['test-cred-org']);

  // Restore original key
  if (originalKey) {
    process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
  } else {
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
  }
});

beforeEach(async () => {
  // Clean credentials before each test
  await query('DELETE FROM connector_credentials WHERE connector_id = $1', [testConnectorId]);
});

describe('CredentialService', () => {
  describe('Initialization', () => {
    it('should fail fast if encryption key missing on startup', () => {
      const key = process.env.INTEGRATION_ENCRYPTION_KEY;
      delete process.env.INTEGRATION_ENCRYPTION_KEY;

      expect(() => {
        // Force module reload
        jest.resetModules();
        require('./credentialService');
      }).toThrow('INTEGRATION_ENCRYPTION_KEY');

      process.env.INTEGRATION_ENCRYPTION_KEY = key;
    });

    it('should reject encryption key shorter than 256 bits', () => {
      const key = process.env.INTEGRATION_ENCRYPTION_KEY;
      process.env.INTEGRATION_ENCRYPTION_KEY = 'short-key'; // Only 72 bits

      expect(() => {
        jest.resetModules();
        require('./credentialService');
      }).toThrow('256 bits');

      process.env.INTEGRATION_ENCRYPTION_KEY = key;
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt credentials successfully', async () => {
      const credentials = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'abc-def-ghi',
      };

      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      const decrypted = await credentialService.getCredentials(testConnectorId);

      expect(decrypted).toEqual(credentials);
    });

    it('should support empty credentials object', async () => {
      const emptyCredentials = {};

      await credentialService.storeCredentials(testConnectorId, 'api_key', emptyCredentials);

      const decrypted = await credentialService.getCredentials(testConnectorId);

      expect(decrypted).toEqual({});
    });

    it('should support Hebrew text in credentials', async () => {
      const credentials = {
        username: 'משתמש',
        password: 'סיסמה123',
        companyName: 'חברת דוגמה',
      };

      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      const decrypted = await credentialService.getCredentials(testConnectorId);

      expect(decrypted).not.toBeNull();
      expect(decrypted!.username).toBe('משתמש');
      expect(decrypted!.password).toBe('סיסמה123');
      expect(decrypted!.companyName).toBe('חברת דוגמה');
    });

    it('should not expose credentials in error messages (CRITICAL SECURITY)', async () => {
      const credentials = {
        username: 'admin',
        password: 'super-secret-password-123',
      };

      // Store credentials
      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      // Corrupt the encrypted data in database
      await query(
        `UPDATE connector_credentials
         SET credentials_encrypted = $1
         WHERE connector_id = $2`,
        [Buffer.from('corrupted!!!'), testConnectorId],
      );

      // Attempt to decrypt - should fail gracefully
      try {
        await credentialService.getCredentials(testConnectorId);
        fail('Should have thrown error');
      } catch (error: any) {
        // Error message should NOT contain the password
        expect(error.message).not.toContain('super-secret');
        expect(error.message).not.toContain('admin');
        expect(error.message).toContain('Decryption failed');
      }
    });

    it('should fail gracefully when decrypting with wrong key', async () => {
      const credentials = { password: 'secret' };

      // Encrypt with original key
      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      // Change key
      const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;
      process.env.INTEGRATION_ENCRYPTION_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      try {
        // Force service reload with new key
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const newService = require('./credentialService');

        await newService.getCredentials(testConnectorId);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Decryption failed');
      } finally {
        process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
        jest.resetModules();
      }
    });
  });

  describe('storeCredentials', () => {
    it('should store credentials with auth type', async () => {
      const credentials = { apiKey: 'test-key' };

      await credentialService.storeCredentials(testConnectorId, 'api_key', credentials);

      const stored = await query(
        'SELECT auth_type, encryption_key_version FROM connector_credentials WHERE connector_id = $1',
        [testConnectorId],
      );

      expect(stored[0].auth_type).toBe('api_key');
      expect(stored[0].encryption_key_version).toBe(1);
    });

    it('should update credentials if already exist', async () => {
      const credentials1 = { apiKey: 'old-key' };
      const credentials2 = { apiKey: 'new-key' };

      // Store first
      await credentialService.storeCredentials(testConnectorId, 'api_key', credentials1);

      // Update
      await credentialService.storeCredentials(testConnectorId, 'api_key', credentials2);

      const decrypted = await credentialService.getCredentials(testConnectorId);

      expect(decrypted).not.toBeNull();
      expect(decrypted!.apiKey).toBe('new-key');

      // Verify only one row exists
      const count = await query(
        'SELECT COUNT(*) FROM connector_credentials WHERE connector_id = $1',
        [testConnectorId],
      );
      expect(parseInt(count[0].count)).toBe(1);
    });

    it('should reject credentials larger than 1MB', async () => {
      const largeCredentials = {
        certificateChain: 'X'.repeat(2 * 1024 * 1024), // 2MB string
      };

      await expect(
        credentialService.storeCredentials(testConnectorId, 'custom', largeCredentials),
      ).rejects.toThrow('Credentials too large');
    });

    it('should validate auth_type enum', async () => {
      const credentials = { test: 'value' };

      await expect(
        credentialService.storeCredentials(testConnectorId, 'invalid_type' as any, credentials),
      ).rejects.toThrow('Invalid auth type');
    });
  });

  describe('getCredentials', () => {
    it('should return null when no credentials exist', async () => {
      const result = await credentialService.getCredentials(testConnectorId);

      expect(result).toBeNull();
    });

    it('should decrypt credentials successfully', async () => {
      const credentials = { username: 'test', password: 'pass' };

      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      const decrypted = await credentialService.getCredentials(testConnectorId);

      expect(decrypted).toEqual(credentials);
    });

    it('should update last_used_at timestamp', async () => {
      const credentials = { apiKey: 'test' };

      await credentialService.storeCredentials(testConnectorId, 'api_key', credentials);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await credentialService.getCredentials(testConnectorId);

      const result = await query(
        'SELECT last_used_at FROM connector_credentials WHERE connector_id = $1',
        [testConnectorId],
      );

      expect(result[0].last_used_at).not.toBeNull();
    });
  });

  describe('deleteCredentials', () => {
    it('should delete credentials for connector', async () => {
      const credentials = { password: 'test' };

      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      await credentialService.deleteCredentials(testConnectorId);

      const result = await credentialService.getCredentials(testConnectorId);

      expect(result).toBeNull();
    });

    it('should not throw error if no credentials exist', async () => {
      // Should not throw
      await credentialService.deleteCredentials(testConnectorId);
    });
  });

  describe('Key Rotation', () => {
    it('should support encryption_key_version field for future rotation', async () => {
      const credentials = { password: 'test' };

      await credentialService.storeCredentials(testConnectorId, 'basic', credentials);

      const result = await query(
        'SELECT encryption_key_version FROM connector_credentials WHERE connector_id = $1',
        [testConnectorId],
      );

      expect(result[0].encryption_key_version).toBe(1);
    });
  });

  describe('OAuth2 Token Storage', () => {
    it('should store OAuth2 tokens separately', async () => {
      const oauthData = {
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenUrl: 'https://auth.example.com/token',
      };

      await credentialService.storeOAuth2Tokens(testConnectorId, oauthData);

      const result = await query(
        'SELECT oauth_expires_at, oauth_token_url FROM connector_credentials WHERE connector_id = $1',
        [testConnectorId],
      );

      expect(result[0].oauth_expires_at).not.toBeNull();
      expect(result[0].oauth_token_url).toBe(oauthData.tokenUrl);
    });

    it('should retrieve OAuth2 tokens', async () => {
      const oauthData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        tokenUrl: 'https://auth.example.com/token',
      };

      await credentialService.storeOAuth2Tokens(testConnectorId, oauthData);

      const retrieved = await credentialService.getOAuth2Tokens(testConnectorId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.accessToken).toBe('access-token');
      expect(retrieved!.refreshToken).toBe('refresh-token');
      expect(retrieved!.tokenUrl).toBe(oauthData.tokenUrl);
    });
  });
});
