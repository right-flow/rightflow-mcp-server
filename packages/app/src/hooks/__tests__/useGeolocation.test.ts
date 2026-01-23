import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

// Mock navigator.geolocation
const mockGetCurrentPosition = vi.fn();
const mockWatchPosition = vi.fn();
const mockClearWatch = vi.fn();

Object.defineProperty(global.navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: mockGetCurrentPosition,
    watchPosition: mockWatchPosition,
    clearWatch: mockClearWatch,
  },
});

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.location).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('gets current location successfully', async () => {
    const mockPosition = {
      coords: {
        latitude: 32.0853,
        longitude: 34.7818,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(result.current.location).toEqual({
      latitude: 32.0853,
      longitude: 34.7818,
      accuracy: 10,
      timestamp: mockPosition.timestamp,
    });
    expect(result.current.error).toBeNull();
  });

  it('handles location permission denied', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied geolocation',
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBe('Location access denied. Please enable location permissions.');
  });

  it('handles location unavailable error', async () => {
    const mockError = {
      code: 2, // POSITION_UNAVAILABLE
      message: 'Position unavailable',
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBe('Unable to determine location. Please try again.');
  });

  it('handles location timeout error', async () => {
    const mockError = {
      code: 3, // TIMEOUT
      message: 'Timeout',
    };

    mockGetCurrentPosition.mockImplementation((success, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).toBeNull();
    expect(result.current.error).toBe('Location request timed out. Please try again.');
  });

  it('sets loading state while fetching location', async () => {
    let resolvePosition: any;
    const positionPromise = new Promise((resolve) => {
      resolvePosition = resolve;
    });

    mockGetCurrentPosition.mockImplementation((success) => {
      positionPromise.then((pos) => success(pos));
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.getCurrentLocation();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePosition({
        coords: { latitude: 32, longitude: 34, accuracy: 10 },
        timestamp: Date.now(),
      });
      await positionPromise;
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('clears location data', async () => {
    const mockPosition = {
      coords: { latitude: 32.0853, longitude: 34.7818, accuracy: 10 },
      timestamp: Date.now(),
    };

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(result.current.location).not.toBeNull();

    act(() => {
      result.current.clearLocation();
    });

    expect(result.current.location).toBeNull();
  });

  it('uses high accuracy option', async () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 32, longitude: 34, accuracy: 5 },
        timestamp: Date.now(),
      });
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.getCurrentLocation();
    });

    expect(mockGetCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }),
    );
  });
});
