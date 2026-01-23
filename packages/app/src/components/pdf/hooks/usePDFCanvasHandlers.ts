/**
 * PDF Canvas Event Handlers Hook
 * Manages mouse and keyboard event handlers for PDF canvas interactions
 */

import { useCallback, useEffect, MutableRefObject } from 'react';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getCanvasRelativeCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';
import { FieldDefinition } from '@/types/fields';

interface UsePDFCanvasHandlersProps {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  pageNumber: number;
  scale: number;
  canvasWidth: number;
  currentPageDimensions: { width: number; height: number } | undefined;
  currentPageFields: FieldDefinition[];
  justDraggedRef: MutableRefObject<boolean>;
  setShowDeleteConfirm: (show: boolean) => void;
}

export function usePDFCanvasHandlers({
  containerRef,
  pageNumber,
  scale,
  canvasWidth,
  currentPageDimensions,
  currentPageFields,
  justDraggedRef,
  setShowDeleteConfirm,
}: UsePDFCanvasHandlersProps) {
  const {
    activeTool,
    selectedFieldId,
    selectedFieldIds,
    isDragging,
    isMarqueeSelecting,
    dragStartX,
    dragStartY,
    marqueeStartX,
    marqueeStartY,
    marqueeEndX,
    marqueeEndY,
    addFieldWithUndo,
    deleteFieldWithUndo,
    selectField,
    clearSelection,
    selectMultipleFields,
    startDrag,
    updateDragPosition,
    endDrag,
    startMarquee,
    updateMarquee,
    endMarquee,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTemplateEditorStore();

  const { settings } = useSettingsStore();

  // Helper function to check if a field intersects with marquee rectangle (in viewport coords)
  const getFieldsInMarquee = useCallback(
    (marqueeX1: number, marqueeY1: number, marqueeX2: number, marqueeY2: number) => {
      if (!currentPageDimensions || !canvasWidth) return [];

      // Normalize marquee coordinates
      const mLeft = Math.min(marqueeX1, marqueeX2);
      const mRight = Math.max(marqueeX1, marqueeX2);
      const mTop = Math.min(marqueeY1, marqueeY2);
      const mBottom = Math.max(marqueeY1, marqueeY2);

      // Minimum marquee size to trigger selection (prevent accidental clicks)
      const minSize = 5;
      if (mRight - mLeft < minSize && mBottom - mTop < minSize) return [];

      const pointsToPixelsScale = canvasWidth / currentPageDimensions.width;

      return currentPageFields.filter((field) => {
        // Convert field PDF coords to viewport coords
        // PDF y is bottom of field, so we calculate top
        const pdfTopY = field.y + field.height;
        const viewportTopY = (currentPageDimensions.height - pdfTopY) * pointsToPixelsScale;
        const viewportX = field.x * pointsToPixelsScale;
        const viewportWidth = field.width * pointsToPixelsScale;
        const viewportHeight = field.height * pointsToPixelsScale;

        const fLeft = viewportX;
        const fRight = viewportX + viewportWidth;
        const fTop = viewportTopY;
        const fBottom = viewportTopY + viewportHeight;

        // Check intersection (any overlap)
        const intersects =
          mLeft < fRight && mRight > fLeft && mTop < fBottom && mBottom > fTop;

        return intersects;
      });
    },
    [currentPageFields, currentPageDimensions, canvasWidth],
  );

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current || !currentPageDimensions || !canvasWidth) return;

      // Ignore clicks on field markers
      const target = event.target as HTMLElement;
      if (target.closest('.field-marker')) return;

      const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);

      // Start drag for text field, dropdown, signature, or static text (drag-to-create)
      if ((activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field') && !isDragging) {
        startDrag(viewportCoords.x, viewportCoords.y);
        event.preventDefault();
        return;
      }

      // Start marquee selection in select mode
      if (activeTool === 'select' && !isMarqueeSelecting) {
        startMarquee(viewportCoords.x, viewportCoords.y);
        event.preventDefault();
        return;
      }
    },
    [
      activeTool,
      isDragging,
      isMarqueeSelecting,
      currentPageDimensions,
      canvasWidth,
      startDrag,
      startMarquee,
    ],
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current || !currentPageDimensions || !canvasWidth) return;

      // Skip if we just finished a drag operation
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        return;
      }

      // Ignore clicks on field markers
      const target = event.target as HTMLElement;
      if (target.closest('.field-marker')) return;

      // Deselect field when clicking on empty area in select mode
      if (activeTool === 'select') {
        selectField(null);
      }

      // Click-to-place for checkboxes and radio buttons only
      const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);

      // Click-to-place checkbox
      if (activeTool === 'checkbox-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'checkbox',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 10,
          width: 10,
          height: 10,
          name: '',
          required: false,
          autoFill: false,
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        return;
      }

      // Click-to-place radio button group
      if (activeTool === 'radio-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const buttonCount = settings.radioField.defaultButtonCount;
        const defaultOptions = Array.from({ length: buttonCount }, (_, i) => `אפשרות ${i + 1}`);

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'radio',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 10,
          width: 10,
          height: 10,
          name: '',
          required: false,
          autoFill: false,
          direction: 'rtl',
          radioGroup: '',
          options: defaultOptions,
          spacing: 1,
          orientation: settings.radioField.orientation,
        };

        addFieldWithUndo(newField);
        return;
      }

      // Click-to-place camera field
      if (activeTool === 'camera-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'camera',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 40,
          width: 120,
          height: 40,
          name: '',
          required: false,
          autoFill: false,
          label: 'צלם תמונה',
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        return;
      }

      // Click-to-place GPS location field
      if (activeTool === 'gps-location-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'gps-location',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 40,
          width: 120,
          height: 40,
          name: '',
          required: false,
          autoFill: false,
          label: 'קבל מיקום',
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        return;
      }

      // Click-to-place QR scanner field
      if (activeTool === 'qr-scan-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'qr-scan',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 40,
          width: 120,
          height: 40,
          name: '',
          required: false,
          autoFill: false,
          label: 'סרוק QR',
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        return;
      }

      // Click-to-place barcode scanner field
      if (activeTool === 'barcode-scan-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'barcode-scan',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 40,
          width: 120,
          height: 40,
          name: '',
          required: false,
          autoFill: false,
          label: 'סרוק ברקוד',
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        return;
      }
    },
    [
      activeTool,
      isDragging,
      pageNumber,
      currentPageDimensions,
      canvasWidth,
      scale,
      addFieldWithUndo,
      startDrag,
      selectField,
      settings,
    ],
  );

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current) return;

      // Handle drag for field creation
      if (isDragging && (activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field')) {
        const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);
        updateDragPosition(viewportCoords.x, viewportCoords.y);
        event.preventDefault();
        return;
      }

      // Handle marquee selection
      if (isMarqueeSelecting && activeTool === 'select') {
        const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);
        updateMarquee(viewportCoords.x, viewportCoords.y);
        event.preventDefault();
        return;
      }
    },
    [isDragging, isMarqueeSelecting, activeTool, updateDragPosition, updateMarquee],
  );

  const handleCanvasMouseUp = useCallback(
    (event: React.MouseEvent) => {
      // Handle marquee selection end
      if (isMarqueeSelecting && activeTool === 'select') {
        if (marqueeStartX !== null && marqueeStartY !== null && marqueeEndX !== null && marqueeEndY !== null) {
          const fieldsInMarquee = getFieldsInMarquee(marqueeStartX, marqueeStartY, marqueeEndX, marqueeEndY);
          if (fieldsInMarquee.length > 0) {
            selectMultipleFields(fieldsInMarquee.map((f) => f.id));
            justDraggedRef.current = true;
          }
        }
        endMarquee();
        return;
      }

      // Handle drag-to-create field
      if (!isDragging || (activeTool !== 'text-field' && activeTool !== 'dropdown-field' && activeTool !== 'signature-field' && activeTool !== 'static-text-field') || !containerRef.current) return;
      if (!currentPageDimensions || !canvasWidth || dragStartX === null || dragStartY === null)
        return;

      const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);

      // Calculate dimensions (absolute values work for any drag direction)
      const width = Math.abs(viewportCoords.x - dragStartX);
      const height = Math.abs(viewportCoords.y - dragStartY);

      // Apply minimum dimensions if drag was too small
      const minWidth = 50;
      const minHeight = 20;
      const finalWidth = Math.max(width, minWidth);
      const finalHeight = Math.max(height, minHeight);

      // Mark that we just completed a drag to prevent click handler from firing
      justDraggedRef.current = true;

      // Get top-left corner in viewport (accounting for any drag direction)
      const viewportX = Math.min(dragStartX, viewportCoords.x);
      const viewportTopY = Math.min(dragStartY, viewportCoords.y);

      // Convert TOP-left corner to PDF coordinates
      const pdfTopCoords = viewportToPDFCoords(
        viewportX,
        viewportTopY,
        currentPageDimensions,
        scale,
        canvasWidth,
      );

      // Convert width and height to PDF points
      const pixelsToPointsScale = currentPageDimensions.width / canvasWidth;
      const pdfWidth = finalWidth * pixelsToPointsScale;
      const pdfHeight = finalHeight * pixelsToPointsScale;

      // field.y should be the BOTTOM of the field in PDF coordinates
      const pdfBottomY = pdfTopCoords.y - pdfHeight;

      let newField: Omit<FieldDefinition, 'id'>;

      if (activeTool === 'dropdown-field') {
        newField = {
          type: 'dropdown',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY,
          width: pdfWidth,
          height: pdfHeight,
          name: '',
          required: false,
          autoFill: false,
          direction: settings.dropdownField.direction,
          font: settings.dropdownField.font,
          options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
        };
      } else if (activeTool === 'signature-field') {
        newField = {
          type: 'signature',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY,
          width: pdfWidth,
          height: pdfHeight,
          name: '',
          required: false,
          direction: 'ltr',
        };
      } else if (activeTool === 'static-text-field') {
        newField = {
          type: 'static-text',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY,
          width: pdfWidth,
          height: pdfHeight,
          name: '',
          required: false,
          direction: settings.textField.direction,
          content: 'טקסט סטטי',
          textAlign: settings.textField.direction === 'rtl' ? 'right' : 'left',
          fontSize: settings.textField.fontSize || 12,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textColor: '#000000',
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#9ca3af',
        };
      } else {
        newField = {
          type: 'text',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY,
          width: pdfWidth,
          height: pdfHeight,
          name: '',
          required: false,
          direction: settings.textField.direction,
          font: settings.textField.font,
          fontSize: settings.textField.fontSize,
        };
      }

      addFieldWithUndo(newField);
      endDrag();
    },
    [
      isDragging,
      isMarqueeSelecting,
      activeTool,
      dragStartX,
      dragStartY,
      marqueeStartX,
      marqueeStartY,
      marqueeEndX,
      marqueeEndY,
      pageNumber,
      currentPageDimensions,
      canvasWidth,
      scale,
      addFieldWithUndo,
      endDrag,
      endMarquee,
      selectMultipleFields,
      getFieldsInMarquee,
      settings,
    ],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
          console.log('↶ Undo (Ctrl+Z)');
        }
      }

      // Redo: Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) {
          redo();
          console.log('↷ Redo (Ctrl+Shift+Z)');
        }
      }

      // Copy: Ctrl+C (or Cmd+C on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedFieldId) {
        e.preventDefault();
        const { copyField } = useTemplateEditorStore.getState();
        copyField();
        console.log('📋 Field copied (Ctrl+C)');
      }

      // Paste: Ctrl+V (or Cmd+V on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const { pasteField, copiedField } = useTemplateEditorStore.getState();
        if (copiedField) {
          pasteField();
          console.log('📋 Field pasted (Ctrl+V)');
        }
      }

      // Delete key - delete selected field(s)
      if (e.key === 'Delete') {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (!isTyping) {
          // Multiple fields selected - show confirmation
          if (selectedFieldIds.length > 1) {
            e.preventDefault();
            setShowDeleteConfirm(true);
          }
          // Single field selected
          else if (selectedFieldId) {
            e.preventDefault();
            deleteFieldWithUndo(selectedFieldId);
          }
        }
      }

      // Escape key - deselect field or cancel dragging
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isDragging) {
          endDrag();
        } else if (selectedFieldIds.length > 0) {
          clearSelection();
        } else {
          selectField(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFieldId,
    selectedFieldIds,
    isDragging,
    deleteFieldWithUndo,
    selectField,
    clearSelection,
    endDrag,
    undo,
    redo,
    canUndo,
    canRedo,
    setShowDeleteConfirm,
  ]);

  // Global mouseup handler to catch releases outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      // Handle drag-to-create field cancellation
      if (isDragging && (activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field')) {
        if (!containerRef.current?.contains(event.target as Node)) {
          endDrag();
        }
      }

      // Handle marquee selection cancellation
      if (isMarqueeSelecting && activeTool === 'select') {
        if (!containerRef.current?.contains(event.target as Node)) {
          endMarquee();
        }
      }
    };

    if (isDragging || isMarqueeSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, isMarqueeSelecting, activeTool, endDrag, endMarquee]);

  return {
    handleCanvasMouseDown,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
