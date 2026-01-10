import { useRef, useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { FieldOverlay } from '@/components/fields/FieldOverlay';
import { FieldPropertiesPanel } from '@/components/fields/FieldPropertiesPanel';
import { MultiSelectPropertiesPanel } from '@/components/fields/MultiSelectPropertiesPanel';
import { StaticTextPropertiesPanel } from '@/components/fields/StaticTextPropertiesPanel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getCanvasRelativeCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';
import { FieldDefinition } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFCanvasProps {
  file: File | null;
  pageNumber: number;
  scale: number;
  onLoadSuccess: (pdf: any) => void;
  onLoadError: (error: Error) => void;
  onPageRender: (page: any) => void;
}

export const PDFCanvas = ({
  file,
  pageNumber,
  scale,
  onLoadSuccess,
  onLoadError,
  onPageRender,
}: PDFCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const justDraggedRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const t = useTranslation();
  const direction = useDirection();

  // Zustand stores
  const {
    activeTool,
    fields,
    selectedFieldId,
    selectedFieldIds,
    isDragging,
    dragStartX,
    dragStartY,
    dragCurrentX,
    dragCurrentY,
    isMarqueeSelecting,
    marqueeStartX,
    marqueeStartY,
    marqueeEndX,
    marqueeEndY,
    pageDimensions,
    pdfDocument,
    addFieldWithUndo,
    updateField,
    updateFieldWithUndo,
    deleteFieldWithUndo,
    deleteMultipleFieldsWithUndo,
    selectField,
    toggleFieldSelection,
    clearSelection,
    selectMultipleFields,
    updateMultipleFields,
    moveMultipleFieldsByDelta,
    startDrag,
    updateDragPosition,
    endDrag,
    startMarquee,
    updateMarquee,
    endMarquee,
    hoveredFieldId,
    setHoveredField,
    setCanvasWidth: setStoreCanvasWidth,
    getFieldsForPage,
    undo,
    redo,
    canUndo,
    canRedo,
    pagesMetadata,
  } = useTemplateEditorStore();

  const { settings } = useSettingsStore();

  const currentPageFields = getFieldsForPage(pageNumber);
  const currentPageDimensions = pageDimensions[pageNumber];

  const handlePageLoadSuccess = useCallback(
    (page: any) => {
      // In react-pdf, page object has width/height properties directly
      const width = page.originalWidth || page.width;
      const height = page.originalHeight || page.height;

      const scaledWidth = width * (scale / 100);
      setCanvasWidth(scaledWidth);
      setStoreCanvasWidth(scaledWidth);

      // Store page dimensions for coordinate conversion
      onPageRender({ getSize: () => ({ width, height }) });
    },
    [scale, onPageRender, setStoreCanvasWidth],
  );

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current || !currentPageDimensions || !canvasWidth) return;

      // Ignore clicks on field markers
      const target = event.target as HTMLElement;
      if (target.closest('.field-marker')) return;

      const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);

      // Start drag for text field, dropdown, signature, or static text (drag-to-create)
      // But we'll check for minimum drag distance before creating
      if ((activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field') && !isDragging) {
        startDrag(viewportCoords.x, viewportCoords.y);
        event.preventDefault(); // Prevent text selection during drag
        return;
      }

      // Start marquee selection in select mode
      if (activeTool === 'select' && !isMarqueeSelecting) {
        startMarquee(viewportCoords.x, viewportCoords.y);
        event.preventDefault(); // Prevent text selection during marquee
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

      // NOTE: Click-to-place is now disabled for text and dropdown fields
      // Users should drag to create fields (mouse down → drag → mouse up)
      // This provides better control over field sizing

      // Deselect field when clicking on empty area in select mode
      if (activeTool === 'select') {
        selectField(null);
      }

      // Click-to-place for checkboxes and radio buttons only
      const viewportCoords = getCanvasRelativeCoords(event, containerRef.current);

      // Click-to-place text field with default dimensions (DISABLED - use drag instead)
      /*if (activeTool === 'text-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        console.log('[PDFCanvas] Text field click-to-place:');
        console.log('  Viewport coords:', viewportCoords);
        console.log('  PDF coords:', pdfCoords);
        console.log('  Page dimensions:', currentPageDimensions);
        console.log('  Canvas width:', canvasWidth);
        console.log('  Scale:', scale);

        // Default dimensions for click-to-place text field
        const defaultWidth = 200;
        const defaultHeight = 30;

        // COORDINATE SYSTEM - for drag-to-create in mouseUp handler
        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'text',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - defaultHeight, // Subtract height: pdfCoords.y is top, field.y is bottom
          width: defaultWidth,
          height: defaultHeight,
          name: '',
          required: false,
          autoFill: false,
          direction: settings.textField.direction,
          font: settings.textField.font,
          fontSize: settings.textField.fontSize,
        };

        console.log('  Field to create:', { x: newField.x, y: newField.y, width: newField.width, height: newField.height });
        addFieldWithUndo(newField);

        // Reset tool to select mode after creating field
        const { setActiveTool } = useTemplateEditorStore.getState();
        setActiveTool('select');
        return;
      }*/

      // Click-to-place dropdown with default dimensions (DISABLED - use drag instead)
      /*if (activeTool === 'dropdown-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        // Default dimensions for click-to-place dropdown
        const defaultWidth = 200;
        const defaultHeight = 30;

        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'dropdown',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - defaultHeight, // Subtract height: pdfCoords.y is top, field.y is bottom
          width: defaultWidth,
          height: defaultHeight,
          name: '',
          required: false,
          autoFill: false,
          direction: settings.dropdownField.direction,
          font: settings.dropdownField.font,
          options: ['אפשרות 1', 'אפשרות 2', 'אפשרות 3'],
        };

        addFieldWithUndo(newField);

        // Reset tool to select mode after creating field
        const { setActiveTool } = useTemplateEditorStore.getState();
        setActiveTool('select');
        return;
      }*/

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
          y: pdfCoords.y - 10, // Subtract height: pdfCoords.y is top, field.y is bottom
          width: 10,
          height: 10,
          name: '',
          required: false,
          autoFill: false,
          direction: 'rtl',
        };

        addFieldWithUndo(newField);
        // Keep tool active for multiple field creation
        return;
      }

      // Click-to-place radio button group (uses settings for defaults)
      if (activeTool === 'radio-field') {
        const pdfCoords = viewportToPDFCoords(
          viewportCoords.x,
          viewportCoords.y,
          currentPageDimensions,
          scale,
          canvasWidth,
        );

        const buttonCount = settings.radioField.defaultButtonCount;

        // Generate default options based on settings
        const defaultOptions = Array.from({ length: buttonCount }, (_, i) => `אפשרות ${i + 1}`);

        // Create radio group with settings-based defaults
        const newField: Omit<FieldDefinition, 'id'> = {
          type: 'radio',
          pageNumber,
          x: pdfCoords.x,
          y: pdfCoords.y - 10, // Subtract height: pdfCoords.y is top, field.y is bottom
          width: 10,
          height: 10,
          name: '',
          required: false,
          autoFill: false,
          direction: 'rtl',
          radioGroup: '', // Empty group name, user should set meaningful name
          options: defaultOptions,
          spacing: 1,
          orientation: settings.radioField.orientation,
        };

        addFieldWithUndo(newField);
        // Keep tool active for multiple field creation
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

  const handleCanvasMouseUp = useCallback(
    (event: React.MouseEvent) => {
      // Handle marquee selection end
      if (isMarqueeSelecting && activeTool === 'select') {
        if (marqueeStartX !== null && marqueeStartY !== null && marqueeEndX !== null && marqueeEndY !== null) {
          const fieldsInMarquee = getFieldsInMarquee(marqueeStartX, marqueeStartY, marqueeEndX, marqueeEndY);
          if (fieldsInMarquee.length > 0) {
            selectMultipleFields(fieldsInMarquee.map((f) => f.id));
            justDraggedRef.current = true; // Prevent click handler from firing
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

      console.log('=== DRAG TO CREATE DEBUG ===');
      console.log('Drag start:', { x: dragStartX, y: dragStartY });
      console.log('Drag end:', { x: viewportCoords.x, y: viewportCoords.y });
      console.log('Rectangle in viewport:');
      console.log('  Top-left:', { x: viewportX, y: viewportTopY });
      console.log('  Size:', { width: finalWidth, height: finalHeight });
      console.log('Page dimensions:', currentPageDimensions);
      console.log('Canvas width:', canvasWidth);

      // Convert TOP-left corner to PDF coordinates
      // viewportToPDFCoords flips the Y axis: viewport top -> PDF top
      const pdfTopCoords = viewportToPDFCoords(
        viewportX,
        viewportTopY,
        currentPageDimensions,
        scale,
        canvasWidth,
      );

      // Convert width and height to PDF points
      // Use the scale factor (pixels to points) consistently
      const pixelsToPointsScale = currentPageDimensions.width / canvasWidth;
      const pdfWidth = finalWidth * pixelsToPointsScale;
      const pdfHeight = finalHeight * pixelsToPointsScale;

      // field.y should be the BOTTOM of the field in PDF coordinates
      // pdfTopCoords.y is the TOP of the field, so subtract height to get bottom
      const pdfBottomY = pdfTopCoords.y - pdfHeight;

      console.log('Converted to PDF:');
      console.log('  PDF top coords:', pdfTopCoords);
      console.log('  PDF size:', { width: pdfWidth, height: pdfHeight });
      console.log('  PDF bottom Y (field.y):', pdfBottomY);

      // pdfBottomY is now the PDF Y of the bottom-left corner!
      let newField: Omit<FieldDefinition, 'id'>;

      if (activeTool === 'dropdown-field') {
        newField = {
          type: 'dropdown',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY, // Bottom edge in PDF coordinates
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
          y: pdfBottomY, // Bottom edge in PDF coordinates
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
          y: pdfBottomY, // Bottom edge in PDF coordinates
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
          textColor: '#000000', // Always black
          backgroundColor: 'transparent', // Default transparent
          borderWidth: 1,
          borderColor: '#9ca3af',
        };
      } else {
        newField = {
          type: 'text',
          pageNumber,
          x: pdfTopCoords.x,
          y: pdfBottomY, // Bottom edge in PDF coordinates
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

      // Keep tool active to allow creating multiple fields
      // User can press Escape or click select tool to stop
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
        console.log('📋 Field copied (Ctrl+Z)');
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
      // Only if not typing in an input/textarea
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
          endDrag(); // Cancel drag on Escape
        } else if (selectedFieldIds.length > 0) {
          clearSelection(); // Clear multi-selection first
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
  ]);

  // Global mouseup handler to catch releases outside canvas (fixes bug b)
  useEffect(() => {
    const handleGlobalMouseUp = (event: MouseEvent) => {
      // Handle drag-to-create field cancellation
      if (isDragging && (activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field')) {
        // If mouse released outside the canvas, just cancel the drag
        if (!containerRef.current?.contains(event.target as Node)) {
          endDrag(); // Cancel drag without creating field
        }
      }

      // Handle marquee selection cancellation
      if (isMarqueeSelecting && activeTool === 'select') {
        // If mouse released outside the canvas, cancel the marquee
        if (!containerRef.current?.contains(event.target as Node)) {
          endMarquee(); // Cancel marquee without selecting
        }
      }
    };

    if (isDragging || isMarqueeSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, isMarqueeSelecting, activeTool, endDrag, endMarquee]);

  if (!file) {
    return null;
  }

  return (
    <div className="flex justify-center items-center p-4">
      <div
        ref={containerRef}
        className="relative"
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        style={{
          cursor:
            activeTool === 'text-field' || activeTool === 'dropdown-field' || activeTool === 'signature-field' || activeTool === 'static-text-field'
              ? 'crosshair'
              : activeTool === 'checkbox-field' || activeTool === 'radio-field'
                ? 'copy' // Plus icon cursor for click-to-place
                : 'default', // Arrow for select mode
        }}
      >
        <Document
          file={file}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={<div className="text-muted-foreground">טוען PDF...</div>}
          error={<div className="text-destructive">שגיאה בטעינת PDF</div>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale / 100}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
            loading={<div className="text-muted-foreground">טוען עמוד...</div>}
            onLoadSuccess={handlePageLoadSuccess}
          />
        </Document>

        {/* Page Metadata - Guidance Texts */}
        {canvasWidth > 0 && currentPageDimensions && pagesMetadata[pageNumber]?.guidanceTexts.map((gt) => {
          const pointsToPixelsScale = canvasWidth / currentPageDimensions.width;
          const pdfTopY = gt.y + gt.height;
          const viewportTopCoords = {
            x: gt.x * pointsToPixelsScale,
            y: (currentPageDimensions.height - pdfTopY) * pointsToPixelsScale
          };

          return (
            <div
              key={gt.id}
              className="absolute border border-amber-300 bg-amber-100/20 pointer-events-none p-1 text-[10px] overflow-hidden text-amber-800 italic"
              style={{
                left: viewportTopCoords.x,
                top: viewportTopCoords.y,
                width: gt.width * pointsToPixelsScale,
                height: gt.height * pointsToPixelsScale,
                zIndex: 50,
              }}
              title={gt.content}
            >
              {gt.content}
            </div>
          );
        })}

        {/* Field overlay */}
        {canvasWidth > 0 && currentPageDimensions && (
          <FieldOverlay
            fields={currentPageFields}
            selectedFieldId={selectedFieldId}
            selectedFieldIds={selectedFieldIds}
            scale={scale}
            pageDimensions={currentPageDimensions}
            canvasWidth={canvasWidth}
            onFieldSelect={selectField}
            onToggleFieldSelection={toggleFieldSelection}
            onFieldUpdate={updateField}
            onFieldDelete={deleteFieldWithUndo}
            onFieldDuplicate={(id) => {
              const { duplicateField } = useTemplateEditorStore.getState();
              duplicateField(id);
            }}
            onMultiDrag={(_draggedFieldId, deltaX, deltaY) => {
              moveMultipleFieldsByDelta(deltaX, deltaY);
            }}
            hoveredFieldId={hoveredFieldId}
            onFieldHover={setHoveredField}
          />
        )}

        {/* Drag preview for text field */}
        {isDragging &&
          dragStartX !== null &&
          dragStartY !== null &&
          dragCurrentX !== null &&
          dragCurrentY !== null && (
            <div
              className="absolute border-2 border-dashed pointer-events-none"
              style={{
                borderColor: 'hsl(var(--field-text))',
                left: Math.min(dragStartX, dragCurrentX),
                top: Math.min(dragStartY, dragCurrentY),
                width: Math.abs(dragCurrentX - dragStartX),
                height: Math.abs(dragCurrentY - dragStartY),
              }}
            />
          )}

        {/* Marquee selection preview */}
        {isMarqueeSelecting &&
          marqueeStartX !== null &&
          marqueeStartY !== null &&
          marqueeEndX !== null &&
          marqueeEndY !== null && (
            <div
              className="absolute border-2 border-dashed pointer-events-none bg-primary/10"
              style={{
                borderColor: 'hsl(var(--primary))',
                left: Math.min(marqueeStartX, marqueeEndX),
                top: Math.min(marqueeStartY, marqueeEndY),
                width: Math.abs(marqueeEndX - marqueeStartX),
                height: Math.abs(marqueeEndY - marqueeStartY),
              }}
            />
          )}
      </div>

      {/* Multi-Select Properties Panel */}
      {selectedFieldIds.length > 1 && (() => {
        const selectedFields = fields.filter(f => selectedFieldIds.includes(f.id));
        if (selectedFields.length === 0) return null;

        return (
          <MultiSelectPropertiesPanel
            selectedFields={selectedFields}
            onUpdateAll={(updates) => updateMultipleFields(selectedFieldIds, updates)}
            onClose={clearSelection}
          />
        );
      })()}

      {/* Single Field Properties Panel */}
      {selectedFieldIds.length <= 1 && selectedFieldId && (() => {
        const selectedField = fields.find(f => f.id === selectedFieldId);
        if (!selectedField) return null;

        // Static text fields use a different properties panel
        if (selectedField.type === 'static-text') {
          return (
            <StaticTextPropertiesPanel
              field={selectedField}
              pdfDocument={pdfDocument}
              pageNumber={pageNumber}
              onUpdate={(updates) => updateFieldWithUndo(selectedFieldId, updates)}
              onClose={() => selectField(null)}
            />
          );
        }

        return (
          <FieldPropertiesPanel
            field={selectedField}
            onUpdate={(updates) => updateFieldWithUndo(selectedFieldId, updates)}
            onClose={() => selectField(null)}
          />
        );
      })()}

      {/* Multi-Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t.deleteConfirmTitle}
        message={t.deleteConfirmMessage.replace('{count}', String(selectedFieldIds.length))}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        variant="danger"
        direction={direction}
        onConfirm={() => {
          deleteMultipleFieldsWithUndo(selectedFieldIds);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
