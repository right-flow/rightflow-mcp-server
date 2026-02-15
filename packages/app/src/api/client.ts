/**
 * API Client
 * Simple HTTP client for backend communication
 */

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Simple API client wrapper around fetch
 */
class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    // Always use /api/v1 — works in both dev (Vite proxy) and prod (Railway)
    // Uses Express backend on port 3002
    this.baseURL = '/api/v1';
  }

  /**
   * Set authentication token for API requests
   * This should be called with the token from Clerk's getToken() method
   * before making authenticated API calls
   *
   * @param token - JWT token from Clerk or null to clear
   * @example
   * const { getToken } = useAuth();
   * const token = await getToken();
   * apiClient.setAuthToken(token);
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
    });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Make a generic request
   */
  private async request<T = any>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getDefaultHeaders(),
          ...options?.headers,
        },
      });

      // Parse response
      const data = await this.parseResponse(response);

      // Check if request was successful
      if (!response.ok) {
        // Handle error response - backend returns { error: { code, message } }
        const errorObj = data.error || {};
        throw {
          message: errorObj.message || data.message || 'Request failed',
          status: response.status,
          code: errorObj.code || data.code,
        } as ApiError;
      }

      return {
        data: data.data || data,
        success: true,
        message: data.message,
      };
    } catch (error) {
      // Network error or parse error
      if ((error as ApiError).status) {
        throw error;
      }

      throw {
        message: 'Network error or server unavailable',
        status: 0,
        code: 'NETWORK_ERROR',
      } as ApiError;
    }
  }

  /**
   * Parse response body
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  /**
   * Get default headers for all requests
   * Includes authentication token if available
   */
  private getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Add auth token if available (Clerk)
    // Token must be set via setAuthToken() before making authenticated requests
    // Example: apiClient.setAuthToken(await getToken())
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
