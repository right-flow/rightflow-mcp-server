/**
 * DraggableField Component Tests
 * Test-Driven Development for RTL-aware drag and drop
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { DraggableField, DroppableArea, DragDropProvider } from './DraggableField';
import { RTLGuard } from '@/utils/rtl-guard';

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  TouchSensor: vi.fn(),
}));

describe('DraggableField', () => {
  let rtlGuard: RTLGuard;
  const mockOnDragEnd = vi.fn();
  const mockOnDragStart = vi.fn();

  beforeEach(() => {
    rtlGuard = new RTLGuard('ltr');
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render draggable field', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Text Field" type="text" />
        </DragDropProvider>
      );

      expect(screen.getByText('Text Field')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('draggable', 'true');
    });

    it('should render with custom content', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1">
            <div data-testid="custom-content">Custom Field Content</div>
          </DraggableField>
        </DragDropProvider>
      );

      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should show drag handle', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" showHandle={true} />
        </DragDropProvider>
      );

      expect(screen.getByLabelText('Drag handle')).toBeInTheDocument();
    });

    it('should apply disabled state', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" disabled={true} />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      expect(field).toHaveClass('opacity-50');
      expect(field).toHaveAttribute('draggable', 'false');
    });
  });

  describe('Drag and Drop Operations', () => {
    it('should handle drag start', () => {
      render(
        <DragDropProvider onDragStart={mockOnDragStart}>
          <DraggableField id="field-1" label="Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);

      expect(mockOnDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          active: expect.objectContaining({ id: 'field-1' })
        })
      );
    });

    it('should handle drag end', () => {
      render(
        <DragDropProvider onDragEnd={mockOnDragEnd}>
          <DraggableField id="field-1" label="Field 1" />
          <DroppableArea id="area-1">
            <div>Drop Zone</div>
          </DroppableArea>
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      const dropZone = screen.getByText('Drop Zone').parentElement;

      fireEvent.dragStart(field);
      fireEvent.drop(dropZone!);

      expect(mockOnDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          active: expect.objectContaining({ id: 'field-1' }),
          over: expect.objectContaining({ id: 'area-1' })
        })
      );
    });

    it('should show drag overlay during drag', () => {
      const { container } = render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Dragging Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);

      // Drag overlay should be visible
      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
    });

    it('should handle drag cancel', () => {
      const onDragCancel = vi.fn();

      render(
        <DragDropProvider onDragCancel={onDragCancel}>
          <DraggableField id="field-1" label="Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onDragCancel).toHaveBeenCalled();
    });
  });

  describe('RTL Support', () => {
    it('should mirror drag delta in RTL mode', () => {
      render(
        <DragDropProvider direction="rtl">
          <DraggableField id="field-1" label="שדה טקסט" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');

      // Simulate drag with delta
      fireEvent.dragStart(field, { clientX: 100, clientY: 100 });
      fireEvent.drag(field, { clientX: 150, clientY: 120 });

      // In RTL, horizontal movement should be mirrored
      // Moving right (positive delta) should move field left visually
    });

    it('should render correctly with Hebrew labels', () => {
      render(
        <DragDropProvider direction="rtl">
          <DraggableField id="field-1" label="שם מלא" type="text" />
          <DraggableField id="field-2" label="כתובת" type="text" />
        </DragDropProvider>
      );

      expect(screen.getByText('שם מלא')).toBeInTheDocument();
      expect(screen.getByText('כתובת')).toBeInTheDocument();
    });

    it('should handle RTL field order in drop zones', () => {
      render(
        <DragDropProvider direction="rtl">
          <DroppableArea id="area-1" direction="rtl">
            <DraggableField id="field-1" label="שדה 1" />
            <DraggableField id="field-2" label="שדה 2" />
            <DraggableField id="field-3" label="שדה 3" />
          </DroppableArea>
        </DragDropProvider>
      );

      const dropArea = screen.getByTestId('droppable-area-1');
      expect(dropArea).toHaveClass('rtl');
    });
  });

  describe('Droppable Areas', () => {
    it('should render droppable area', () => {
      render(
        <DragDropProvider>
          <DroppableArea id="area-1" label="Drop Zone">
            <div>Empty</div>
          </DroppableArea>
        </DragDropProvider>
      );

      expect(screen.getByText('Drop Zone')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-area-1')).toBeInTheDocument();
    });

    it('should highlight when dragging over', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" />
          <DroppableArea id="area-1" label="Drop Zone" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      const dropZone = screen.getByTestId('droppable-area-1');

      fireEvent.dragStart(field);
      fireEvent.dragEnter(dropZone);

      expect(dropZone).toHaveClass('drag-over');
    });

    it('should accept only specific field types', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Text" type="text" />
          <DraggableField id="field-2" label="Number" type="number" />
          <DroppableArea
            id="area-1"
            label="Text Only"
            acceptTypes={['text']}
          />
        </DragDropProvider>
      );

      const textField = screen.getByText('Text').closest('[draggable]');
      const numberField = screen.getByText('Number').closest('[draggable]');
      const dropZone = screen.getByTestId('droppable-area-1');

      // Text field should be accepted
      fireEvent.dragStart(textField!);
      fireEvent.dragEnter(dropZone);
      expect(dropZone).toHaveClass('can-drop');

      // Number field should be rejected
      fireEvent.dragStart(numberField!);
      fireEvent.dragEnter(dropZone);
      expect(dropZone).toHaveClass('cannot-drop');
    });
  });

  describe('Multi-Field Selection', () => {
    it('should support multi-select with Ctrl/Cmd', () => {
      const onSelectionChange = vi.fn();

      render(
        <DragDropProvider onSelectionChange={onSelectionChange}>
          <DraggableField id="field-1" label="Field 1" selectable={true} />
          <DraggableField id="field-2" label="Field 2" selectable={true} />
          <DraggableField id="field-3" label="Field 3" selectable={true} />
        </DragDropProvider>
      );

      const field1 = screen.getByText('Field 1').closest('[draggable]');
      const field2 = screen.getByText('Field 2').closest('[draggable]');

      // Select first field
      fireEvent.click(field1!);
      expect(onSelectionChange).toHaveBeenCalledWith(['field-1']);

      // Add second field with Ctrl
      fireEvent.click(field2!, { ctrlKey: true });
      expect(onSelectionChange).toHaveBeenCalledWith(['field-1', 'field-2']);
    });

    it('should drag multiple selected fields', () => {
      render(
        <DragDropProvider selectedIds={['field-1', 'field-2']}>
          <DraggableField id="field-1" label="Field 1" selected={true} />
          <DraggableField id="field-2" label="Field 2" selected={true} />
          <DraggableField id="field-3" label="Field 3" />
          <DroppableArea id="area-1" label="Drop Zone" />
        </DragDropProvider>
      );

      const field1 = screen.getByText('Field 1').closest('[draggable]');
      const dropZone = screen.getByTestId('droppable-area-1');

      fireEvent.dragStart(field1!);
      fireEvent.drop(dropZone);

      // Both selected fields should be moved
      expect(mockOnDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          active: expect.objectContaining({
            id: 'field-1',
            data: expect.objectContaining({
              selectedIds: ['field-1', 'field-2']
            })
          })
        })
      );
    });

    it('should show selection count badge', () => {
      render(
        <DragDropProvider selectedIds={['field-1', 'field-2', 'field-3']}>
          <div data-testid="selection-indicator" />
        </DragDropProvider>
      );

      const indicator = screen.getByTestId('selection-indicator');
      expect(indicator).toHaveTextContent('3 items selected');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard drag with Space/Enter', async () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" />
          <DroppableArea id="area-1" label="Drop Zone" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      field.focus();

      // Start drag with Space
      fireEvent.keyDown(field, { key: ' ' });

      // Move with arrow keys
      fireEvent.keyDown(field, { key: 'ArrowDown' });
      fireEvent.keyDown(field, { key: 'ArrowRight' });

      // Drop with Enter
      fireEvent.keyDown(field, { key: 'Enter' });

      expect(mockOnDragEnd).toHaveBeenCalled();
    });

    it('should cancel drag with Escape', () => {
      const onDragCancel = vi.fn();

      render(
        <DragDropProvider onDragCancel={onDragCancel}>
          <DraggableField id="field-1" label="Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      field.focus();

      fireEvent.keyDown(field, { key: ' ' }); // Start drag
      fireEvent.keyDown(field, { key: 'Escape' }); // Cancel

      expect(onDragCancel).toHaveBeenCalled();
    });
  });

  describe('Visual Feedback', () => {
    it('should show ghost image while dragging', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);

      // Original should be semi-transparent
      expect(field).toHaveClass('dragging');
      expect(field).toHaveStyle({ opacity: '0.5' });
    });

    it('should show drop indicator', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field" />
          <DroppableArea id="area-1" showDropIndicator={true} />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      const dropZone = screen.getByTestId('droppable-area-1');

      fireEvent.dragStart(field);
      fireEvent.dragOver(dropZone);

      // Drop indicator should be visible
      expect(screen.getByTestId('drop-indicator')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Draggable Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      expect(field).toHaveAttribute('aria-grabbed', 'false');
      expect(field).toHaveAttribute('aria-label', 'Draggable Field');
    });

    it('should announce drag operations', () => {
      render(
        <DragDropProvider>
          <DraggableField id="field-1" label="Field 1" />
          <DroppableArea id="area-1" label="Drop Zone" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent('Picked up Field 1');
    });

    it('should support screen reader instructions', () => {
      render(
        <DragDropProvider>
          <DraggableField
            id="field-1"
            label="Field"
            ariaDescribedBy="instructions"
          />
          <div id="instructions">
            Press space to pick up, arrow keys to move, space to drop
          </div>
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      expect(field).toHaveAttribute('aria-describedby', 'instructions');
    });
  });

  describe('Performance', () => {
    it('should throttle drag move events', () => {
      const onDragMove = vi.fn();

      render(
        <DragDropProvider onDragMove={onDragMove}>
          <DraggableField id="field-1" label="Field" />
        </DragDropProvider>
      );

      const field = screen.getByRole('button');
      fireEvent.dragStart(field);

      // Simulate rapid mouse movements
      for (let i = 0; i < 100; i++) {
        fireEvent.drag(field, { clientX: i, clientY: i });
      }

      // Should be throttled, not called 100 times
      expect(onDragMove.mock.calls.length).toBeLessThan(20);
    });
  });
});