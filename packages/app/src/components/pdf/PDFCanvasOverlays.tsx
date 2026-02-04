/**
 * PDF Canvas Overlays Component
 * Renders all overlay elements on the PDF canvas (guidance texts, fields, drag preview, marquee)
 */

import { FieldOverlay } from '@/components/fields/FieldOverlay';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { FieldDefinition } from '@/types/fields';
import { ExtractionProgressOverlay } from '@/components/pdf/ExtractionProgressOverlay';

interface PDFCanvasOverlaysProps {
  pageNumber: number;
  canvasWidth: number;
  currentPageDimensions: { width: number; height: number } | undefined;
  currentPageFields: FieldDefinition[];
  scale: number;
  onFieldUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onFieldDelete: (id: string) => void;
}

export const PDFCanvasOverlays = ({
  pageNumber,
  canvasWidth,
  currentPageDimensions,
  currentPageFields,
  scale,
  onFieldUpdate,
  onFieldDelete,
}: PDFCanvasOverlaysProps) => {
  const {
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
    pagesMetadata,
    selectField,
    toggleFieldSelection,
    moveMultipleFieldsByDelta,
    hoveredFieldId,
    setHoveredField,
    duplicateField,
  } = useTemplateEditorStore();

  if (!currentPageDimensions || canvasWidth === 0) {
    return null;
  }

  const pointsToPixelsScale = canvasWidth / currentPageDimensions.width;

  return (
    <>
      {/* Page Metadata - Guidance Texts */}
      {pagesMetadata[pageNumber]?.guidanceTexts.map((gt) => {
        const pdfTopY = gt.y + gt.height;
        const viewportTopCoords = {
          x: gt.x * pointsToPixelsScale,
          y: (currentPageDimensions.height - pdfTopY) * pointsToPixelsScale,
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
      <FieldOverlay
        fields={currentPageFields}
        selectedFieldId={selectedFieldId}
        selectedFieldIds={selectedFieldIds}
        scale={scale}
        pageDimensions={currentPageDimensions}
        canvasWidth={canvasWidth}
        onFieldSelect={selectField}
        onToggleFieldSelection={toggleFieldSelection}
        onFieldUpdate={onFieldUpdate}
        onFieldDelete={onFieldDelete}
        onFieldDuplicate={(id) => duplicateField(id)}
        onMultiDrag={(_draggedFieldId, deltaX, deltaY) => {
          moveMultipleFieldsByDelta(deltaX, deltaY);
        }}
        hoveredFieldId={hoveredFieldId}
        onFieldHover={setHoveredField}
      />

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

      {/* AI Extraction Progress Overlay (NEW) */}
      <ExtractionProgressOverlay />
    </>
  );
};
