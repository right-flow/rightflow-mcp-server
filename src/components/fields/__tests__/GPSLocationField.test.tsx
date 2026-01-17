import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GPSLocationField } from '../GPSLocationField';
import type { FieldDefinition } from '@/types/fields';
import * as useGeolocationModule from '@/hooks/useGeolocation';

// Mock useGeolocation hook
const mockGetCurrentLocation = vi.fn();
const mockClearLocation = vi.fn();
const mockUseGeolocation = vi.fn();

vi.spyOn(useGeolocationModule, 'useGeolocation').mockImplementation(mockUseGeolocation);

describe('GPSLocationField', () => {
  const mockField: FieldDefinition = {
    id: 'gps-field-1',
    type: 'gps-location',
    name: 'location',
    label: 'מיקום GPS',
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
    mockUseGeolocation.mockReturnValue({
      isLoading: false,
      location: null,
      error: null,
      getCurrentLocation: mockGetCurrentLocation,
      clearLocation: mockClearLocation,
    });
  });

  it('renders with Hebrew label and RTL support', () => {
    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('מיקום GPS')).toBeInTheDocument();
    const container = screen.getByText('מיקום GPS').closest('div');
    expect(container).toHaveAttribute('dir', 'rtl');
  });

  it('shows get location button when no location captured', () => {
    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByRole('button', { name: /קבל מיקום/i })).toBeInTheDocument();
  });

  it('gets location when button is clicked', async () => {
    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    const locationButton = screen.getByRole('button', { name: /קבל מיקום/i });
    fireEvent.click(locationButton);

    expect(mockGetCurrentLocation).toHaveBeenCalled();
  });

  it('displays captured location', () => {
    mockUseGeolocation.mockReturnValue({
      isLoading: false,
      location: {
        latitude: 32.0853,
        longitude: 34.7818,
        accuracy: 10,
        timestamp: Date.now(),
      },
      error: null,
      getCurrentLocation: mockGetCurrentLocation,
      clearLocation: mockClearLocation,
    });

    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/32.0853/)).toBeInTheDocument();
    expect(screen.getByText(/34.7818/)).toBeInTheDocument();
  });

  it('shows required indicator when field is required', () => {
    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('allows clearing captured location', () => {
    mockUseGeolocation.mockReturnValue({
      isLoading: false,
      location: {
        latitude: 32.0853,
        longitude: 34.7818,
        accuracy: 10,
        timestamp: Date.now(),
      },
      error: null,
      getCurrentLocation: mockGetCurrentLocation,
      clearLocation: mockClearLocation,
    });

    render(<GPSLocationField field={mockField} value="32.0853,34.7818" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button', { name: /נקה/i });
    fireEvent.click(clearButton);

    expect(mockClearLocation).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('displays location error message', () => {
    mockUseGeolocation.mockReturnValue({
      isLoading: false,
      location: null,
      error: 'Location access denied',
      getCurrentLocation: mockGetCurrentLocation,
      clearLocation: mockClearLocation,
    });

    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/Location access denied/i)).toBeInTheDocument();
  });

  it('shows loading state while getting location', () => {
    mockUseGeolocation.mockReturnValue({
      isLoading: true,
      location: null,
      error: null,
      getCurrentLocation: mockGetCurrentLocation,
      clearLocation: mockClearLocation,
    });

    render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(screen.getByText(/מאתר מיקום/i)).toBeInTheDocument();
  });

  it('works in light and dark mode', () => {
    const { rerender } = render(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    const button = screen.getByRole('button', { name: /קבל מיקום/i });
    expect(button.className).toMatch(/bg-|text-/);

    document.documentElement.classList.add('dark');
    rerender(<GPSLocationField field={mockField} value="" onChange={mockOnChange} />);

    expect(button.className).toMatch(/bg-|text-/);
    document.documentElement.classList.remove('dark');
  });
});
