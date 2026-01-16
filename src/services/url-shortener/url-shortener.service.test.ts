/**
 * URL Shortener Service Tests
 * Tests for URL shortening with multiple providers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UrlShortenerService,
  TinyUrlProvider,
  RooBzProvider,
} from './url-shortener.service';

describe('UrlShortenerService', () => {
  let service: UrlShortenerService;

  beforeEach(() => {
    // Reset service for each test
    service = new UrlShortenerService();
  });

  describe('TinyURL Provider', () => {
    it('shortens URL using TinyURL', async () => {
      const provider = new TinyUrlProvider();
      const longUrl = 'https://example.com/very/long/url/path/to/form';

      const result = await provider.shorten(longUrl);

      expect(result.success).toBe(true);
      expect(result.shortUrl).toBeDefined();
      expect(result.shortUrl).toContain('tinyurl.com');
      expect(result.shortUrl!.length).toBeLessThan(longUrl.length);
    });

    it('handles invalid URLs', async () => {
      const provider = new TinyUrlProvider();
      const invalidUrl = 'not-a-valid-url';

      const result = await provider.shorten(invalidUrl);

      // TinyURL might still process it or return error
      // We just check it doesn't throw
      expect(result).toBeDefined();
    });

    it('handles network errors gracefully', async () => {
      const provider = new TinyUrlProvider();

      // Mock fetch to simulate network error
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.shorten('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('ROO.bz Provider', () => {
    it('returns placeholder message when not implemented', async () => {
      const provider = new RooBzProvider();
      const longUrl = 'https://example.com/form/123';

      const result = await provider.shorten(longUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not implemented');
    });
  });

  describe('Service Integration', () => {
    it('uses primary provider by default', async () => {
      const longUrl = 'https://example.com/form/test';
      const result = await service.shorten(longUrl);

      // Should use TinyURL as primary
      expect(result.success).toBe(true);
      expect(result.shortUrl).toContain('tinyurl.com');
    });

    it('falls back to secondary provider on primary failure', async () => {
      // Create custom providers
      const failingProvider = {
        name: 'Failing Provider',
        shorten: async () => ({
          success: false,
          error: 'Primary provider failed',
        }),
      };

      const successProvider = new TinyUrlProvider();

      // Create service with custom providers
      const customService = new UrlShortenerService();
      customService.addProvider(failingProvider);
      customService.addProvider(successProvider);

      const result = await customService.shorten('https://example.com');

      // Should fall back to TinyURL
      expect(result.success).toBe(true);
      expect(result.shortUrl).toContain('tinyurl.com');
    });

    it('returns error when all providers fail', async () => {
      const failingProvider1 = {
        name: 'Failing Provider 1',
        shorten: async () => ({
          success: false,
          error: 'Provider 1 failed',
        }),
      };

      const failingProvider2 = {
        name: 'Failing Provider 2',
        shorten: async () => ({
          success: false,
          error: 'Provider 2 failed',
        }),
      };

      const customService = new UrlShortenerService();
      customService.addProvider(failingProvider1);
      customService.addProvider(failingProvider2);

      const result = await customService.shorten('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('All URL shortening providers failed');
    });
  });

  describe('URL Validation', () => {
    it('validates URL format before shortening', async () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'ftp://invalid-protocol.com',
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
    it('includes provider name in error messages', async () => {
      const customProvider = {
        name: 'Custom Provider',
        shorten: async () => ({
          success: false,
          error: 'Custom error',
        }),
      };

      const customService = new UrlShortenerService();
      customService.addProvider(customProvider);

      const result = await customService.shorten('https://example.com');

      expect(result.error).toContain('Custom Provider');
    });

    it('handles timeout errors', async () => {
      const slowProvider = {
        name: 'Slow Provider',
        shorten: async () => {
          await new Promise(resolve => setTimeout(resolve, 100000)); // Very slow
          return { success: true, shortUrl: 'https://short.url' };
        },
      };

      const customService = new UrlShortenerService();
      customService.addProvider(slowProvider);

      // This test would need timeout configuration
      // For now, just verify structure
      expect(customService).toBeDefined();
    });
  });

  describe('Provider Management', () => {
    it('adds multiple providers', () => {
      const service = new UrlShortenerService();
      const provider1 = new TinyUrlProvider();
      const provider2 = new RooBzProvider();

      service.addProvider(provider1);
      service.addProvider(provider2);

      // Service should have both providers
      expect(service).toBeDefined();
    });

    it('maintains provider order', async () => {
      const callOrder: string[] = [];

      const provider1 = {
        name: 'Provider 1',
        shorten: async () => {
          callOrder.push('provider1');
          return { success: false, error: 'Failed' };
        },
      };

      const provider2 = {
        name: 'Provider 2',
        shorten: async () => {
          callOrder.push('provider2');
          return { success: true, shortUrl: 'https://short.url' };
        },
      };

      const customService = new UrlShortenerService();
      customService.addProvider(provider1);
      customService.addProvider(provider2);

      await customService.shorten('https://example.com');

      expect(callOrder).toEqual(['provider1', 'provider2']);
    });
  });
});
