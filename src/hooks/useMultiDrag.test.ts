import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiDrag } from './useMultiDrag';
import { FieldDefinition } from '@/types/fields';

/**
 * useMultiDrag Hook Tests
 *
 * Tests for multi-field dragging functionality:
 * - Single field drag: Updates only the dragged field position
 * - Multi-field drag: Moves all selected fields by the same delta
 * - Coordinate conversion: Viewport pixels to PDF points
 */

// Standard A4 page dimensions in points
const A4_PAGE = { width: 595, height: 842 };

// Mock field for testing
const createMockField = (id: string, x = 100, y = 100): FieldDefinition => ({
  id,
  type: 'text',
  name: `Field ${id}`,
  x,
  y,
  width: 150,
  height: 20,
  page: 1,
  station: 'client',
});

describe('useMultiDrag', () => {
  let mockOnUpdate: ReturnType<typeof vi.fn>;
  let mockOnMultiDrag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
    mockOnMultiDrag = vi.fn();
  });

  describe('isPartOfMultiSelection', () => {
    it('returns false when field is not in selection', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-2', 'field-3'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      expect(result.current.isPartOfMultiSelection).toBe(false);
    });

    it('returns false when only one field is selected', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      expect(result.current.isPartOfMultiSelection).toBe(false);
    });

    it('returns true when field is part of multi-selection', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2', 'field-3'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      expect(result.current.isPartOfMultiSelection).toBe(true);
    });

    it('returns true when exactly two fields are selected', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      expect(result.current.isPartOfMultiSelection).toBe(true);
    });
  });

  describe('single field drag', () => {
    it('calls onUpdate with new position when dragging single field', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Simulate drag start
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      // Simulate drag stop at new position
      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 200 });
      });

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      expect(mockOnUpdate).toHaveBeenCalledWith('field-1', expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      }));
      expect(mockOnMultiDrag).not.toHaveBeenCalled();
    });

    it('calls onUpdate when field is not in selection', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-2', 'field-3'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      act(() => {
        result.current.handleDragStart(null, { x: 50, y: 50 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 100, y: 100 });
      });

      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      expect(mockOnMultiDrag).not.toHaveBeenCalled();
    });
  });

  describe('multi-field drag', () => {
    it('calls onMultiDrag when dragging field in multi-selection', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2', 'field-3'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 150 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledTimes(1);
      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('calculates correct PDF delta for horizontal drag', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595, // 1:1 scale
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Start at (100, 100), drag to (200, 100) - 100px right
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 200, y: 100 });
      });

      // At 1:1 scale, 100px = 100 points
      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(100, 1), // deltaX in PDF points
        expect.closeTo(0, 1)    // deltaY should be 0
      );
    });

    it('calculates correct PDF delta for vertical drag (Y inverted)', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595, // 1:1 scale
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Start at (100, 100), drag to (100, 200) - 100px down in viewport
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 100, y: 200 });
      });

      // In PDF coords, down in viewport = negative Y delta
      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(0, 1),     // deltaX should be 0
        expect.closeTo(-100, 1)   // deltaY negative (PDF Y is inverted)
      );
    });

    it('calculates correct delta with scaled canvas', () => {
      const field = createMockField('field-1');

      // 50% zoom - canvas is half the width
      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 0.5,
          pageDimensions: A4_PAGE,
          canvasWidth: 297.5, // Half of 595
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Drag 50px right at 50% zoom
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 100 });
      });

      // At 50% zoom, 50px viewport = 100 PDF points
      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(100, 1), // 50px * 2 = 100 points
        expect.closeTo(0, 1)
      );
    });

    it('calculates correct delta with 200% zoom', () => {
      const field = createMockField('field-1');

      // 200% zoom - canvas is double the width
      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 2,
          pageDimensions: A4_PAGE,
          canvasWidth: 1190, // Double of 595
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Drag 100px right at 200% zoom
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 200, y: 100 });
      });

      // At 200% zoom, 100px viewport = 50 PDF points
      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(50, 1), // 100px / 2 = 50 points
        expect.closeTo(0, 1)
      );
    });

    it('handles diagonal drag correctly', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Drag diagonally: 50px right, 30px down
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 130 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(50, 1),  // 50 points right
        expect.closeTo(-30, 1)  // 30 points down (negative in PDF)
      );
    });
  });

  describe('drag start reference tracking', () => {
    it('resets drag start reference after drag stop', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // First drag
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });
      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 150 });
      });

      // Second drag - should not be affected by first drag's start position
      act(() => {
        result.current.handleDragStart(null, { x: 200, y: 200 });
      });
      act(() => {
        result.current.handleDragStop(null, { x: 250, y: 200 });
      });

      // Second call should have delta of 50px, not delta from original position
      expect(mockOnMultiDrag).toHaveBeenCalledTimes(2);
      expect(mockOnMultiDrag).toHaveBeenNthCalledWith(
        2,
        'field-1',
        expect.closeTo(50, 1),
        expect.closeTo(0, 1)
      );
    });

    it('handles drag stop without drag start gracefully', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Call drag stop without drag start
      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 150 });
      });

      // Should not call onMultiDrag since there's no start reference
      expect(mockOnMultiDrag).not.toHaveBeenCalled();
      // Should fall back to single update
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  describe('selection changes during drag', () => {
    it('uses fresh selection state in handleDragStop', () => {
      const field = createMockField('field-1');
      let selectedIds = ['field-1'];

      const { result, rerender } = renderHook(
        ({ selectedFieldIds }) =>
          useMultiDrag({
            field,
            selectedFieldIds,
            scale: 1,
            pageDimensions: A4_PAGE,
            canvasWidth: 595,
            viewportHeight: 20,
            onUpdate: mockOnUpdate,
            onMultiDrag: mockOnMultiDrag,
          }),
        { initialProps: { selectedFieldIds: selectedIds } }
      );

      // Start drag with single selection
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      // Selection changes to multi-selection during drag
      selectedIds = ['field-1', 'field-2', 'field-3'];
      rerender({ selectedFieldIds: selectedIds });

      // Stop drag - should now use multi-drag because selection changed
      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 150 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledTimes(1);
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('updates isPartOfMultiSelection when selection changes', () => {
      const field = createMockField('field-1');

      const { result, rerender } = renderHook(
        ({ selectedFieldIds }) =>
          useMultiDrag({
            field,
            selectedFieldIds,
            scale: 1,
            pageDimensions: A4_PAGE,
            canvasWidth: 595,
            viewportHeight: 20,
            onUpdate: mockOnUpdate,
            onMultiDrag: mockOnMultiDrag,
          }),
        { initialProps: { selectedFieldIds: ['field-1'] } }
      );

      expect(result.current.isPartOfMultiSelection).toBe(false);

      // Change to multi-selection
      rerender({ selectedFieldIds: ['field-1', 'field-2'] });

      expect(result.current.isPartOfMultiSelection).toBe(true);

      // Change back to single
      rerender({ selectedFieldIds: ['field-1'] });

      expect(result.current.isPartOfMultiSelection).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero delta drag', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Start and stop at same position
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 100, y: 100 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(0, 0.01),
        expect.closeTo(0, 0.01)
      );
    });

    it('handles negative coordinates', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // Drag from positive to negative X (off canvas left)
      act(() => {
        result.current.handleDragStart(null, { x: 50, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: -50, y: 100 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(-100, 1), // -100 points left
        expect.closeTo(0, 1)
      );
    });

    it('handles very small movements', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1', 'field-2'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      // 1px movement
      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 101, y: 100 });
      });

      expect(mockOnMultiDrag).toHaveBeenCalledWith(
        'field-1',
        expect.closeTo(1, 0.1),
        expect.closeTo(0, 0.1)
      );
    });

    it('handles empty selection array', () => {
      const field = createMockField('field-1');

      const { result } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: [],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      expect(result.current.isPartOfMultiSelection).toBe(false);

      act(() => {
        result.current.handleDragStart(null, { x: 100, y: 100 });
      });

      act(() => {
        result.current.handleDragStop(null, { x: 150, y: 150 });
      });

      // Should use single update since not part of multi-selection
      expect(mockOnUpdate).toHaveBeenCalled();
      expect(mockOnMultiDrag).not.toHaveBeenCalled();
    });
  });

  describe('callback stability', () => {
    it('handleDragStart remains stable between renders', () => {
      const field = createMockField('field-1');

      const { result, rerender } = renderHook(() =>
        useMultiDrag({
          field,
          selectedFieldIds: ['field-1'],
          scale: 1,
          pageDimensions: A4_PAGE,
          canvasWidth: 595,
          viewportHeight: 20,
          onUpdate: mockOnUpdate,
          onMultiDrag: mockOnMultiDrag,
        })
      );

      const firstHandleDragStart = result.current.handleDragStart;

      rerender();

      expect(result.current.handleDragStart).toBe(firstHandleDragStart);
    });

    it('handleDragStop updates when dependencies change', () => {
      const field = createMockField('field-1');

      const { result, rerender } = renderHook(
        ({ selectedFieldIds }) =>
          useMultiDrag({
            field,
            selectedFieldIds,
            scale: 1,
            pageDimensions: A4_PAGE,
            canvasWidth: 595,
            viewportHeight: 20,
            onUpdate: mockOnUpdate,
            onMultiDrag: mockOnMultiDrag,
          }),
        { initialProps: { selectedFieldIds: ['field-1'] } }
      );

      const firstHandleDragStop = result.current.handleDragStop;

      // Change selectedFieldIds
      rerender({ selectedFieldIds: ['field-1', 'field-2'] });

      // handleDragStop should be a new function since selectedFieldIds changed
      expect(result.current.handleDragStop).not.toBe(firstHandleDragStop);
    });
  });
});

// Custom matcher for closeTo
expect.extend({
  closeTo(received: number, expected: number, precision = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be close to ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be close to ${expected} (precision: ${precision})`,
        pass: false,
      };
    }
  },
});

declare module 'vitest' {
  interface Assertion {
    closeTo(expected: number, precision?: number): void;
  }
  interface AsymmetricMatchersContaining {
    closeTo(expected: number, precision?: number): unknown;
  }
}
