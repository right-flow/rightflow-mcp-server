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

interface RadioFieldProps {
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

export const RadioField = ({
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
}: RadioFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const options = field.options || ['אפשרות 1'];
  const spacing = field.spacing !== undefined ? field.spacing : 1;
  const orientation = field.orientation || 'vertical';

  // Calculate container dimensions based on orientation
  const containerWidth =
    orientation === 'horizontal'
      ? options.length * field.width + (options.length - 1) * spacing
      : field.width;
  const containerHeight =
    orientation === 'vertical'
      ? options.length * field.height + (options.length - 1) * spacing
      : field.height;

  // Convert PDF size to viewport size - calculate first, needed by handleDragStop
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = containerWidth * pointsToPixelsScale;
  const viewportHeight = containerHeight * pointsToPixelsScale;

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
  // So we need to convert the TOP of the field: field.y + containerHeight
  // IMPORTANT: Use containerHeight (full radio group), not field.height (single option)
  const pdfTopY = field.y + containerHeight; // Top of the ENTIRE radio group in PDF coordinates

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
        enableResizing={false} // Radio buttons have fixed size - no resize handles
        bounds="parent"
        className={cn(
          'field-marker field-marker-radio',
          'border-2 border-primary/50 bg-primary/5',
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected border-primary bg-primary/10',
          isHovered && 'field-marker-hovered border-primary/70',
          getConfidenceClassName(field.confidence, field.manuallyAdjusted),
          'group',
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
        {/* Radio buttons - display all options based on orientation */}
        <div
          className={cn('flex gap-0 pointer-events-none', orientation === 'vertical' ? 'flex-col' : 'flex-row')}
          style={{ gap: `${spacing * scale}px` }}
        >
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2" dir="rtl">
              <div
                className="border-2 rounded-full flex-shrink-0"
                style={{
                  borderColor: 'hsl(var(--field-radio))',
                  width: `${field.width * scale}px`,
                  height: `${field.height * scale}px`,
                }}
              />
              <span
                className="text-xs overflow-hidden text-ellipsis"
                style={{
                  color: 'hsl(var(--field-radio))',
                  maxWidth: orientation === 'horizontal' ? '100px' : '150px',
                  whiteSpace: 'nowrap',
                }}
              >
                {sanitizeUserInput(option)}
              </span>
            </div>
          ))}
        </div>

        {/* Field label (group name) */}
        {field.label && (
          <div
            className={cn(
              'absolute text-[10px] px-1 py-0.5 whitespace-nowrap outline-none',
              orientation === 'horizontal'
                ? 'bottom-full left-1/2 -translate-x-1/2 mb-1'  // מעל לאופקי
                : 'top-0 right-0',                                // מימין לאנכי
            )}
            style={{
              color: 'hsl(var(--field-radio))',
              backgroundColor: 'transparent',
              transform: orientation === 'vertical' ? 'translateX(100%)' : undefined,
            }}
            dir="rtl"
          >
            {sanitizeUserInput(field.label)}
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
          title="מחק קבוצת כפתורי רדיו"
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
