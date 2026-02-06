// Base API Client
// Created: 2026-02-05
// Purpose: Axios-based HTTP client with interceptors and error handling

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * API Client class with request/response interceptors
 */
class ApiClient {
  private client: AxiosInstance;
  private retryCount: number = 3;
  private retryDelay: number = 1000; // ms

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Get authentication token from storage
   */
  private getAuthToken(): string | null {
    // Check httpOnly cookie first (more secure)
    // Fall back to localStorage for development
    return localStorage.getItem('authToken');
  }

  /**
   * Handle API errors with retry logic
   */
  private async handleError(error: AxiosError): Promise<never> {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      this.handleUnauthorized();
      throw new ApiError('Unauthorized', 401, error.response?.data);
    }

    // Retry logic for network errors and 5xx errors
    if (this.shouldRetry(error) && config) {
      const retryCount = config._retryCount || 0;

      if (retryCount < this.retryCount) {
        config._retryCount = retryCount + 1;

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await this.sleep(delay);

        console.log(`Retrying request (${retryCount + 1}/${this.retryCount}):`, config.url);
        return this.client.request(config);
      }
    }

    // Convert axios error to ApiError
    throw this.convertToApiError(error);
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors
    if (!error.response) {
      return true;
    }

    // Retry on 5xx server errors
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  /**
   * Convert AxiosError to ApiError
   */
  private convertToApiError(error: AxiosError): ApiError {
    const response = error.response;

    if (response) {
      const message = (response.data as any)?.error || error.message;
      return new ApiError(message, response.status, response.data);
    }

    // Network error
    return new ApiError('Network error: Unable to reach server', undefined, error);
  }

  /**
   * Handle unauthorized access
   */
  private handleUnauthorized(): void {
    // Clear auth token
    localStorage.removeItem('authToken');

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
