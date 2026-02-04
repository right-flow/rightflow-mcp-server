import { useState } from 'react';
import { Rnd } from 'react-rnd';
// X icon removed - using Unicode ✕ for tiny delete badge
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';
import { useMultiDrag } from '@/hooks/useMultiDrag';

interface PageDimensions {
  width: number;
  height: number;
}

interface StaticTextFieldProps {
  field: FieldDefinition;
  isSelected: boolean;
  scale: number;
  pageDimensions: PageDimensions;
  canvasWidth: number;
  selectedFieldIds: string[];
  onSelect: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMultiDrag: (draggedFieldId: string, deltaX: number, deltaY: number) => void;
  onHover?: (id: string | null) => void;
  isHovered?: boolean;
}

export const StaticTextField = ({
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
}: StaticTextFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate dimensions first - needed by handleDragStop and handleResizeStop
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

  // BUG FIX: Check for undefined/null instead of truthiness to allow borderWidth = 0
  // Station-based border colors: blue for client, orange for agent
  const stationBorderColor = field.station === 'agent' ? '#f97316' : '#3b82f6';
  const borderStyle = isSelected
    ? '2px solid #2563eb'
    : field.borderWidth !== undefined && field.borderWidth !== null && field.borderColor
    ? `${field.borderWidth}px solid ${field.borderColor}`
    : `1px dashed ${stationBorderColor}`;

  // BUG FIX: Text alignment logic
  // Date: 2026-01-06
  // Issue: Logic was inverted - 'right' returned 'flex-start' (left align), 'left' returned 'flex-end' (right align)
  // Fix: Correct mapping - 'right' → 'flex-end', 'left' → 'flex-start'
  // Context: Documents/Fixes/static-text-field-alignment-inversion-fix.md
  // Note: Works independently of RTL direction (controlled separately by 'direction' property)
  const getJustifyContent = () => {
    if (field.textAlign === 'center') return 'center';
    if (field.textAlign === 'right') return 'flex-end'; // Align to right
    return 'flex-start'; // Align to left (default)
  };

  return (
    <>
      <Rnd
        position={{
          x: viewportTopCoords.x,
          y: viewportTopCoords.y,
        }}
        size={{
          width: viewportWidth,
          height: viewportHeight,
        }}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        minWidth={25 * scale}
        minHeight={20 * scale}
        bounds="parent"
        className={cn(
          'field-marker field-marker-static-text',
          field.station === 'agent' ? 'field-marker-station-agent' : 'field-marker-station-client',
          isSelected && 'field-marker-selected',
          isHovered && 'field-marker-hovered',
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          border: borderStyle,
          backgroundColor: field.backgroundColor || (isSelected ? 'rgba(37, 99, 235, 0.1)' : 'transparent'),
          color: '#000000', // Always black
          display: 'flex',
          alignItems: 'center',
          justifyContent: getJustifyContent(),
          pointerEvents: 'auto', // Re-enable pointer events (parent has pointer-events-none)
          padding: `${4 * scale}px ${8 * scale}px`,
          fontSize: `${(field.fontSize || 12) * scale}px`,
          fontFamily: field.font || 'inherit',
          fontWeight: field.fontWeight || 'normal',
          fontStyle: field.fontStyle || 'normal',
          direction: field.direction,
          textAlign: field.textAlign || (field.direction === 'rtl' ? 'right' : 'left'),
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'hidden',
          boxSizing: 'border-box',
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
        {field.content || 'טקסט סטטי'}

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
            onDelete(field.id);
          }}
          title="מחק שדה"
        >
          ✕
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
