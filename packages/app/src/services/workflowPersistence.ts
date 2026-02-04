/**
 * Workflow Persistence Service
 * Handles saving and loading workflows
 */

import { Node, Edge } from 'reactflow';
import { WorkflowDefinition } from '../../backend/src/services/workflow/types';

/**
 * Convert React Flow nodes and edges to WorkflowDefinition format
 */
export function convertToWorkflowDefinition(
  nodes: Node[],
  edges: Edge[],
  metadata?: {
    name?: string;
    description?: string;
    variables?: any[];
    config?: any;
  }
): WorkflowDefinition {
  // Transform nodes to workflow nodes
  const workflowNodes = nodes.map(node => ({
    id: node.id,
    type: node.type || 'custom',
    position: node.position,
    data: node.data || {},
  }));

  // Transform edges to connections
  const connections = edges.map(edge => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromHandle: edge.sourceHandle,
    toHandle: edge.targetHandle,
    condition: edge.data?.condition,
    label: edge.data?.label,
  }));

  return {
    nodes: workflowNodes,
    connections,
    variables: metadata?.variables || [],
    config: metadata?.config || {
      name: metadata?.name || 'Untitled Workflow',
      description: metadata?.description || '',
      version: 1,
    },
  };
}

/**
 * Convert WorkflowDefinition to React Flow nodes and edges
 */
export function convertFromWorkflowDefinition(definition: WorkflowDefinition): {
  nodes: Node[];
  edges: Edge[];
  metadata: {
    name: string;
    description: string;
    variables: any[];
    config: any;
  };
} {
  // Transform workflow nodes to React Flow nodes
  const nodes: Node[] = definition.nodes.map((node: any) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data || {},
  }));

  // Transform connections to React Flow edges
  const edges: Edge[] = definition.connections.map((conn: any) => ({
    id: conn.id || `${conn.from}-${conn.to}`,
    source: conn.from,
    target: conn.to,
    sourceHandle: conn.fromHandle,
    targetHandle: conn.toHandle,
    data: {
      condition: conn.condition,
      label: conn.label,
    },
    type: 'smoothstep',
    animated: conn.condition ? true : false,
  }));

  const metadata = {
    name: definition.config?.name || 'Untitled Workflow',
    description: definition.config?.description || '',
    variables: definition.variables || [],
    config: definition.config || {},
  };

  return { nodes, edges, metadata };
}

/**
 * Save workflow to backend API
 */
export async function saveWorkflow(
  workflowId: string | null,
  nodes: Node[],
  edges: Edge[],
  metadata: {
    name: string;
    description?: string;
    status?: 'draft' | 'published';
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const definition = convertToWorkflowDefinition(nodes, edges, metadata);

    const url = workflowId
      ? `/api/workflows/${workflowId}`
      : '/api/workflows';

    const method = workflowId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: metadata.name,
        description: metadata.description,
        definition,
        status: metadata.status || 'draft',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to save workflow',
      };
    }

    const result = await response.json();
    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    console.error('Error saving workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load workflow from backend API
 */
export async function loadWorkflow(workflowId: string): Promise<{
  success: boolean;
  data?: {
    nodes: Node[];
    edges: Edge[];
    metadata: any;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`/api/workflows/${workflowId}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to load workflow',
      };
    }

    const workflow = await response.json();
    const { nodes, edges, metadata } = convertFromWorkflowDefinition(workflow.definition);

    return {
      success: true,
      data: {
        nodes,
        edges,
        metadata: {
          ...metadata,
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          status: workflow.status,
        },
      },
    };
  } catch (error) {
    console.error('Error loading workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export workflow as JSON file
 */
export function exportWorkflow(
  nodes: Node[],
  edges: Edge[],
  metadata: { name: string; description?: string }
): void {
  const definition = convertToWorkflowDefinition(nodes, edges, metadata);

  const dataStr = JSON.stringify(definition, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `${metadata.name.replace(/\s+/g, '_')}_workflow.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

/**
 * Import workflow from JSON file
 */
export function importWorkflow(file: File): Promise<{
  success: boolean;
  data?: {
    nodes: Node[];
    edges: Edge[];
    metadata: any;
  };
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const definition = JSON.parse(content) as WorkflowDefinition;
        const { nodes, edges, metadata } = convertFromWorkflowDefinition(definition);

        resolve({
          success: true,
          data: { nodes, edges, metadata },
        });
      } catch (error) {
        resolve({
          success: false,
          error: 'Invalid workflow file format',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file',
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Validate workflow definition
 */
export function validateWorkflow(nodes: Node[], edges: Edge[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for start node
  const startNodes = nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push('Workflow must have a start node');
  } else if (startNodes.length > 1) {
    errors.push('Workflow can only have one start node');
  }

  // Check for end node
  const endNodes = nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    warnings.push('Workflow should have at least one end node');
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const disconnectedNodes = nodes.filter(
    n => n.type !== 'start' && n.type !== 'end' && !connectedNodeIds.has(n.id)
  );

  if (disconnectedNodes.length > 0) {
    warnings.push(
      `Disconnected nodes found: ${disconnectedNodes.map(n => n.data?.label || n.id).join(', ')}`
    );
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) {
          return true;
        }
      } else if (recursionStack.has(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Start cycle detection from start node
  if (startNodes.length === 1 && hasCycle(startNodes[0].id)) {
    warnings.push('Workflow contains circular dependencies');
  }

  // Check for required data in specific node types
  nodes.forEach(node => {
    switch (node.type) {
      case 'form':
        if (!node.data?.formId) {
          warnings.push(`Form node "${node.data?.label || node.id}" is missing form ID`);
        }
        break;
      case 'condition':
        if (!node.data?.field || !node.data?.operator) {
          errors.push(`Condition node "${node.data?.label || node.id}" is missing required fields`);
        }
        break;
      case 'action':
        if (!node.data?.actionType) {
          errors.push(`Action node "${node.data?.label || node.id}" is missing action type`);
        }
        break;
      case 'approval':
        if (!node.data?.approverType) {
          warnings.push(`Approval node "${node.data?.label || node.id}" is missing approver configuration`);
        }
        break;
    }
  });

  // Check for approval nodes with only one output
  const approvalNodes = nodes.filter(n => n.type === 'approval');
  approvalNodes.forEach(node => {
    const outputs = edges.filter(e => e.source === node.id);
    if (outputs.length < 2) {
      warnings.push(
        `Approval node "${node.data?.label || node.id}" should have both approved and rejected outputs`
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Auto-save workflow to local storage (for draft recovery)
 */
export function autoSaveToLocal(
  workflowId: string | null,
  nodes: Node[],
  edges: Edge[],
  metadata: any
): void {
  const key = workflowId ? `workflow_draft_${workflowId}` : 'workflow_draft_new';
  const data = {
    nodes,
    edges,
    metadata,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to auto-save workflow:', error);
  }
}

/**
 * Load auto-saved draft from local storage
 */
export function loadAutoSavedDraft(workflowId: string | null): {
  found: boolean;
  data?: {
    nodes: Node[];
    edges: Edge[];
    metadata: any;
    timestamp: string;
  };
} {
  const key = workflowId ? `workflow_draft_${workflowId}` : 'workflow_draft_new';

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        found: true,
        data,
      };
    }
  } catch (error) {
    console.error('Failed to load auto-saved draft:', error);
  }

  return { found: false };
}

/**
 * Clear auto-saved draft from local storage
 */
export function clearAutoSavedDraft(workflowId: string | null): void {
  const key = workflowId ? `workflow_draft_${workflowId}` : 'workflow_draft_new';

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear auto-saved draft:', error);
  }
}