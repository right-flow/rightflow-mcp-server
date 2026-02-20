/**
 * API Keys Service
 * Handles MCP API key management operations
 */

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  description?: string;
  environment: 'development' | 'staging' | 'production';
  permissions: {
    templates?: {
      read: boolean;
      write: boolean;
    };
    fill: boolean;
    batch: boolean;
    audit: boolean;
  };
  last_used_at?: string;
  created_at: string;
  revoked_at?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  environment?: 'development' | 'staging' | 'production';
  permissions?: {
    templates?: {
      read: boolean;
      write: boolean;
    };
    fill: boolean;
    batch: boolean;
    audit: boolean;
  };
}

export interface CreateApiKeyResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    api_key: string; // Full key - only returned once!
    key_prefix: string;
    environment: string;
    created_at: string;
    warning: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ListApiKeysResponse {
  success: boolean;
  data?: {
    api_keys: ApiKey[];
    total: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DeleteApiKeyResponse {
  success: boolean;
  data?: {
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class ApiKeysService {
  private readonly baseUrl = '/api/v1/api-keys';

  /**
   * Get authentication headers with Clerk token
   */
  private async getHeaders(token?: string | null): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * List all API keys for the current organization
   */
  async listApiKeys(token?: string | null): Promise<ListApiKeysResponse> {
    try {
      const headers = await this.getHeaders(token);
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers,
        credentials: 'include', // Include cookies for Clerk auth
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || { code: 'FETCH_ERROR', message: 'Failed to fetch API keys' },
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching API keys:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  /**
   * Create a new API key
   */
  async createApiKey(request: CreateApiKeyRequest, token?: string | null): Promise<CreateApiKeyResponse> {
    try {
      const headers = await this.getHeaders(token);
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || { code: 'CREATE_ERROR', message: 'Failed to create API key' },
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating API key:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  /**
   * Revoke (delete) an API key
   */
  async deleteApiKey(id: string, token?: string | null): Promise<DeleteApiKeyResponse> {
    try {
      const headers = await this.getHeaders(token);
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error || { code: 'DELETE_ERROR', message: 'Failed to delete API key' },
        };
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting API key:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }
}

// Export singleton instance
export const apiKeysService = new ApiKeysService();
