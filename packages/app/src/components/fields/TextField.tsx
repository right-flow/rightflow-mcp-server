import { useState } from 'react';
import { Rnd } from 'react-rnd';
// X icon removed - using Unicode ✕ for tiny delete badge
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';
import { useMultiDrag } from '@/hooks/useMultiDrag';
import {
  getConfidenceClassName,
  getConfidenceBadgeClassName,
  getConfidenceLabel,
  formatConfidencePercent,
} from '@/utils/fieldConfidence';

interface PageDimensions {
  width: number;
  height: number;
}

interface TextFieldProps {
  field: FieldDefinition;
  isSelected: boolean;
  scale: number;
  pageDimensions: PageDimensions;
  canvasWidth: number;
  selectedFieldIds: string[];
  onSelect: (id: string) => void;
  onToggleSelection: (id: string) => void; // Multi-select support
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMultiDrag: (draggedFieldId: string, deltaX: number, deltaY: number) => void;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
}

export const TextField = ({
  field,
  isSelected,
  scale,
  pageDimensions,
  canvasWidth,
  selectedFieldIds,
  onSelect,
  onToggleSelection,
  onUpdate,
  onDelete,
  onDuplicate,
  onMultiDrag,
  onHover,
  isHovered,
}: TextFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate dimensions first - needed by handleDragStop and handleResizeStop
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = field.width * pointsToPixelsScale;
  const viewportHeight = field.height * pointsToPixelsScale;

  // Multi-drag support
  const { handleDragStart, handleDrag, handleDragStop } = useMultiDrag({
    field,
    selectedFieldIds,
    scale,
    pageDimensions,
    canvasWidth,
    viewportHeight,
    onUpdate,
    onMultiDrag,
  });

  const handleResizeStop = (
    _e: any,
    _direction: any,
    ref: HTMLElement,
    _delta: any,
    position: { x: number; y: number },
  ) => {
    // Convert size from pixels to PDF points
    const pixelsToPointsScale = pageDimensions.width / canvasWidth;
    const pdfWidth = parseInt(ref.style.width) * pixelsToPointsScale;
    const pdfHeight = parseInt(ref.style.height) * pixelsToPointsScale;

    // position.x, position.y is the TOP-LEFT corner in viewport
    // Convert TOP-LEFT to PDF coordinates
    const pdfTopCoords = viewportToPDFCoords(
      position.x,
      position.y, // top of field
      pageDimensions,
      scale * 100,
      canvasWidth,
    );

    // field.y should be the BOTTOM - subtract height from top
    const pdfBottomY = pdfTopCoords.y - pdfHeight;

    onUpdate(field.id, {
      width: pdfWidth,
      height: pdfHeight,
      x: pdfTopCoords.x,
      y: pdfBottomY, // Bottom edge in PDF coordinates
      manuallyAdjusted: true, // Mark as manually adjusted (Layer 5)
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(field.id);
  };

  // Convert PDF coordinates to viewport coordinates for rendering
  // field.y is the BOTTOM of the field in PDF, but Rnd needs TOP-LEFT
  // So we need to convert the TOP of the field: field.y + field.height
  const pdfTopY = field.y + field.height; // Top of field in PDF coordinates

  const rawViewportCoords = pdfToViewportCoords(
    field.x,
    pdfTopY, // top of field
    pageDimensions,
    scale * 100,
    canvasWidth,
  );

  // Using Gemini's native box_2d format (0-1000 scale) - no offset needed
  // The native format is what Gemini is trained on and provides better accuracy
  const viewportTopCoords = {
    x: rawViewportCoords.x,
    y: rawViewportCoords.y,
  };

  return (
    <>
      <Rnd
        key={`${field.id}-${field.x}-${field.y}-${field.width}-${field.height}`}
        default={{
          x: viewportTopCoords.x,
          y: viewportTopCoords.y,
          width: viewportWidth,
          height: viewportHeight,
        }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        enableUserSelectHack={false}
        minWidth={25 * scale}
        minHeight={20 * scale}
        bounds="parent"
        className={cn(
          'field-marker field-marker-text',
          'border-2 border-primary/50 bg-primary/5',
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected border-primary bg-primary/10',
          isHovered && 'field-marker-hovered border-primary/70',
          getConfidenceClassName(field.confidence, field.manuallyAdjusted),
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          pointerEvents: 'auto', // Re-enable pointer events (parent has pointer-events-none)
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            onToggleSelection(field.id);
          } else {
            onSelect(field.id);
          }
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => onHover?.(field.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        {/* Field label - single line, no wrap, truncated to field width */}
        <div
          className="absolute top-0 right-0 text-[10px] px-1 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{
            color: 'hsl(var(--field-text))',
            backgroundColor: 'transparent',
            maxWidth: '100%',
          }}
          dir="rtl"
          title={sanitizeUserInput(field.label || field.name) || 'שדה טקסט'}
        >
          {sanitizeUserInput(field.label || field.name) || 'שדה טקסט'}
        </div>

        {/* Delete X - 20% of field height, positioned above top-left corner */}
        <button
          className="absolute text-destructive hover:text-destructive/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-[1001] leading-none"
          style={{
            bottom: '100%',
            left: '-4px',
            transform: 'translateY(-2px)',
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: `${Math.max(10, viewportHeight * 0.2)}px`,
            lineHeight: 1,
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(field.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="מחק שדה"
        >
          ✕
        </button>

        {/* Field content preview */}
        {field.defaultValue && (
          <div className="text-xs text-muted-foreground p-1 truncate" dir={field.direction}>
            {sanitizeUserInput(field.defaultValue)}
          </div>
        )}

        {/* Confidence badge - shows on hover/select for AI-detected fields */}
        {field.confidence && !field.manuallyAdjusted && (
          <div
            className={getConfidenceBadgeClassName(field.confidence)}
            title={getConfidenceLabel(field.confidence)}
          >
            {formatConfidencePercent(field.confidence)}
          </div>
        )}
      </Rnd>

      {/* Context Menu */}
      {contextMenu && (
        <FieldContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDuplicate={() => onDuplicate(field.id)}
          onDelete={() => onDelete(field.id)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};
