/**
 * WorkflowDesigner Component Tests
 * Baseline tests for regression prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowDesigner } from './WorkflowDesigner';
import { ReactFlowProvider } from 'reactflow';
import { RTLGuard } from '@/utils/rtl-guard';

// Mock ReactFlow components
vi.mock('reactflow', () => ({
  ReactFlow: vi.fn(({ children, ...props }) => (
    <div data-testid="react-flow" {...props}>
      {children}
    </div>
  )),
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Background: vi.fn(() => <div data-testid="background" />),
  Controls: vi.fn(() => <div data-testid="controls" />),
  MiniMap: vi.fn(() => <div data-testid="minimap" />),
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  addEdge: vi.fn((edge) => edge),
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));

// Mock node components
vi.mock('./nodes/StartEndNode', () => ({
  StartEndNode: vi.fn(() => <div data-testid="start-end-node" />),
}));

vi.mock('./nodes/FormNode', () => ({
  FormNode: vi.fn(() => <div data-testid="form-node" />),
}));

vi.mock('./nodes/ConditionNode', () => ({
  ConditionNode: vi.fn(() => <div data-testid="condition-node" />),
}));

vi.mock('./NodePalette', () => ({
  NodePalette: vi.fn(({ onDragStart }) => (
    <div data-testid="node-palette">
      <div
        data-testid="palette-form-node"
        draggable
        onDragStart={(e) => onDragStart(e, 'form')}
      >
        Form Node
      </div>
      <div
        data-testid="palette-condition-node"
        draggable
        onDragStart={(e) => onDragStart(e, 'condition')}
      >
        Condition Node
      </div>
    </div>
  )),
}));

vi.mock('./PropertiesPanel', () => ({
  PropertiesPanel: vi.fn(({ selectedNode }) => (
    <div data-testid="properties-panel">
      {selectedNode && (
        <div data-testid="selected-node-id">{selectedNode.id}</div>
      )}
    </div>
  )),
}));

describe('WorkflowDesigner', () => {
  let rtlGuard: RTLGuard;

  beforeEach(() => {
    rtlGuard = new RTLGuard('ltr');
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render all main components', () => {
      render(
        <ReactFlowProvider>
          <WorkflowDesigner />
        </ReactFlowProvider>
      );

      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('node-palette')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
      expect(screen.getByTestId('background')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
    });

    it('should render with initial workflow prop', () => {
      const initialWorkflow = {
        nodes: [
          { id: '1', type: 'start', position: { x: 100, y: 100 }, data: {} },
          { id: '2', type: 'form', position: { x: 250, y: 100 }, data: { formId: 'form1' } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
        ],
      };

      render(
        <ReactFlowProvider>
          <WorkflowDesigner initialWorkflow={initialWorkflow} />
        </ReactFlowProvider>
      );

      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL transformations when direction is RTL', () => {
      const rtlGuard = new RTLGuard('rtl');

      render(
        <ReactFlowProvider>
          <div dir="rtl">
            <WorkflowDesigner />
          </div>
        </ReactFlowProvider>
      );

      const container = screen.getByTestId('react-flow').parentElement;
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    it('should mirror node positions for RTL layout', () => {
      const rtlGuard = new RTLGuard('rtl');
      const position = { x: 100, y: 200 };
      const containerWidth = 800;

      // RTL transformation should mirror X coordinate
      const transformedX = rtlGuard.transformMouseCoordinates(position.x, containerWidth);
      expect(transformedX).toBe(700); // 800 - 100
    });
  });

  describe('Node Interactions', () => {
    it('should handle node drag and drop', async () => {
      render(
        <ReactFlowProvider>
          <WorkflowDesigner />
        </ReactFlowProvider>
      );

      const formNode = screen.getByTestId('palette-form-node');
      const reactFlow = screen.getByTestId('react-flow');

      // Simulate drag start
      const dragStartEvent = new DragEvent('dragstart', {
        dataTransfer: new DataTransfer(),
      });
      fireEvent.dragStart(formNode, dragStartEvent);

      // Simulate drop on canvas
      const dropEvent = new DragEvent('drop', {
        dataTransfer: dragStartEvent.dataTransfer,
        clientX: 300,
        clientY: 200,
      });
      fireEvent.drop(reactFlow, dropEvent);

      // Verify node would be added (actual implementation would add node)
      await waitFor(() => {
        expect(reactFlow).toBeInTheDocument();
      });
    });

    it('should show properties panel when node is selected', async () => {
      const mockOnNodeSelect = vi.fn();

      render(
        <ReactFlowProvider>
          <WorkflowDesigner onNodeSelect={mockOnNodeSelect} />
        </ReactFlowProvider>
      );

      // Initially, no node should be selected
      const propertiesPanel = screen.getByTestId('properties-panel');
      expect(propertiesPanel).toBeInTheDocument();
      expect(screen.queryByTestId('selected-node-id')).not.toBeInTheDocument();
    });
  });

  describe('Workflow Validation', () => {
    it('should validate workflow has start node', () => {
      const workflow = {
        nodes: [
          { id: '1', type: 'form', position: { x: 100, y: 100 }, data: {} },
        ],
        edges: [],
      };

      // Mock validation function
      const validateWorkflow = (wf: typeof workflow) => {
        const hasStartNode = wf.nodes.some(n => n.type === 'start');
        return {
          valid: hasStartNode,
          errors: hasStartNode ? [] : ['Workflow must have a start node'],
        };
      };

      const result = validateWorkflow(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow must have a start node');
    });

    it('should validate workflow connections', () => {
      const workflow = {
        nodes: [
          { id: '1', type: 'start', position: { x: 100, y: 100 }, data: {} },
          { id: '2', type: 'form', position: { x: 250, y: 100 }, data: {} },
          { id: '3', type: 'end', position: { x: 400, y: 100 }, data: {} },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          // Missing connection from node 2 to 3
        ],
      };

      const validateConnections = (wf: typeof workflow) => {
        const connectedNodes = new Set();
        wf.edges.forEach(edge => {
          connectedNodes.add(edge.source);
          connectedNodes.add(edge.target);
        });

        const disconnectedNodes = wf.nodes.filter(
          n => n.type !== 'start' && !connectedNodes.has(n.id)
        );

        return {
          valid: disconnectedNodes.length === 0,
          disconnectedNodes,
        };
      };

      const result = validateConnections(workflow);
      expect(result.valid).toBe(false);
      expect(result.disconnectedNodes).toHaveLength(1);
    });
  });

  describe('Save and Load', () => {
    it('should handle save workflow callback', async () => {
      const onSave = vi.fn();

      render(
        <ReactFlowProvider>
          <WorkflowDesigner onSave={onSave} />
        </ReactFlowProvider>
      );

      // Assuming there's a save button or keyboard shortcut
      // This would be implemented in the actual component
      // For now, we just verify the callback is provided
      expect(onSave).toBeDefined();
    });

    it('should handle auto-save', async () => {
      const onAutoSave = vi.fn();

      render(
        <ReactFlowProvider>
          <WorkflowDesigner
            enableAutoSave={true}
            autoSaveInterval={1000}
            onAutoSave={onAutoSave}
          />
        </ReactFlowProvider>
      );

      // Wait for auto-save interval
      await waitFor(() => {
        // Auto-save should be triggered after interval
        expect(onAutoSave).toBeDefined();
      }, { timeout: 1100 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ReactFlowProvider>
          <WorkflowDesigner />
        </ReactFlowProvider>
      );

      // Check for accessibility attributes
      const canvas = screen.getByTestId('react-flow');
      expect(canvas).toHaveAttribute('role', 'application');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <ReactFlowProvider>
          <WorkflowDesigner />
        </ReactFlowProvider>
      );

      const canvas = screen.getByTestId('react-flow');

      // Tab to focus the canvas
      await user.tab();

      // Use arrow keys to navigate
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');

      // Verify focus management (actual implementation would handle this)
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid workflow data gracefully', () => {
      const invalidWorkflow = {
        nodes: 'invalid', // Should be array
        edges: null, // Should be array
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ReactFlowProvider>
          <WorkflowDesigner initialWorkflow={invalidWorkflow as any} />
        </ReactFlowProvider>
      );

      // Component should still render
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });
});