/**
 * Credential Service - Integration Hub
 * Handles encryption/decryption of connector credentials
 *
 * Security:
 * - AES-256-GCM encryption
 * - Key stored in environment variable (INTEGRATION_ENCRYPTION_KEY)
 * - Support for key rotation via version field
 * - No credentials in error messages
 * - Separate storage for OAuth2 tokens
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { query } from '../../config/database';
import { ValidationError, ServerError } from '../../utils/errors';
import logger from '../../utils/logger';

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM
const MAX_CREDENTIAL_SIZE = 1024 * 1024; // 1MB
const VALID_AUTH_TYPES = ['oauth2', 'api_key', 'basic', 'session', 'custom'];

// ============================================================================
// Types
// ============================================================================

export interface OAuth2TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenUrl: string;
}

// ============================================================================
// Encryption Service Singleton
// ============================================================================

class EncryptionService {
  private encryptionKey!: Buffer;
  private keyVersion: number = 1;

  constructor() {
    this.initializeKey();
  }

  private initializeKey(): void {
    const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;

    if (!keyHex) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32',
      );
    }

    if (keyHex.length !== 64) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY must be 64 hex characters (256 bits). ' +
        'Current length: ' + keyHex.length,
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');

    logger.info('Encryption service initialized', { keyVersion: this.keyVersion });
  }

  /**
   * Encrypt plaintext with AES-256-GCM
   * Returns: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
   */
  encrypt(plaintext: string): Buffer {
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Concatenate: IV + AuthTag + Ciphertext
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error: any) {
      logger.error('Encryption failed', { error: error.message });
      throw new ServerError('Encryption failed');
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   * Expects: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
   */
  decrypt(encrypted: Buffer): string {
    try {
      if (encrypted.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted data length');
      }

      const iv = encrypted.subarray(0, IV_LENGTH);
      const authTag = encrypted.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const ciphertext = encrypted.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error: any) {
      logger.error('Decryption failed', {
        error: error.message,
        // DO NOT log encrypted data or keys
      });
      throw new ServerError('Decryption failed');
    }
  }

  /**
   * Encrypt structured credentials (JSON)
   */
  encryptCredentials(credentials: Record<string, any>): Buffer {
    const json = JSON.stringify(credentials);

    if (json.length > MAX_CREDENTIAL_SIZE) {
      throw new ValidationError('Credentials too large (max 1MB)');
    }

    return this.encrypt(json);
  }

  /**
   * Decrypt structured credentials (JSON)
   */
  decryptCredentials(encrypted: Buffer): Record<string, any> {
    const json = this.decrypt(encrypted);
    return JSON.parse(json);
  }

  getKeyVersion(): number {
    return this.keyVersion;
  }
}

// Initialize singleton
const encryptionService = new EncryptionService();

// ============================================================================
// Public API
// ============================================================================

/**
 * Store credentials for connector
 *
 * Security:
 * - Encrypts credentials with AES-256-GCM
 * - Validates auth_type enum
 * - Enforces max credential size
 * - Upserts (insert or update if exists)
 */
export async function storeCredentials(
  connectorId: string,
  authType: string,
  credentials: Record<string, any>,
): Promise<void> {
  logger.info('Storing credentials', { connectorId, authType });

  // Validate auth type
  if (!VALID_AUTH_TYPES.includes(authType)) {
    throw new ValidationError('Invalid auth type', {
      provided: authType,
      allowed: VALID_AUTH_TYPES,
    });
  }

  // Encrypt credentials
  const encrypted = encryptionService.encryptCredentials(credentials);
  const keyVersion = encryptionService.getKeyVersion();

  // Upsert credentials
  await query(
    `INSERT INTO connector_credentials (
      connector_id,
      auth_type,
      credentials_encrypted,
      encryption_key_version
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (connector_id)
    DO UPDATE SET
      auth_type = $2,
      credentials_encrypted = $3,
      encryption_key_version = $4,
      updated_at = NOW()`,
    [connectorId, authType, encrypted, keyVersion],
  );

  logger.info('Credentials stored successfully', { connectorId });
}

/**
 * Get credentials for connector
 *
 * Security:
 * - Returns decrypted credentials
 * - Updates last_used_at timestamp
 * - Returns null if no credentials exist
 * - Never exposes credentials in error messages
 */
export async function getCredentials(
  connectorId: string,
): Promise<Record<string, any> | null> {
  const result = await query<any>(
    `SELECT credentials_encrypted, encryption_key_version
     FROM connector_credentials
     WHERE connector_id = $1`,
    [connectorId],
  );

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  try {
    // Decrypt credentials
    const decrypted = encryptionService.decryptCredentials(row.credentials_encrypted);

    // Update last_used_at (fire and forget)
    query(
      `UPDATE connector_credentials
       SET last_used_at = NOW()
       WHERE connector_id = $1`,
      [connectorId],
    ).catch(err => {
      logger.warn('Failed to update last_used_at', { error: err.message });
    });

    return decrypted;
  } catch (error: any) {
    logger.error('Failed to decrypt credentials', {
      connectorId,
      error: error.message,
      // DO NOT log credentials or encrypted data
    });
    throw error;
  }
}

/**
 * Delete credentials for connector
 */
export async function deleteCredentials(connectorId: string): Promise<void> {
  await query(
    `DELETE FROM connector_credentials WHERE connector_id = $1`,
    [connectorId],
  );

  logger.info('Credentials deleted', { connectorId });
}

/**
 * Store OAuth2 tokens separately (for refresh without full decrypt)
 *
 * Note: Access and refresh tokens are encrypted separately
 * to allow refreshing without decrypting main credentials
 */
export async function storeOAuth2Tokens(
  connectorId: string,
  tokenData: OAuth2TokenData,
): Promise<void> {
  logger.info('Storing OAuth2 tokens', { connectorId });

  const accessTokenEncrypted = encryptionService.encrypt(tokenData.accessToken);
  const refreshTokenEncrypted = encryptionService.encrypt(tokenData.refreshToken);

  await query(
    `INSERT INTO connector_credentials (
      connector_id,
      auth_type,
      credentials_encrypted,
      encryption_key_version,
      oauth_access_token_encrypted,
      oauth_refresh_token_encrypted,
      oauth_expires_at,
      oauth_token_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (connector_id)
    DO UPDATE SET
      oauth_access_token_encrypted = $5,
      oauth_refresh_token_encrypted = $6,
      oauth_expires_at = $7,
      oauth_token_url = $8,
      updated_at = NOW()`,
    [
      connectorId,
      'oauth2',
      encryptionService.encryptCredentials({}), // Empty main credentials
      encryptionService.getKeyVersion(),
      accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenData.expiresAt,
      tokenData.tokenUrl,
    ],
  );

  logger.info('OAuth2 tokens stored successfully', { connectorId });
}

/**
 * Get OAuth2 tokens
 */
export async function getOAuth2Tokens(
  connectorId: string,
): Promise<OAuth2TokenData | null> {
  const result = await query<any>(
    `SELECT
      oauth_access_token_encrypted,
      oauth_refresh_token_encrypted,
      oauth_expires_at,
      oauth_token_url
     FROM connector_credentials
     WHERE connector_id = $1 AND auth_type = 'oauth2'`,
    [connectorId],
  );

  if (result.length === 0) {
    return null;
  }

  const row = result[0];

  try {
    const accessToken = encryptionService.decrypt(row.oauth_access_token_encrypted);
    const refreshToken = encryptionService.decrypt(row.oauth_refresh_token_encrypted);

    return {
      accessToken,
      refreshToken,
      expiresAt: row.oauth_expires_at,
      tokenUrl: row.oauth_token_url,
    };
  } catch (error: any) {
    logger.error('Failed to decrypt OAuth2 tokens', {
      connectorId,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// Generic Encryption/Decryption Helpers (for webhook secrets, etc.)
// ============================================================================

/**
 * Encrypt a string value
 * @param plaintext - String to encrypt
 * @param key - Optional encryption key (defaults to INTEGRATION_ENCRYPTION_KEY)
 * @returns Base64-encoded encrypted data
 */
export async function encrypt(plaintext: string, key?: string): Promise<string> {
  // If custom key provided, use it; otherwise use default encryption service
  if (key) {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    const result = Buffer.concat([iv, authTag, encrypted]);

    return result.toString('base64');
  } else {
    const encrypted = encryptionService.encrypt(plaintext);
    return encrypted.toString('base64');
  }
}

/**
 * Decrypt a string value
 * @param encrypted - Base64-encoded encrypted data
 * @param key - Optional encryption key (defaults to INTEGRATION_ENCRYPTION_KEY)
 * @returns Decrypted plaintext
 */
export async function decrypt(encrypted: string, key?: string): Promise<string> {
  const encryptedBuffer = Buffer.from(encrypted, 'base64');

  // If custom key provided, use it; otherwise use default encryption service
  if (key) {
    const keyBuffer = Buffer.from(key, 'hex');

    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data length');
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } else {
    return encryptionService.decrypt(encryptedBuffer);
  }
}
