import { useState } from 'react';
import { Rnd } from 'react-rnd';
// X icon removed - using Unicode ✕ for tiny delete badge
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords } from '@/utils/pdfCoordinates';
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

interface CheckboxFieldProps {
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

export const CheckboxField = ({
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
}: CheckboxFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate dimensions first - needed by handleDragStop
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = field.width * pointsToPixelsScale;
  const viewportHeight = field.height * pointsToPixelsScale;

  // Multi-drag support
  const { handleDragStart, handleDragStop } = useMultiDrag({
    field,
    selectedFieldIds,
    scale,
    pageDimensions,
    canvasWidth,
    viewportHeight,
    onUpdate,
    onMultiDrag,
  });

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

  // Using Gemini's native box_2d format - no offset needed
  const viewportTopCoords = {
    x: rawViewportCoords.x,
    y: rawViewportCoords.y,
  };

  console.log('🟦 CheckboxField Rendering:', {
    fieldId: field.id,
    pdfCoords: { x: field.x, y: field.y, width: field.width, height: field.height },
    viewportCoords: viewportTopCoords,
    viewportSize: { width: viewportWidth, height: viewportHeight },
  });

  return (
    <>
      <Rnd
        key={`${field.id}-${field.x}-${field.y}-${field.width}-${field.height}`}
        default={{
          x: viewportTopCoords.x,
          y: viewportTopCoords.y,
          width: Math.max(viewportWidth, 24),
          height: Math.max(viewportHeight, 24),
        }}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        enableResizing={false} // Checkboxes have fixed size - no resize handles
        bounds="parent"
        className={cn(
          'field-marker field-marker-checkbox',
          'border-2 border-primary/50 bg-primary/5',
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected border-primary bg-primary/10',
          isHovered && 'field-marker-hovered border-primary/70',
          getConfidenceClassName(field.confidence, field.manuallyAdjusted),
          'group flex items-center justify-center',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          cursor: 'move',
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
        {/* Checkbox icon */}
        <div className="w-4 h-4 border-2 rounded-sm pointer-events-none" style={{ borderColor: 'hsl(var(--field-checkbox))' }} />

        {/* Field label (if exists) - truncated to 5 chars + ... */}
        {field.label && (
          <div
            className="absolute top-0 right-0 text-[10px] px-1 py-0.5 whitespace-nowrap"
            style={{
              color: 'hsl(var(--field-checkbox))',
              backgroundColor: 'transparent',
              transform: 'translateX(100%)',
            }}
            dir="rtl"
            title={sanitizeUserInput(field.label)}
          >
            {(() => {
              const label = sanitizeUserInput(field.label);
              return label.length > 5 ? label.slice(0, 5) + '...' : label;
            })()}
          </div>
        )}

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
          title="מחק תיבת סימון"
        >
          ✕
        </button>

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
