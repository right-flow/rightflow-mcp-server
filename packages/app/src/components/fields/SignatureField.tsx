import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { PenTool } from 'lucide-react';
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

interface SignatureFieldProps {
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

export const SignatureField = ({
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
}: SignatureFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate viewport height for multi-drag hook (declared early for hook dependency)
  const pointsToPixelsScaleEarly = canvasWidth / pageDimensions.width;
  const viewportHeightEarly = field.height * pointsToPixelsScaleEarly;

  // Multi-drag support
  const { handleDragStart, handleDragStop } = useMultiDrag({
    field,
    selectedFieldIds,
    scale,
    pageDimensions,
    canvasWidth,
    viewportHeight: viewportHeightEarly,
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

  // Convert PDF size to viewport size first
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = field.width * pointsToPixelsScale;
  const viewportHeight = field.height * pointsToPixelsScale;

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

  // Using Gemini's native box_2d format - no offset needed
  const viewportTopCoords = {
    x: rawViewportCoords.x,
    y: rawViewportCoords.y,
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Compute station-based border color (fixes CSS override bug)
  const stationBorderColor = field.station === 'agent'
    ? 'hsl(var(--field-station-agent))'
    : 'hsl(var(--field-station-client))';

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
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        minWidth={80 * scale}
        minHeight={40 * scale}
        bounds="parent"
        className={cn(
          'field-marker field-marker-signature',
          'border-2 border-primary/50 bg-primary/5',
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected border-primary bg-primary/10',
          isHovered && 'field-marker-hovered border-primary/70',
          getConfidenceClassName(field.confidence, field.manuallyAdjusted),
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          backgroundColor: field.signatureImage ? 'transparent' : 'hsl(var(--signature-bg) / 0.05)',
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
        {/* Field label */}
        <div
          className="absolute top-0 right-0 text-[10px] px-1 py-0.5"
          style={{
            color: 'hsl(var(--field-text))',
            backgroundColor: 'transparent',
          }}
          dir="rtl"
        >
          {sanitizeUserInput(field.label || field.name) || 'חתימה'}
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

        {/* Field content */}
        <div className="w-full h-full flex flex-col items-center justify-center p-2">
          {field.signatureImage ? (
            <>
              {/* Signature image */}
              <img
                src={field.signatureImage}
                alt="Signature"
                className="max-w-full max-h-full object-contain"
                style={{ filter: 'brightness(0)' }}
              />
              {/* Timestamp below signature */}
              {field.signatureTimestamp && (
                <div className="text-[8px] text-muted-foreground mt-1">
                  {formatTimestamp(field.signatureTimestamp)}
                </div>
              )}
            </>
          ) : (
            // Empty state - placeholder
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <PenTool className="w-6 h-6 mb-1 opacity-40" />
              <span className="text-xs opacity-60">חתימה</span>
            </div>
          )}
        </div>

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
