import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, PenTool } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';

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
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const SignatureField = ({
  field,
  isSelected,
  scale,
  pageDimensions,
  canvasWidth,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}: SignatureFieldProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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

    // Calculate viewport height inside the function
    const pointsToPixelsScale = canvasWidth / pageDimensions.width;
    const viewportHeightLocal = field.height * pointsToPixelsScale;

    // field.y should be the BOTTOM - subtract height from top
    const pixelsToPointsScale = pageDimensions.width / canvasWidth;
    const pdfHeight = viewportHeightLocal * pixelsToPointsScale;
    const pdfBottomY = pdfTopCoords.y - pdfHeight;

    onUpdate(field.id, {
      x: pdfTopCoords.x,
      y: pdfBottomY, // Bottom edge in PDF coordinates
    });
  };

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

  // Convert PDF size to viewport size first
  const pointsToPixelsScale = canvasWidth / pageDimensions.width;
  const viewportWidth = field.width * pointsToPixelsScale;
  const viewportHeight = field.height * pointsToPixelsScale;

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
        onResizeStop={handleResizeStop}
        minWidth={80 * scale}
        minHeight={40 * scale}
        bounds="parent"
        className={cn(
          'field-marker field-marker-signature',
          isSelected && 'field-marker-selected',
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
          border: '2px dashed hsl(var(--signature-border))',
          backgroundColor: field.signatureImage ? 'transparent' : 'hsl(var(--signature-bg))',
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(field.id);
        }}
        onContextMenu={handleContextMenu}
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

        {/* Delete button */}
        <button
          className="absolute top-0 left-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ transform: 'translate(-50%, -50%)' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(field.id);
          }}
          title="מחק שדה"
        >
          <X className="w-3 h-3" />
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
