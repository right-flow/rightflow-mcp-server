import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraField } from '../CameraField';
import type { FieldDefinition } from '@/types/fields';
import * as useCameraCaptureModule from '@/hooks/useCameraCapture';

// Mock useCameraCapture hook
const mockStartCapture = vi.fn();
const mockStopCapture = vi.fn();
const mockCaptureImage = vi.fn();
const mockClearImage = vi.fn();

const mockUseCameraCapture = vi.fn();

vi.spyOn(useCameraCaptureModule, 'useCameraCapture').mockImplementation(mockUseCameraCapture);

describe('CameraField', () => {
  const mockField: FieldDefinition = {
    id: 'camera-field-1',
    type: 'camera',
    name: 'photo',
    label: 'צלם תמונה',
    required: true,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    pageNumber: 1,
    direction: 'rtl',
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return value
    mockUseCameraCapture.mockReturnValue({
      isCapturing: false,
      image: null,
      error: null,
      stream: null,
      startCapture: mockStartCapture,
      stopCapture: mockStopCapture,
      captureImage: mockCaptureImage,
      clearImage: mockClearImage,
    });
  });

  it('renders with Hebrew label and RTL support', () => {
    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('צלם תמונה')).toBeInTheDocument();
    const container = screen.getByText('צלם תמונה').closest('div');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('shows camera button when no image captured', () => {
    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /פתח מצלמה/i })).toBeInTheDocument();
  });

  it('starts camera when button is clicked', async () => {
    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    const cameraButton = screen.getByRole('button', { name: /פתח מצלמה/i });
    fireEvent.click(cameraButton);

    expect(mockStartCapture).toHaveBeenCalled();
  });

  it('displays captured image', () => {
    mockUseCameraCapture.mockReturnValue({
      isCapturing: false,
      image: 'data:image/png;base64,test-image',
      error: null,
      stream: null,
      startCapture: mockStartCapture,
      stopCapture: mockStopCapture,
      captureImage: mockCaptureImage,
      clearImage: mockClearImage,
    });

    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,test-image');
  });

  it('shows required indicator when field is required', () => {
    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('allows clearing captured image', () => {
    mockUseCameraCapture.mockReturnValue({
      isCapturing: false,
      image: 'data:image/png;base64,test-image',
      error: null,
      stream: null,
      startCapture: mockStartCapture,
      stopCapture: mockStopCapture,
      captureImage: mockCaptureImage,
      clearImage: mockClearImage,
    });

    render(<CameraField field={mockField} value="data:image/png;base64,test-image" onChange={mockOnChange} />);

    const retakeButton = screen.getByRole('button', { name: /צלם שוב/i });
    fireEvent.click(retakeButton);

    expect(mockClearImage).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('displays camera error message', () => {
    mockUseCameraCapture.mockReturnValue({
      isCapturing: false,
      image: null,
      error: 'Camera access denied',
      stream: null,
      startCapture: mockStartCapture,
      stopCapture: mockStopCapture,
      captureImage: mockCaptureImage,
      clearImage: mockClearImage,
    });

    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/Camera access denied/i)).toBeInTheDocument();
  });

  it('shows video preview when capturing', () => {
    const mockStream = {} as MediaStream;
    mockUseCameraCapture.mockReturnValue({
      isCapturing: true,
      image: null,
      error: null,
      stream: mockStream,
      startCapture: mockStartCapture,
      stopCapture: mockStopCapture,
      captureImage: mockCaptureImage,
      clearImage: mockClearImage,
    });

    render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /צלם/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ביטול/i })).toBeInTheDocument();
  });

  it('works in light and dark mode', () => {
    const { rerender } = render(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    // Check for CSS variables that support theming
    const button = screen.getByRole('button', { name: /פתח מצלמה/i });

    // Should use theme-aware colors (bg-primary, text-primary, etc.)
    expect(button.className).toMatch(/bg-|text-/);

    // Dark mode should also work (components use CSS variables)
    document.documentElement.classList.add('dark');
    rerender(<CameraField field={mockField} value="" onChange={mockOnChange} />);

    expect(button.className).toMatch(/bg-|text-/);
    document.documentElement.classList.remove('dark');
  });
});
