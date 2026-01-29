import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';
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
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected',
          isHovered && 'field-marker-hovered',
          getConfidenceClassName(field.confidence, field.manuallyAdjusted),
          'group flex items-center justify-center',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          cursor: 'move',
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

        {/* Delete button - small and offset to avoid interfering with drag */}
        <button
          className="absolute top-0 left-0 bg-destructive text-white rounded-full w-3.5 h-3.5 flex items-center justify-center hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transform: 'translate(-80%, -80%)' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          title="מחק תיבת סימון"
        >
          <X className="w-2.5 h-2.5" />
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
