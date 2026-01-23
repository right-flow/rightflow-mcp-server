/**
 * URL Shortener Service
 * Uses ROO.bz Israeli URL shortening service
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
 * ROO.bz Provider (Israeli URL shortening service)
 */
export class RooBzProvider implements UrlShortenerProvider {
  name = 'ROO.bz';
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    // Support both browser (import.meta.env) and Node.js (process.env)
    // Check if running in Node.js environment
    const isNode = typeof process !== 'undefined' && process.env;

    if (isNode) {
      // Server-side (Node.js / API)
      this.apiKey = process.env.VITE_ROOBZ_API_KEY || '';
      this.apiEndpoint = process.env.VITE_ROOBZ_API_ENDPOINT || 'https://api.roo.bz/shorten';
    } else {
      // Client-side (Browser / Vite)
      this.apiKey = import.meta.env.VITE_ROOBZ_API_KEY || '';
      this.apiEndpoint = import.meta.env.VITE_ROOBZ_API_ENDPOINT || 'https://api.roo.bz/shorten';
    }

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
 * Main URL Shortener Service
 */
export class UrlShortenerService {
  private provider: RooBzProvider;

  constructor() {
    this.provider = new RooBzProvider();
    console.log(`[URL Shortener] Using ROO.bz service`);
  }

  /**
   * Shorten a URL using ROO.bz
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

    return this.provider.shorten(url);
  }

  /**
   * Get public form URL (for shortening)
   */
  getPublicFormUrl(slug: string): string {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${appUrl}/f/${slug}`;
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
