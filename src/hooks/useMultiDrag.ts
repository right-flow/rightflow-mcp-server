import { useRef, useCallback } from 'react';
import { FieldDefinition } from '@/types/fields';
import { viewportToPDFCoords } from '@/utils/pdfCoordinates';

interface PageDimensions {
  width: number;
  height: number;
}

interface UseMultiDragParams {
  field: FieldDefinition;
  selectedFieldIds: string[];
  scale: number;
  pageDimensions: PageDimensions;
  canvasWidth: number;
  viewportHeight: number;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onMultiDrag: (draggedFieldId: string, deltaX: number, deltaY: number) => void;
}

/**
 * Hook for handling multi-field dragging.
 * When a field that is part of a multi-selection is dragged,
 * all selected fields move together by the same delta.
 */
export function useMultiDrag({
  field,
  selectedFieldIds,
  scale,
  pageDimensions,
  canvasWidth,
  viewportHeight,
  onUpdate,
  onMultiDrag,
}: UseMultiDragParams) {
  // Store the initial viewport position when drag starts
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const isPartOfMultiSelection =
    selectedFieldIds.length > 1 && selectedFieldIds.includes(field.id);

  const handleDragStart = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      // Store initial viewport position
      dragStartRef.current = { x: d.x, y: d.y };
    },
    []
  );

  const handleDragStop = useCallback(
    (_e: any, d: { x: number; y: number }) => {
      // Compute fresh value inside callback to avoid stale closure
      const isPartOfMultiSelection =
        selectedFieldIds.length > 1 && selectedFieldIds.includes(field.id);

      // d.x, d.y is the TOP-LEFT corner in viewport after drag
      const pdfTopCoords = viewportToPDFCoords(
        d.x,
        d.y,
        pageDimensions,
        scale * 100,
        canvasWidth
      );

      const pixelsToPointsScale = pageDimensions.width / canvasWidth;
      const pdfHeight = viewportHeight * pixelsToPointsScale;
      const pdfBottomY = pdfTopCoords.y - pdfHeight;

      if (isPartOfMultiSelection && dragStartRef.current) {
        // Calculate delta in viewport pixels
        const viewportDeltaX = d.x - dragStartRef.current.x;
        const viewportDeltaY = d.y - dragStartRef.current.y;

        // Convert delta to PDF coordinates
        // Note: Y is inverted in PDF coordinates
        const pdfDeltaX = viewportDeltaX * pixelsToPointsScale;
        const pdfDeltaY = -viewportDeltaY * pixelsToPointsScale;

        // Call multi-drag handler with PDF delta
        onMultiDrag(field.id, pdfDeltaX, pdfDeltaY);
      } else {
        // Single field drag - update just this field
        onUpdate(field.id, {
          x: pdfTopCoords.x,
          y: pdfBottomY,
        });
      }

      // Reset drag start reference
      dragStartRef.current = null;
    },
    [
      field.id,
      selectedFieldIds,
      pageDimensions,
      scale,
      canvasWidth,
      viewportHeight,
      onUpdate,
      onMultiDrag,
    ]
  );

  return {
    handleDragStart,
    handleDragStop,
    isPartOfMultiSelection,
  };
}
