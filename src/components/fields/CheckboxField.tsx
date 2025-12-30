import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';

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
  onSelect: (id: string) => void;
  onToggleSelection: (id: string) => void; // Multi-select support
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
}

export const CheckboxField = ({
  field,
  isSelected,
  scale,
  pageDimensions,
  canvasWidth,
  onSelect,
  onToggleSelection,
  onUpdate,
  onDelete,
  onDuplicate,
  onHover,
  isHovered,
}: CheckboxFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate dimensions first - needed by handleDragStop
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = field.width * pointsToPixelsScale;
  const viewportHeight = field.height * pointsToPixelsScale;

  const handleDragStop = (_e: any, d: { x: number; y: number }) => {
    // Validate position isn't negative or NaN
    if (d.x < 0 || d.y < 0 || isNaN(d.x) || isNaN(d.y)) {
      console.error('[CheckboxField] Invalid drag position detected:', d);
      return;
    }

    // d.x, d.y is the TOP-LEFT corner in viewport
    // Convert TOP-LEFT to PDF coordinates
    const pdfTopCoords = viewportToPDFCoords(
      d.x,
      d.y, // top of field
      pageDimensions,
      scale * 100,
      canvasWidth,
    );

    // Validate converted coordinates
    if (isNaN(pdfTopCoords.x) || isNaN(pdfTopCoords.y)) {
      console.error('[CheckboxField] Invalid PDF coordinates conversion:', { d, pdfTopCoords, scale, canvasWidth });
      return;
    }

    // field.y should be the BOTTOM - subtract height from top
    const pixelsToPointsScale = pageDimensions.width / canvasWidth;
    const pdfHeight = viewportHeight * pixelsToPointsScale;
    const pdfBottomY = pdfTopCoords.y - pdfHeight;

    // Ensure coordinates are within valid bounds (clamp to page dimensions)
    const clampedX = Math.max(0, Math.min(pdfTopCoords.x, pageDimensions.width - field.width));
    const clampedY = Math.max(0, Math.min(pdfBottomY, pageDimensions.height - field.height));

    onUpdate(field.id, {
      x: clampedX,
      y: clampedY, // Bottom edge in PDF coordinates
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

  const viewportTopCoords = pdfToViewportCoords(
    field.x,
    pdfTopY, // top of field
    pageDimensions,
    scale * 100,
    canvasWidth,
  );

  return (
    <>
      <Rnd
        position={{
          x: viewportTopCoords.x,
          y: viewportTopCoords.y, // Use TOP-LEFT for Rnd positioning
        }}
        size={{
          width: Math.max(viewportWidth, 24), // Minimum 24px for easier dragging
          height: Math.max(viewportHeight, 24), // Minimum 24px for easier dragging
        }}
        onDragStop={handleDragStop}
        enableResizing={false} // Checkboxes have fixed size - no resize handles
        bounds="parent"
        className={cn(
          'field-marker field-marker-checkbox',
          isSelected && 'field-marker-selected',
          isHovered && 'field-marker-hovered border-2 border-primary ring-2 ring-primary/20',
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
