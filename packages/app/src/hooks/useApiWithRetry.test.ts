/**
 * Tests for useApiWithRetry Hook
 * Created: 2026-02-12
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApiWithRetry, fetchWithRetryStandalone } from './useApiWithRetry';

// Mock Clerk's useAuth
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console methods
const consoleSpy = {
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('useApiWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('successful requests', () => {
    it('should return data on successful fetch', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useApiWithRetry());

      let data: typeof mockData | undefined;
      await act(async () => {
        data = await result.current.fetchWithRetry<typeof mockData>('/api/test');
      });

      expect(data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include authorization header by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApiWithRetry());

      await act(async () => {
        await result.current.fetchWithRetry('/api/test');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should skip auth when skipAuth is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useApiWithRetry());

      await act(async () => {
        await result.current.fetchWithRetry('/api/test', { skipAuth: true });
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers.Authorization).toBeUndefined();
    });
  });

  describe('retry behavior', () => {
    it('should retry on 500 errors', async () => {
      const mockData = { success: true };

      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: () => Promise.resolve('Internal Server Error'),
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

      const { result } = renderHook(() => useApiWithRetry({ maxRetries: 3, baseDelayMs: 100 }));

      let data: typeof mockData | undefined;
      const fetchPromise = act(async () => {
        data = await result.current.fetchWithRetry<typeof mockData>('/api/test');
      });

      // Fast-forward through the retry delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      await fetchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(data).toEqual(mockData);
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockData = { success: true };

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers(),
          text: () => Promise.resolve('Rate Limited'),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockData),
        });

      const { result } = renderHook(() => useApiWithRetry({ maxRetries: 3, baseDelayMs: 100 }));

      const fetchPromise = act(async () => {
        await result.current.fetchWithRetry('/api/test');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      await fetchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        text: () => Promise.resolve('Unauthorized'),
      });

      const { result } = renderHook(() => useApiWithRetry({ maxRetries: 3 }));

      await act(async () => {
        await expect(result.current.fetchWithRetry('/api/test')).rejects.toThrow('HTTP 401');
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const mockData = { success: true };

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve(mockData),
        });

      const { result } = renderHook(() => useApiWithRetry({ maxRetries: 3, baseDelayMs: 100 }));

      const fetchPromise = act(async () => {
        await result.current.fetchWithRetry('/api/test');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      await fetchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries limit', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        text: () => Promise.resolve('Server Error'),
      });

      const { result } = renderHook(() => useApiWithRetry({ maxRetries: 2, baseDelayMs: 100 }));

      const fetchPromise = act(async () => {
        await expect(result.current.fetchWithRetry('/api/test')).rejects.toThrow('HTTP 500');
      });

      // Advance through all retry delays
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      await fetchPromise;

      // Initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('abort functionality', () => {
    it('should abort pending requests when abortAll is called', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useApiWithRetry());

      // Start fetch but don't await
      const fetchPromise = result.current.fetchWithRetry('/api/test');

      // Abort
      act(() => {
        result.current.abortAll();
      });

      await expect(fetchPromise).rejects.toThrow('Aborted');
    });
  });
});

describe('fetchWithRetryStandalone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should work without React context', async () => {
    const mockData = { success: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockData),
    });

    const data = await fetchWithRetryStandalone<typeof mockData>('/api/test');

    expect(data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on server errors', async () => {
    const mockData = { success: true };

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: new Headers(),
        text: () => Promise.resolve('Service Unavailable'),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData),
      });

    const fetchPromise = fetchWithRetryStandalone<typeof mockData>(
      '/api/test',
      {},
      { maxRetries: 3, baseDelayMs: 100 }
    );

    await vi.advanceTimersByTimeAsync(200);

    const data = await fetchPromise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(data).toEqual(mockData);
  });

  it('should use custom headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    });

    await fetchWithRetryStandalone('/api/test', {
      headers: {
        'X-Custom-Header': 'custom-value',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Header': 'custom-value',
        }),
      })
    );
  });
});
