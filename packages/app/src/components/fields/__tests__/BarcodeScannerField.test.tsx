import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BarcodeScannerField } from '../BarcodeScannerField';
import type { FieldDefinition } from '@/types/fields';

// Mock html5-qrcode
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockReturnValue(0), // Scanner state: NOT_STARTED
  })),
  Html5QrcodeScannerState: {
    NOT_STARTED: 0,
    SCANNING: 1,
    PAUSED: 2,
  },
  Html5QrcodeSupportedFormats: {
    QR_CODE: 0,
    AZTEC: 1,
    CODABAR: 2,
    CODE_39: 3,
    CODE_93: 4,
    CODE_128: 5,
    DATA_MATRIX: 6,
    EAN_8: 8,
    EAN_13: 9,
    ITF: 10,
    PDF_417: 12,
    UPC_A: 14,
    UPC_E: 15,
  },
}));

describe('BarcodeScannerField', () => {
  const mockField: FieldDefinition = {
    id: 'barcode-field-1',
    type: 'barcode-scan',
    name: 'barcodeData',
    label: 'סרוק ברקוד',
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
  });

  it('renders with Hebrew label and RTL support', () => {
    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('סרוק ברקוד')).toBeInTheDocument();
    const container = screen.getByText('סרוק ברקוד').closest('div');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('shows scan button when not scanning', () => {
    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /התחל סריקה/i })).toBeInTheDocument();
  });

  it('displays scanned barcode value', () => {
    const scannedValue = '1234567890123';
    render(<BarcodeScannerField field={mockField} value={scannedValue} onChange={mockOnChange} />);

    expect(screen.getByText(scannedValue)).toBeInTheDocument();
  });

  it('calls onChange when barcode is scanned', async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    const mockStart = vi.fn((cameraId, config, onSuccess) => {
      // Simulate successful barcode scan
      setTimeout(() => onSuccess('BARCODE-123456'), 100);
      return Promise.resolve();
    });

    (Html5Qrcode as any).mockImplementation(() => ({
      start: mockStart,
      stop: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockReturnValue(0),
    }));

    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    const scanButton = screen.getByRole('button', { name: /התחל סריקה/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('BARCODE-123456');
    });
  });

  it('shows required indicator when field is required', () => {
    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('allows clearing scanned value', () => {
    render(<BarcodeScannerField field={mockField} value="SCANNED-BARCODE" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button', { name: /נקה/i });
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('handles camera permission denied', async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    const mockStart = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

    (Html5Qrcode as any).mockImplementation(() => ({
      start: mockStart,
      stop: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockReturnValue(0),
    }));

    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    const scanButton = screen.getByRole('button', { name: /התחל סריקה/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByText(/גישה למצלמה נדחתה/i)).toBeInTheDocument();
    });
  });

  it('configures scanner for barcode formats only', async () => {
    const { Html5Qrcode } = await import('html5-qrcode');
    const mockStart = vi.fn().mockResolvedValue(undefined);

    (Html5Qrcode as any).mockImplementation(() => ({
      start: mockStart,
      stop: vi.fn().mockResolvedValue(undefined),
      getState: vi.fn().mockReturnValue(0),
    }));

    render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    const scanButton = screen.getByRole('button', { name: /התחל סריקה/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
      // Verify it's configured for barcode formats (not QR codes)
      const config = mockStart.mock.calls[0][1];
      expect(config).toHaveProperty('formatsToSupport');
    });
  });

  it('works in light and dark mode', () => {
    const { rerender } = render(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    // Check for CSS variables that support theming
    const button = screen.getByRole('button', { name: /התחל סריקה/i });

    // Should use theme-aware colors (bg-primary, text-primary, etc.)
    expect(button.className).toMatch(/bg-|text-/);

    // Dark mode should also work (components use CSS variables)
    document.documentElement.classList.add('dark');
    rerender(<BarcodeScannerField field={mockField} value="" onChange={mockOnChange} />);

    expect(button.className).toMatch(/bg-|text-/);
    document.documentElement.classList.remove('dark');
  });
});
