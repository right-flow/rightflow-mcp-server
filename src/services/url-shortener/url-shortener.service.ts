/**
 * URL Shortener Service
 * Generic service for URL shortening - can be integrated with various providers
 * Currently supports: ROO.bz (to be implemented), TinyURL (fallback)
 */

/**
 * URL Shortener Provider Interface
 * Implement this for different providers (ROO.bz, Bitly, etc.)
 */
export interface UrlShortenerProvider {
  name: string;
  shorten(url: string): Promise<ShortenResult>;
}

export interface ShortenResult {
  success: boolean;
  shortUrl?: string;
  error?: string;
}

/**
 * ROO.bz Provider (Premium Israeli service)
 * TODO: Implement when API documentation is available
 */
export class RooBzProvider implements UrlShortenerProvider {
  name = 'ROO.bz';
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    this.apiKey = process.env.ROOBZ_API_KEY || '';
    this.apiEndpoint = process.env.ROOBZ_API_ENDPOINT || 'https://api.roo.bz/shorten';

    if (!this.apiKey) {
      console.warn('ROO.bz API key not configured. URL shortening will not work.');
    }
  }

  async shorten(url: string): Promise<ShortenResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'ROO.bz API key not configured',
      };
    }

    try {
      // TODO: Replace with actual ROO.bz API call when documentation is available
      // For now, this is a placeholder implementation
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`ROO.bz API error: ${response.status}`);
      }

      const data = await response.json();

      // TODO: Adjust based on actual ROO.bz response format
      return {
        success: true,
        shortUrl: data.short_url || data.shortUrl || data.url,
      };
    } catch (error) {
      console.error('ROO.bz shortening error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shorten URL',
      };
    }
  }
}

/**
 * TinyURL Provider (Fallback - no API key required)
 * Uses public TinyURL API
 */
export class TinyUrlProvider implements UrlShortenerProvider {
  name = 'TinyURL';

  async shorten(url: string): Promise<ShortenResult> {
    try {
      const response = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
      );

      if (!response.ok) {
        throw new Error(`TinyURL API error: ${response.status}`);
      }

      const shortUrl = await response.text();

      return {
        success: true,
        shortUrl: shortUrl.trim(),
      };
    } catch (error) {
      console.error('TinyURL shortening error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to shorten URL',
      };
    }
  }
}

/**
 * Main URL Shortener Service
 */
export class UrlShortenerService {
  private providers: UrlShortenerProvider[];
  private primaryProvider: UrlShortenerProvider;

  constructor() {
    // Initialize providers
    this.providers = [
      new RooBzProvider(),
      new TinyUrlProvider(), // Fallback
    ];

    // Use ROO.bz as primary if configured, otherwise TinyURL
    const roobzConfigured = !!process.env.ROOBZ_API_KEY;
    this.primaryProvider = roobzConfigured
      ? this.providers[0]
      : this.providers[1];

    console.log(`[URL Shortener] Using provider: ${this.primaryProvider.name}`);
  }

  /**
   * Shorten a URL
   * Tries primary provider first, falls back to alternatives on failure
   */
  async shorten(url: string): Promise<ShortenResult> {
    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    // Try primary provider
    const result = await this.primaryProvider.shorten(url);
    if (result.success) {
      return result;
    }

    // Try fallback providers
    console.warn(
      `Primary provider (${this.primaryProvider.name}) failed: ${result.error}. Trying fallback...`
    );

    for (const provider of this.providers) {
      if (provider === this.primaryProvider) continue;

      const fallbackResult = await provider.shorten(url);
      if (fallbackResult.success) {
        console.log(`Fallback provider (${provider.name}) succeeded`);
        return fallbackResult;
      }
    }

    // All providers failed
    return {
      success: false,
      error: 'All URL shortening providers failed',
    };
  }

  /**
   * Get public form URL (for shortening)
   */
  getPublicFormUrl(slug: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/form/${slug}`;
  }

  /**
   * Shorten a form's public URL
   */
  async shortenFormUrl(slug: string): Promise<ShortenResult> {
    const publicUrl = this.getPublicFormUrl(slug);
    return this.shorten(publicUrl);
  }
}

// Export singleton instance
export const urlShortenerService = new UrlShortenerService();
