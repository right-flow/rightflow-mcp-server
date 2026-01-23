/**
 * API Client Tests
 * Tests for authentication token handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from './client';

describe('ApiClient', () => {
  beforeEach(() => {
    // Reset token before each test
    apiClient.setAuthToken(null);
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('setAuthToken', () => {
    it('should store the authentication token', () => {
      const token = 'test-jwt-token-123';
      apiClient.setAuthToken(token);
      expect(apiClient.getAuthToken()).toBe(token);
    });

    it('should allow clearing the token by passing null', () => {
      apiClient.setAuthToken('test-token');
      expect(apiClient.getAuthToken()).toBe('test-token');

      apiClient.setAuthToken(null);
      expect(apiClient.getAuthToken()).toBe(null);
    });

    it('should overwrite existing token when setting a new one', () => {
      apiClient.setAuthToken('old-token');
      apiClient.setAuthToken('new-token');
      expect(apiClient.getAuthToken()).toBe('new-token');
    });
  });

  describe('getAuthToken', () => {
    it('should return null when no token is set', () => {
      expect(apiClient.getAuthToken()).toBe(null);
    });

    it('should return the current token when one is set', () => {
      const token = 'test-token';
      apiClient.setAuthToken(token);
      expect(apiClient.getAuthToken()).toBe(token);
    });
  });

  describe('authenticated requests', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = vi.fn();
    });

    it('should include Authorization header when token is set', async () => {
      const token = 'test-jwt-token';
      apiClient.setAuthToken(token);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { success: true } }),
      });

      await apiClient.get('/test-endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        }),
      );
    });

    it('should not include Authorization header when token is not set', async () => {
      // Ensure no token is set
      apiClient.setAuthToken(null);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { success: true } }),
      });

      await apiClient.get('/test-endpoint');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers).not.toHaveProperty('Authorization');
    });

    it('should work with POST requests', async () => {
      const token = 'test-jwt-token';
      apiClient.setAuthToken(token);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { id: '123' } }),
      });

      await apiClient.post('/test-endpoint', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        }),
      );
    });

    it('should work with PUT requests', async () => {
      const token = 'test-jwt-token';
      apiClient.setAuthToken(token);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { updated: true } }),
      });

      await apiClient.put('/test-endpoint/123', { data: 'updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        }),
      );
    });

    it('should work with DELETE requests', async () => {
      const token = 'test-jwt-token';
      apiClient.setAuthToken(token);

      // Mock successful response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: { deleted: true } }),
      });

      await apiClient.delete('/test-endpoint/123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`,
          }),
        }),
      );
    });
  });
});
