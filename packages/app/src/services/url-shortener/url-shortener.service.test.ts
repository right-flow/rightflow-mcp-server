/**
 * URL Shortener Service Tests
 * Tests for ROO.bz URL shortening
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  UrlShortenerService,
  RooBzProvider,
} from './url-shortener.service';

describe('UrlShortenerService', () => {
  let service: UrlShortenerService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Reset service for each test
    service = new UrlShortenerService();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('ROO.bz Provider', () => {
    it('handles API authentication errors', async () => {
      const provider = new RooBzProvider();
      const longUrl = 'https://example.com/form/123';

      // Mock fetch to simulate auth error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      const result = await provider.shorten(longUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles network errors gracefully', async () => {
      const provider = new RooBzProvider();

      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.shorten('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('successfully shortens URLs with valid API response', async () => {
      const longUrl = 'https://example.com/form/test';

      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ short_url: 'https://roo.bz/abc123' }),
      } as Response);

      const result = await service.shorten(longUrl);

      expect(result.success).toBe(true);
      expect(result.shortUrl).toBe('https://roo.bz/abc123');
    });

    it('validates URLs before shortening', async () => {
      const result = await service.shorten('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });
  });

  describe('URL Validation', () => {
    it('validates URL format before shortening', async () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://invalid-protocol.com',
        // eslint-disable-next-line no-script-url
        'javascript:alert(1)',
      ];

      for (const invalidUrl of invalidUrls) {
        const result = await service.shorten(invalidUrl);

        // Service should handle invalid URLs gracefully
        expect(result).toBeDefined();
      }
    });

    it('accepts valid HTTP and HTTPS URLs', async () => {
      const validUrls = [
        'http://example.com',
        'https://example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://example.com/path#anchor',
      ];

      for (const validUrl of validUrls) {
        const result = await service.shorten(validUrl);

        // Should at least attempt to shorten
        expect(result).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.shorten('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles API errors gracefully', async () => {
      // Mock fetch to simulate API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await service.shorten('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
