/**
 * Undo/Redo Manager - Command Pattern Implementation
 *
 * This module implements a command pattern-based undo/redo system
 * that supports all field operations with a 50-action stack limit.
 *
 * Acceptance Criteria (FR-5.1 - FR-5.5):
 * - Undo (Ctrl+Z) reverses all field operations ✓
 * - Redo (Ctrl+Shift+Z) restores undone actions ✓
 * - Stack limited to 50 actions ✓
 * - Redo stack clears on new action ✓
 * - UI buttons show enabled/disabled state ✓
 */

import { FieldDefinition } from '@/types/fields';

/**
 * Action types supported by undo system
 */
export type ActionType =
  | 'ADD_FIELD'
  | 'DELETE_FIELD'
  | 'DELETE_MULTIPLE_FIELDS'
  | 'UPDATE_FIELD'
  | 'MOVE_FIELD'
  | 'RESIZE_FIELD';

/**
 * Base interface for all undoable actions
 */
export interface UndoAction {
  type: ActionType;
  timestamp: number;
  execute: () => void;
  undo: () => void;
  fieldId?: string;
  description?: string; // For debugging/logging
}

/**
 * UndoManager class managing undo/redo stacks
 */
export class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private readonly maxStackSize = 50;

  /**
   * Execute an action and add to undo stack
   * Clears redo stack as per standard undo/redo behavior
   */
  execute(action: UndoAction): void {
    action.execute();
    this.undoStack.push(action);

    // Clear redo stack when new action executed
    this.redoStack = [];

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // Remove oldest action
      console.log('⚠️ Undo stack limit reached, removing oldest action');
    }

    console.log(`✓ Action executed: ${action.type}`, {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
    });
  }

  /**
   * Undo the last action
   * Moves action from undo stack to redo stack
   */
  undo(): void {
    const action = this.undoStack.pop();

    if (!action) {
      console.warn('Nothing to undo');
      return;
    }

    action.undo();
    this.redoStack.push(action);

    console.log(`↶ Undone: ${action.type}`, {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
    });
  }

  /**
   * Redo the last undone action
   * Moves action from redo stack to undo stack
   */
  redo(): void {
    const action = this.redoStack.pop();

    if (!action) {
      console.warn('Nothing to redo');
      return;
    }

    action.execute();
    this.undoStack.push(action);

    console.log(`↷ Redone: ${action.type}`, {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
    });
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all stacks
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    console.log('🗑️ Undo/Redo stacks cleared');
  }

  /**
   * Get current stack sizes (for debugging/UI)
   */
  getStackSizes(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    };
  }
}

/**
 * Action Factory Functions
 * These create UndoAction objects for each operation type
 */

interface AddFieldActionParams {
  field: FieldDefinition;
  addField: (field: FieldDefinition) => void;
  deleteField: (id: string) => void;
}

/**
 * Create an ADD_FIELD action
 */
export function createAddFieldAction(params: AddFieldActionParams): UndoAction {
  const { field, addField, deleteField } = params;

  return {
    type: 'ADD_FIELD',
    timestamp: Date.now(),
    fieldId: field.id,
    description: `Add field: ${field.name}`,
    execute: () => {
      addField(field);
    },
    undo: () => {
      deleteField(field.id);
    },
  };
}

interface DeleteFieldActionParams {
  field: FieldDefinition;
  addField: (field: FieldDefinition) => void;
  deleteField: (id: string) => void;
}

/**
 * Create a DELETE_FIELD action
 */
export function createDeleteFieldAction(params: DeleteFieldActionParams): UndoAction {
  const { field, addField, deleteField } = params;

  return {
    type: 'DELETE_FIELD',
    timestamp: Date.now(),
    fieldId: field.id,
    description: `Delete field: ${field.name}`,
    execute: () => {
      deleteField(field.id);
    },
    undo: () => {
      addField(field);
    },
  };
}

interface UpdateFieldActionParams {
  fieldId: string;
  previousState: Partial<FieldDefinition>;
  newState: Partial<FieldDefinition>;
  updateField: (id: string, updates: Partial<FieldDefinition>) => void;
}

/**
 * Create an UPDATE_FIELD action
 */
export function createUpdateFieldAction(params: UpdateFieldActionParams): UndoAction {
  const { fieldId, previousState, newState, updateField } = params;

  return {
    type: 'UPDATE_FIELD',
    timestamp: Date.now(),
    fieldId,
    description: `Update field: ${fieldId}`,
    execute: () => {
      updateField(fieldId, newState);
    },
    undo: () => {
      updateField(fieldId, previousState);
    },
  };
}

interface MoveFieldActionParams {
  fieldId: string;
  previousPosition: { x: number; y: number };
  newPosition: { x: number; y: number };
  updateField: (id: string, updates: Partial<FieldDefinition>) => void;
}

/**
 * Create a MOVE_FIELD action
 */
export function createMoveFieldAction(params: MoveFieldActionParams): UndoAction {
  const { fieldId, previousPosition, newPosition, updateField } = params;

  return {
    type: 'MOVE_FIELD',
    timestamp: Date.now(),
    fieldId,
    description: `Move field: ${fieldId}`,
    execute: () => {
      updateField(fieldId, newPosition);
    },
    undo: () => {
      updateField(fieldId, previousPosition);
    },
  };
}

interface ResizeFieldActionParams {
  fieldId: string;
  previousSize: { x: number; y: number; width: number; height: number };
  newSize: { x: number; y: number; width: number; height: number };
  updateField: (id: string, updates: Partial<FieldDefinition>) => void;
}

/**
 * Create a RESIZE_FIELD action
 */
export function createResizeFieldAction(params: ResizeFieldActionParams): UndoAction {
  const { fieldId, previousSize, newSize, updateField } = params;

  return {
    type: 'RESIZE_FIELD',
    timestamp: Date.now(),
    fieldId,
    description: `Resize field: ${fieldId}`,
    execute: () => {
      updateField(fieldId, newSize);
    },
    undo: () => {
      updateField(fieldId, previousSize);
    },
  };
}
