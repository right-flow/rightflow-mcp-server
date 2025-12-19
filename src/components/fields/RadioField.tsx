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

interface RadioFieldProps {
  field: FieldDefinition;
  isSelected: boolean;
  scale: number;
  pageDimensions: PageDimensions;
  canvasWidth: number;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const RadioField = ({
  field,
  isSelected,
  scale,
  pageDimensions,
  canvasWidth,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
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

  const handleDragStop = (_e: any, d: { x: number; y: number }) => {
    // d.x, d.y is the TOP-LEFT corner in viewport
    // Convert TOP-LEFT to PDF coordinates
    const pdfTopCoords = viewportToPDFCoords(
      d.x,
      d.y, // top of field
      pageDimensions,
      scale * 100,
      canvasWidth,
    );

    // field.y should be the BOTTOM - subtract height from top
    const pixelsToPointsScale = pageDimensions.width / canvasWidth;
    const pdfHeight = viewportHeight * pixelsToPointsScale;
    const pdfBottomY = pdfTopCoords.y - pdfHeight;

    onUpdate(field.id, {
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

  return (
    <>
      <Rnd
        position={{
          x: viewportTopCoords.x,
          y: viewportTopCoords.y, // Use TOP-LEFT for Rnd positioning
        }}
        size={{
          width: viewportWidth,
          height: viewportHeight,
        }}
        onDragStop={handleDragStop}
        enableResizing={false} // Radio buttons have fixed size - no resize handles
        bounds="parent"
        className={cn(
          'field-marker field-marker-radio',
          isSelected && 'field-marker-selected',
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          cursor: 'move',
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(field.id);
        }}
        onContextMenu={handleContextMenu}
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
                  whiteSpace: 'nowrap'
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
            className="absolute top-0 right-0 text-[10px] px-1 py-0.5 whitespace-nowrap"
            style={{
              color: 'hsl(var(--field-radio))',
              backgroundColor: 'transparent',
              transform: 'translateX(100%)',
            }}
            dir="rtl"
          >
            {sanitizeUserInput(field.label)}
          </div>
        )}

        {/* Delete button */}
        <button
          className="absolute top-0 left-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transform: 'translate(-50%, -50%)' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          title="מחק קבוצת כפתורי רדיו"
        >
          <X className="w-3 h-3" />
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
