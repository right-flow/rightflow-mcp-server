/**
 * WorkflowDesigner Component
 * Main visual workflow design interface using React Flow
 */

import React, { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  ReactFlowProvider,
  ReactFlowInstance,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import custom nodes
import StartEndNode from './nodes/StartEndNode';
import FormNode from './nodes/FormNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';
import WaitNode from './nodes/WaitNode';
import ApprovalNode from './nodes/ApprovalNode';

// Import panels
import NodePalette from './NodePalette';
import PropertiesPanel from './PropertiesPanel';

// Import types
import { WorkflowDefinition, WorkflowNode as WorkflowNodeType } from '../../../backend/src/services/workflow/types';

// Define custom node types
const nodeTypes: NodeTypes = {
  start: StartEndNode,
  end: StartEndNode,
  form: FormNode,
  condition: ConditionNode,
  action: ActionNode,
  wait: WaitNode,
  approval: ApprovalNode,
};

// Define custom edge types (if needed)
const edgeTypes: EdgeTypes = {
  // Custom edge types can be added here
};

interface WorkflowDesignerProps {
  workflow?: WorkflowDefinition;
  onSave?: (workflow: WorkflowDefinition) => void;
  onChange?: (workflow: WorkflowDefinition) => void;
  readOnly?: boolean;
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  workflow,
  onSave,
  onChange,
  readOnly = false,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes] = useState<Node[]>(() =>
    workflow?.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: node.data.label || node.type.charAt(0).toUpperCase() + node.type.slice(1),
      },
    })) || [
      {
        id: 'start',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 250, y: 400 },
        data: { label: 'End' },
      },
    ]
  );

  const [edges, setEdges] = useState<Edge[]>(() =>
    workflow?.connections.map(conn => ({
      id: conn.id || `${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      label: conn.label,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6366f1',
      },
      style: {
        stroke: '#6366f1',
        strokeWidth: 2,
      },
    })) || []
  );

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Handle node changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Handle new connections
  const onConnect = useCallback((params: Connection) => {
    // Validate connection
    if (params.source === params.target) {
      console.warn('Cannot connect node to itself');
      return;
    }

    const newEdge: Edge = {
      ...params,
      id: `${params.source}-${params.target}`,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#6366f1',
      },
      style: {
        stroke: '#6366f1',
        strokeWidth: 2,
      },
    } as Edge;

    setEdges((eds) => addEdge(newEdge, eds));
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle drag over for DnD
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for DnD
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (!type || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  // Update properties of selected node
  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
  }, []);

  // Update properties of selected edge
  const updateEdgeData = useCallback((edgeId: string, data: any) => {
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, ...data };
        }
        return edge;
      })
    );
  }, []);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNode || selectedNode.type === 'start' || selectedNode.type === 'end') {
      return; // Cannot delete start/end nodes
    }

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
      )
    );
    setSelectedNode(null);
  }, [selectedNode]);

  // Delete selected edge
  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;

    setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
    setSelectedEdge(null);
  }, [selectedEdge]);

  // Convert to WorkflowDefinition format
  const getWorkflowDefinition = useCallback((): WorkflowDefinition => {
    const workflowNodes: WorkflowNodeType[] = nodes.map(node => ({
      id: node.id,
      type: node.type as any,
      position: node.position,
      data: node.data,
    }));

    const connections = edges.map(edge => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      label: edge.label,
    }));

    return {
      nodes: workflowNodes,
      connections,
      variables: workflow?.variables || [],
      config: workflow?.config || {},
    };
  }, [nodes, edges, workflow]);

  // Save workflow
  const handleSave = useCallback(() => {
    const definition = getWorkflowDefinition();
    onSave?.(definition);
  }, [getWorkflowDefinition, onSave]);

  // Handle changes
  React.useEffect(() => {
    const definition = getWorkflowDefinition();
    onChange?.(definition);
  }, [nodes, edges, getWorkflowDefinition, onChange]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNode) {
          deleteSelectedNode();
        } else if (selectedEdge) {
          deleteSelectedEdge();
        }
      }
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, deleteSelectedNode, deleteSelectedEdge, handleSave]);

  // MiniMap node color
  const nodeColor = (node: Node) => {
    switch (node.type) {
      case 'start':
      case 'end':
        return '#10b981'; // green
      case 'form':
        return '#3b82f6'; // blue
      case 'condition':
        return '#f59e0b'; // amber
      case 'action':
        return '#8b5cf6'; // purple
      case 'wait':
        return '#6b7280'; // gray
      case 'approval':
        return '#ef4444'; // red
      default:
        return '#94a3b8'; // slate
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Node Palette */}
      <div className="w-64 border-r border-gray-200 bg-white shadow-sm">
        <NodePalette />
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            animated: true,
            type: 'smoothstep',
          }}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#d1d5db" gap={16} variant={BackgroundVariant.Dots} />
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="!bg-gray-50"
          />
          <Controls className="!bg-white !shadow-lg" />
        </ReactFlow>

        {/* Save Button */}
        {!readOnly && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleSave}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Workflow
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Properties */}
      <div className="w-80 border-l border-gray-200 bg-white shadow-sm">
        <PropertiesPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onNodeUpdate={updateNodeData}
          onEdgeUpdate={updateEdgeData}
          onDelete={() => {
            if (selectedNode) deleteSelectedNode();
            if (selectedEdge) deleteSelectedEdge();
          }}
        />
      </div>
    </div>
  );
};

// Wrap with ReactFlowProvider
const WorkflowDesignerWithProvider: React.FC<WorkflowDesignerProps> = (props) => (
  <ReactFlowProvider>
    <WorkflowDesigner {...props} />
  </ReactFlowProvider>
);

export default WorkflowDesignerWithProvider;