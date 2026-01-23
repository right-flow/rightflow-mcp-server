import { useEffect, useRef, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FieldContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const FieldContextMenu = ({
  x,
  y,
  onDuplicate,
  onDelete,
  onClose,
}: FieldContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    // Use consistent menu dimensions
    const MENU_WIDTH = 170;
    const MENU_HEIGHT = 110;
    const PADDING = 10;

    let adjustedX = x - 20; // Slight offset to appear near the click point
    let adjustedY = y + 5;

    // Ensure menu doesn't go off right edge
    if (adjustedX + MENU_WIDTH > window.innerWidth - PADDING) {
      adjustedX = window.innerWidth - MENU_WIDTH - PADDING;
    }

    // Ensure menu doesn't go off left edge
    if (adjustedX < PADDING) {
      adjustedX = PADDING;
    }

    // Ensure menu doesn't go off bottom edge
    if (adjustedY + MENU_HEIGHT > window.innerHeight - PADDING) {
      adjustedY = window.innerHeight - MENU_HEIGHT - PADDING;
    }

    // Ensure menu doesn't go off top edge
    if (adjustedY < PADDING) {
      adjustedY = PADDING;
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[3000] bg-background border border-border rounded-md shadow-lg py-1 min-w-[160px]',
        'animate-in fade-in-0 zoom-in-95 duration-100',
      )}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
      dir="rtl"
    >
      {/* Duplicate Option */}
      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className={cn(
          'w-full px-3 py-2 text-sm flex items-center gap-2',
          'hover:bg-accent hover:text-accent-foreground',
          'transition-colors cursor-pointer',
        )}
      >
        <Copy className="w-4 h-4" />
        <span>שכפל שדה</span>
      </button>

      {/* Separator */}
      <div className="h-px bg-border my-1" />

      {/* Delete Option */}
      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className={cn(
          'w-full px-3 py-2 text-sm flex items-center gap-2',
          'hover:bg-destructive hover:text-destructive-foreground',
          'transition-colors cursor-pointer',
        )}
      >
        <Trash2 className="w-4 h-4" />
        <span>מחק שדה</span>
      </button>
    </div>
  );
};
