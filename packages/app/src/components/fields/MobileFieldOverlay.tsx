/**
 * Mobile Field Overlay Component
 * Generic overlay component for mobile/advanced fields (camera, GPS, QR, barcode)
 * These fields are placeholders in the editor - actual functionality only works in Form Viewer
 */

import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { X, Camera, MapPin, QrCode, Barcode } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FieldDefinition } from '@/types/fields';
import { FieldContextMenu } from './FieldContextMenu';
import { pdfToViewportCoords, viewportToPDFCoords } from '@/utils/pdfCoordinates';
import { useMultiDrag } from '@/hooks/useMultiDrag';

interface PageDimensions {
  width: number;
  height: number;
}

interface MobileFieldOverlayProps {
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

export const MobileFieldOverlay = ({
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
}: MobileFieldOverlayProps) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Calculate dimensions
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
    const pixelsToPointsScale = pageDimensions.width / canvasWidth;
    const pdfWidth = parseInt(ref.style.width) * pixelsToPointsScale;
    const pdfHeight = parseInt(ref.style.height) * pixelsToPointsScale;

    const pdfTopCoords = viewportToPDFCoords(
      position.x,
      position.y,
      pageDimensions,
      scale * 100,
      canvasWidth,
    );

    const pdfBottomY = pdfTopCoords.y - pdfHeight;

    onUpdate(field.id, {
      width: pdfWidth,
      height: pdfHeight,
      x: pdfTopCoords.x,
      y: pdfBottomY,
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(field.id);
  };

  // Convert PDF coordinates to viewport coordinates
  const pdfTopY = field.y + field.height;
  const viewportTopCoords = pdfToViewportCoords(
    field.x,
    pdfTopY,
    pageDimensions,
    scale * 100,
    canvasWidth,
  );

  // Get icon based on field type
  const getIcon = () => {
    switch (field.type) {
      case 'camera':
        return Camera;
      case 'gps-location':
        return MapPin;
      case 'qr-scan':
        return QrCode;
      case 'barcode-scan':
        return Barcode;
      default:
        return Camera;
    }
  };

  const Icon = getIcon();

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
        minWidth={80 * scale}
        minHeight={30 * scale}
        bounds="parent"
        className={cn(
          'field-marker field-marker-mobile',
          isSelected && 'field-marker-selected',
          isHovered && 'field-marker-hovered',
          'group',
        )}
        style={{
          zIndex: isSelected ? 1000 : 100,
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            onToggleSelection(field.id);
          } else {
            onSelect(field.id);
          }
        }}
        onMouseDown={(e: any) => {
          e.stopPropagation();
        }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => onHover?.(field.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div
          className={cn(
            'w-full h-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium',
            'border-2 rounded-md transition-colors',
            'bg-indigo-50 border-indigo-400 text-indigo-700',
            isSelected && 'border-indigo-600 bg-indigo-100',
            isHovered && 'border-indigo-500 bg-indigo-100',
          )}
          dir={field.direction || 'rtl'}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{field.label || field.name || 'Mobile Field'}</span>

          {/* Delete button on hover */}
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(field.id);
              }}
              className="absolute top-0 right-0 -mt-2 -mr-2 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
              title="Delete field"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </Rnd>

      {/* Context menu */}
      {contextMenu && (
        <FieldContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            onDelete(field.id);
            setContextMenu(null);
          }}
          onDuplicate={() => {
            onDuplicate(field.id);
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
};
