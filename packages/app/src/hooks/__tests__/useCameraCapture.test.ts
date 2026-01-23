import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCameraCapture } from '../useCameraCapture';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockMediaStream = {
  getTracks: vi.fn(() => [
    { stop: vi.fn(), kind: 'video' },
  ]),
};

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

describe('useCameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCameraCapture());

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.image).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.stream).toBeNull();
  });

  it('starts camera capture successfully', async () => {
    const { result } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    });
    expect(result.current.isCapturing).toBe(true);
    expect(result.current.stream).toBe(mockMediaStream);
    expect(result.current.error).toBeNull();
  });

  it('handles camera permission denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('NotAllowedError'));

    const { result } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture();
    });

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.error).toBe('Camera access denied. Please enable camera permissions.');
  });

  it('handles camera not found error', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('NotFoundError'));

    const { result } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture();
    });

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.error).toBe('No camera device found.');
  });

  it('captures image from video element', async () => {
    const { result } = renderHook(() => useCameraCapture());

    // Mock canvas and video
    const mockCanvas = document.createElement('canvas');
    const mockContext = {
      drawImage: vi.fn(),
    };
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any);
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    vi.spyOn(mockCanvas, 'toDataURL').mockReturnValue('data:image/png;base64,mock-image-data');

    const mockVideo = document.createElement('video');
    Object.defineProperties(mockVideo, {
      videoWidth: { value: 640, writable: true },
      videoHeight: { value: 480, writable: true },
    });

    await act(async () => {
      await result.current.startCapture();
    });

    await act(async () => {
      result.current.captureImage(mockVideo);
    });

    expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 480);
    expect(result.current.image).toBe('data:image/png;base64,mock-image-data');
  });

  it('stops camera capture and cleans up stream', async () => {
    const mockStop = vi.fn();
    const customMockStream = {
      getTracks: vi.fn(() => [{ stop: mockStop, kind: 'video' }]),
    };
    mockGetUserMedia.mockResolvedValue(customMockStream);

    const { result } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture();
    });

    expect(result.current.isCapturing).toBe(true);

    act(() => {
      result.current.stopCapture();
    });

    expect(mockStop).toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);
    expect(result.current.stream).toBeNull();
  });

  it('clears captured image', async () => {
    const { result } = renderHook(() => useCameraCapture());

    const mockCanvas = document.createElement('canvas');
    const mockContext = {
      drawImage: vi.fn(),
    };
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockContext as any);
    vi.spyOn(mockCanvas, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    const mockVideo = document.createElement('video');
    Object.defineProperties(mockVideo, {
      videoWidth: { value: 640, writable: true },
      videoHeight: { value: 480, writable: true },
    });

    await act(async () => {
      await result.current.startCapture();
      result.current.captureImage(mockVideo);
    });

    expect(result.current.image).toBeTruthy();

    act(() => {
      result.current.clearImage();
    });

    expect(result.current.image).toBeNull();
  });

  it('cleans up stream on unmount', async () => {
    const mockStop = vi.fn();
    const customMockStream = {
      getTracks: vi.fn(() => [{ stop: mockStop, kind: 'video' }]),
    };
    mockGetUserMedia.mockResolvedValue(customMockStream);

    const { result, unmount } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture();
    });

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it('allows specifying front camera', async () => {
    const { result } = renderHook(() => useCameraCapture());

    await act(async () => {
      await result.current.startCapture('user');
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user' },
      audio: false,
    });
  });
});
