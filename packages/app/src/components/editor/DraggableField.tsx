/**
 * DraggableField Component
 * RTL-aware drag and drop field implementation
 * Uses @dnd-kit for accessible and performant DnD
 */

import React, { useState, useCallback, useRef, useEffect, PropsWithChildren } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  DragCancelEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  CollisionDetection,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { RTLGuard, mirrorMouseDelta } from '@/utils/rtl-guard';
import { cn } from '@/lib/utils';
import { throttle } from 'lodash';

// Types
export interface DraggableFieldProps {
  id: string;
  label?: string;
  type?: string;
  disabled?: boolean;
  selected?: boolean;
  selectable?: boolean;
  showHandle?: boolean;
  className?: string;
  ariaDescribedBy?: string;
  children?: React.ReactNode;
}

export interface DroppableAreaProps {
  id: string;
  label?: string;
  acceptTypes?: string[];
  direction?: 'ltr' | 'rtl';
  showDropIndicator?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface DragDropProviderProps {
  direction?: 'ltr' | 'rtl';
  selectedIds?: string[];
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragMove?: (event: DragMoveEvent) => void;
  onDragCancel?: (event: DragCancelEvent) => void;
  onSelectionChange?: (ids: string[]) => void;
  children: React.ReactNode;
}

// DraggableField Component
export const DraggableField: React.FC<DraggableFieldProps> = ({
  id,
  label,
  type = 'text',
  disabled = false,
  selected = false,
  selectable = false,
  showHandle = false,
  className,
  ariaDescribedBy,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    disabled,
    data: {
      type,
      label,
      selected,
    },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (selectable) {
      // Handle selection logic
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'draggable-field',
        'relative flex items-center gap-2 p-3 bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700 rounded-lg',
        'transition-all duration-200',
        !disabled && 'hover:shadow-md cursor-move',
        isDragging && 'dragging shadow-lg',
        selected && 'ring-2 ring-blue-500',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...attributes}
      {...listeners}
      role="button"
      draggable={!disabled}
      aria-grabbed={isDragging}
      aria-label={label}
      aria-describedby={ariaDescribedBy}
      onClick={handleClick}
    >
      {showHandle && (
        <div
          className="drag-handle p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          aria-label="Drag handle"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {children || (
        <div className="flex-1">
          <span className="font-medium">{label}</span>
          <span className="ml-2 text-sm text-gray-500">({type})</span>
        </div>
      )}

      {selected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
      )}
    </div>
  );
};

// DroppableArea Component
export const DroppableArea: React.FC<DroppableAreaProps> = ({
  id,
  label,
  acceptTypes,
  direction = 'ltr',
  showDropIndicator = true,
  className,
  children,
}) => {
  const {
    isOver,
    setNodeRef,
    active,
  } = useDroppable({
    id,
    data: {
      acceptTypes,
    },
  });

  // Check if the dragged item can be dropped
  const canDrop = useCallback(() => {
    if (!active || !acceptTypes || acceptTypes.length === 0) return true;

    const activeType = active.data.current?.type;
    return activeType && acceptTypes.includes(activeType);
  }, [active, acceptTypes]);

  const isValidDrop = isOver && canDrop();
  const isInvalidDrop = isOver && !canDrop();

  return (
    <div
      ref={setNodeRef}
      data-testid={`droppable-area-${id}`}
      className={cn(
        'droppable-area',
        'min-h-[100px] p-4 border-2 border-dashed rounded-lg',
        'transition-all duration-200',
        direction === 'rtl' && 'rtl',
        isValidDrop && 'drag-over can-drop bg-blue-50 dark:bg-blue-900/20 border-blue-400',
        isInvalidDrop && 'cannot-drop bg-red-50 dark:bg-red-900/20 border-red-400',
        !isOver && 'border-gray-300 dark:border-gray-600',
        className
      )}
    >
      {label && (
        <div className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </div>
      )}

      {children}

      {showDropIndicator && isValidDrop && (
        <div
          data-testid="drop-indicator"
          className="absolute inset-0 bg-blue-500/10 pointer-events-none"
        />
      )}
    </div>
  );
};

// DragDropProvider Component
export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  direction = 'ltr',
  selectedIds = [],
  onDragStart,
  onDragEnd,
  onDragMove,
  onDragCancel,
  onSelectionChange,
  children,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rtlGuard = new RTLGuard(direction);

  // Throttled drag move handler
  const throttledDragMove = useRef(
    throttle((event: DragMoveEvent) => {
      if (rtlGuard.isRTL()) {
        // Mirror the delta for RTL
        const mirroredDelta = mirrorMouseDelta(
          { x: event.delta.x, y: event.delta.y },
          'rtl'
        );
        // Update event with mirrored delta
        event.delta.x = mirroredDelta.x;
      }
      onDragMove?.(event);
    }, 50)
  ).current;

  // Configure sensors for different input types
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { currentCoordinates }) => {
        const delta = 20;
        switch (event.code) {
          case 'ArrowRight':
            return {
              ...currentCoordinates,
              x: currentCoordinates.x + (rtlGuard.isRTL() ? -delta : delta),
            };
          case 'ArrowLeft':
            return {
              ...currentCoordinates,
              x: currentCoordinates.x + (rtlGuard.isRTL() ? delta : -delta),
            };
          case 'ArrowDown':
            return {
              ...currentCoordinates,
              y: currentCoordinates.y + delta,
            };
          case 'ArrowUp':
            return {
              ...currentCoordinates,
              y: currentCoordinates.y - delta,
            };
        }
        return undefined;
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);

    // Set announcement for screen readers
    const label = event.active.data.current?.label || event.active.id;
    setAnnouncement(`Picked up ${label}`);

    // Include selected items if multi-select
    if (selectedIds.length > 0) {
      event.active.data.current = {
        ...event.active.data.current,
        selectedIds,
      };
    }

    onDragStart?.(event);
  }, [selectedIds, onDragStart]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const label = active.data.current?.label || active.id;
      const dropLabel = over.data.current?.label || over.id;
      setAnnouncement(`Dropped ${label} on ${dropLabel}`);
    } else {
      setAnnouncement('Dropped outside valid area');
    }

    setActiveId(null);
    onDragEnd?.(event);
  }, [onDragEnd]);

  // Handle drag cancel
  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setAnnouncement('Drag cancelled');
    setActiveId(null);
    onDragCancel?.(event);
  }, [onDragCancel]);

  return (
    <>
      {/* Screen reader announcements */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Selection indicator */}
      {selectedIds.length > 0 && (
        <div
          data-testid="selection-indicator"
          className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm"
        >
          {selectedIds.length} items selected
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragMove={throttledDragMove}
        onDragCancel={handleDragCancel}
      >
        <div data-testid="dnd-context">
          {children}
        </div>

        <DragOverlay>
          {activeId ? (
            <div
              data-testid="drag-overlay"
              className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-3 opacity-90"
            >
              <div className="font-medium">
                {activeId}
                {selectedIds.length > 1 && (
                  <span className="ml-2 text-sm text-gray-500">
                    (+{selectedIds.length - 1} more)
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

// Keyboard instructions component
export const DragDropInstructions: React.FC = () => (
  <div id="dnd-instructions" className="sr-only">
    Press space bar to pick up a draggable item.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.
  </div>
);

// Helper function to reorder items
export function reorderItems<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
  direction: 'ltr' | 'rtl' = 'ltr'
): T[] {
  const oldIndex = items.findIndex(item => item.id === activeId);
  const newIndex = items.findIndex(item => item.id === overId);

  if (oldIndex === -1 || newIndex === -1) return items;

  const reordered = [...items];
  const [removed] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, removed);

  // In RTL, visual order might need adjustment
  if (direction === 'rtl') {
    // RTL reordering logic if needed
  }

  return reordered;
}