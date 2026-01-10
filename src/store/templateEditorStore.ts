import { create } from 'zustand';
import { FieldDefinition, ToolMode, PageMetadata } from '@/types/fields';
import {
  UndoManager,
  createAddFieldAction,
  createDeleteFieldAction,
  createUpdateFieldAction,
} from '@/utils/undoManager';
import { RecoveryData } from '@/utils/crashRecovery';
import type { PDFDocumentProxy } from 'pdfjs-dist';

// LocalStorage key for tracking field creation index
const LAST_INDEX_KEY = 'rightflow_last_field_index';

/**
 * Get the next field index and increment the counter in localStorage
 */
const getNextFieldIndex = (): number => {
  const currentIndex = parseInt(localStorage.getItem(LAST_INDEX_KEY) || '0', 10);
  const nextIndex = currentIndex + 1;
  localStorage.setItem(LAST_INDEX_KEY, nextIndex.toString());
  return nextIndex;
};

/**
 * Decrement the LastIndex counter (used when deleting the most recently created field)
 */
const decrementLastIndex = (): void => {
  const currentIndex = parseInt(localStorage.getItem(LAST_INDEX_KEY) || '0', 10);
  if (currentIndex > 0) {
    localStorage.setItem(LAST_INDEX_KEY, (currentIndex - 1).toString());
  }
};

/**
 * Initialize LastIndex based on the highest index in existing fields
 * Called when loading templates or crash recovery
 */
const initializeLastIndex = (fields: FieldDefinition[]): void => {
  const maxIndex = fields.reduce((max, field) => {
    return field.index !== undefined && field.index > max ? field.index : max;
  }, 0);
  localStorage.setItem(LAST_INDEX_KEY, maxIndex.toString());
};

interface PageDimensions {
  width: number;
  height: number;
}

interface TemplateEditorStore {
  // PDF state
  pdfFile: File | null;
  pdfDocument: PDFDocumentProxy | null; // The loaded PDF document for text extraction
  currentPage: number;
  totalPages: number;
  pageDimensions: Record<number, PageDimensions>; // page number -> dimensions
  thumbnails: string[];

  // View state
  zoomLevel: number;
  canvasWidth: number; // Current rendered width of the PDF canvas

  // Tool state
  activeTool: ToolMode;

  // Field state
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[]; // Multi-select support
  copiedField: FieldDefinition | null; // For copy/paste functionality
  lastUpdatedFieldId: string | null; // Track last updated field for section name inheritance

  // Undo/Redo state
  undoManager: UndoManager;

  // Drag state for creating new fields
  isDragging: boolean;
  dragStartX: number | null;
  dragStartY: number | null;
  dragCurrentX: number | null;
  dragCurrentY: number | null;

  // Marquee selection state
  isMarqueeSelecting: boolean;
  marqueeStartX: number | null;
  marqueeStartY: number | null;
  marqueeEndX: number | null;
  marqueeEndY: number | null;

  // Metadata state
  pagesMetadata: Record<number, PageMetadata>; // page number -> metadata

  // Hover state
  hoveredFieldId: string | null;

  // Actions - PDF
  setPdfFile: (file: File | null) => void;
  setPdfDocument: (document: PDFDocumentProxy | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  setPageDimensions: (page: number, dimensions: PageDimensions) => void;
  setThumbnails: (thumbnails: string[]) => void;

  // Actions - View
  setZoomLevel: (level: number) => void;
  setCanvasWidth: (width: number) => void;

  // Actions - Tools
  setActiveTool: (tool: ToolMode) => void;

  // Actions - Fields
  addField: (field: Omit<FieldDefinition, 'id'>) => void;
  addFieldWithUndo: (field: Omit<FieldDefinition, 'id'>) => void; // Undo-aware version
  updateField: (id: string, updates: Partial<FieldDefinition>) => void;
  updateFieldWithUndo: (id: string, updates: Partial<FieldDefinition>) => void; // Undo-aware version
  deleteField: (id: string) => void;
  deleteFieldWithUndo: (id: string) => void; // Undo-aware version
  deleteMultipleFieldsWithUndo: (ids: string[]) => void; // Undo-aware multi-delete
  selectField: (id: string | null) => void;
  toggleFieldSelection: (id: string) => void; // Add/remove from multi-select
  addToSelection: (id: string) => void; // Add to multi-select
  clearSelection: () => void; // Clear all selections
  selectMultipleFields: (ids: string[]) => void; // Select multiple at once
  updateMultipleFields: (ids: string[], updates: Partial<FieldDefinition>) => void; // Update multiple fields
  moveMultipleFieldsByDelta: (deltaX: number, deltaY: number) => void; // Move selected fields by delta
  getFieldsForPage: (page: number) => FieldDefinition[];
  copyField: () => void;
  pasteField: () => void;
  duplicateField: (id: string) => void;
  loadFields: (fields: FieldDefinition[]) => void;

  // Actions - Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Drag
  startDrag: (x: number, y: number) => void;
  updateDragPosition: (x: number, y: number) => void;
  endDrag: () => void;

  // Actions - Marquee Selection
  startMarquee: (x: number, y: number) => void;
  updateMarquee: (x: number, y: number) => void;
  endMarquee: () => void;

  // Actions - Metadata
  setPageMetadata: (pageNumber: number, metadata: PageMetadata) => void;

  // Actions - Hover
  setHoveredField: (id: string | null) => void;

  // Actions - Reset
  reset: () => void;

  // Actions - Crash Recovery
  restoreFromRecovery: (recoveryData: RecoveryData) => void;

  // Actions - Page Reprocessing
  replaceFieldsForPage: (pageNumber: number, newFields: FieldDefinition[]) => void;
}

const initialState = {
  pdfFile: null,
  pdfDocument: null,
  currentPage: 1,
  totalPages: 0,
  pageDimensions: {},
  thumbnails: [],
  zoomLevel: 100,
  canvasWidth: 0,
  activeTool: 'select' as ToolMode,
  lastUpdatedFieldId: null,
  fields: [],
  selectedFieldId: null,
  selectedFieldIds: [],
  copiedField: null,
  undoManager: new UndoManager(),
  isDragging: false,
  dragStartX: null,
  dragStartY: null,
  dragCurrentX: null,
  dragCurrentY: null,
  isMarqueeSelecting: false,
  marqueeStartX: null,
  marqueeStartY: null,
  marqueeEndX: null,
  marqueeEndY: null,
  pagesMetadata: {},
  hoveredFieldId: null,
};

export const useTemplateEditorStore = create<TemplateEditorStore>((set, get) => ({
  ...initialState,

  // PDF actions
  setPdfFile: (file) => set({ pdfFile: file }),

  setPdfDocument: (document) => set({ pdfDocument: document }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setTotalPages: (total) => set({ totalPages: total }),

  setPageDimensions: (page, dimensions) =>
    set((state) => ({
      pageDimensions: {
        ...state.pageDimensions,
        [page]: dimensions,
      },
    })),

  setThumbnails: (thumbnails) => set({ thumbnails }),

  // View actions
  setZoomLevel: (level) => set({ zoomLevel: Math.max(50, Math.min(200, level)) }),

  setCanvasWidth: (width) => set({ canvasWidth: width }),

  // Tool actions
  setActiveTool: (tool) => set({ activeTool: tool, selectedFieldId: null }),

  // Field actions (non-undoable - used internally by undo system)
  addField: (fieldData) => {
    const newField: FieldDefinition = {
      ...fieldData,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    set((state) => ({
      fields: [...state.fields, newField],
      selectedFieldId: newField.id,
    }));
  },

  // Undo-aware field addition
  addFieldWithUndo: (fieldData) => {
    const state = get();

    // Auto-generate field name if not provided or empty
    let fieldName = fieldData.name;
    if (!fieldName || fieldName === '') {
      // Count fields of this type to generate next number
      const fieldsOfType = state.fields.filter(f => f.type === fieldData.type);
      const nextNumber = fieldsOfType.length + 1;
      fieldName = `${fieldData.type}_${nextNumber}`;
    }

    // Inherit sectionName from last updated field if not provided
    let sectionName = fieldData.sectionName;
    if (!sectionName && state.lastUpdatedFieldId) {
      const lastUpdatedField = state.fields.find(f => f.id === state.lastUpdatedFieldId);
      if (lastUpdatedField?.sectionName) {
        sectionName = lastUpdatedField.sectionName;
      }
    }
    // Default to 'כללי' if still no section name
    if (!sectionName) {
      sectionName = 'כללי';
    }

    // Get next creation order index
    const fieldIndex = getNextFieldIndex();

    const newField: FieldDefinition = {
      ...fieldData,
      name: fieldName,
      sectionName,
      index: fieldIndex,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const action = createAddFieldAction({
      field: newField,
      addField: (field) => {
        set((prevState) => ({
          fields: [...prevState.fields, field],
          selectedFieldId: field.id,
          lastUpdatedFieldId: field.id,
        }));
      },
      deleteField: (id) => {
        set((prevState) => ({
          fields: prevState.fields.filter((f) => f.id !== id),
          selectedFieldId: prevState.selectedFieldId === id ? null : prevState.selectedFieldId,
        }));
      },
    });

    state.undoManager.execute(action);
  },

  updateField: (id, updates) =>
    set((state) => ({
      fields: state.fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field,
      ),
    })),

  // Undo-aware field update
  updateFieldWithUndo: (id, updates) => {
    const state = get();
    const field = state.fields.find((f) => f.id === id);

    if (!field) {
      console.warn('Field not found for update:', id);
      return;
    }

    // Capture previous state (only the properties being updated)
    const previousState: Partial<FieldDefinition> = {};
    Object.keys(updates).forEach((key) => {
      previousState[key as keyof FieldDefinition] = field[key as keyof FieldDefinition] as any;
    });

    const action = createUpdateFieldAction({
      fieldId: id,
      previousState,
      newState: updates,
      updateField: (fieldId, fieldUpdates) => {
        set((prevState) => ({
          fields: prevState.fields.map((f) =>
            f.id === fieldId ? { ...f, ...fieldUpdates } : f,
          ),
          lastUpdatedFieldId: fieldId,
        }));
      },
    });

    state.undoManager.execute(action);
  },

  deleteField: (id) =>
    set((state) => ({
      fields: state.fields.filter((field) => field.id !== id),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
    })),

  // Undo-aware field deletion
  deleteFieldWithUndo: (id) => {
    const state = get();
    const field = state.fields.find((f) => f.id === id);

    if (!field) {
      console.warn('Field not found for deletion:', id);
      return;
    }

    // Check if this field has the highest index
    const maxIndex = state.fields.reduce((max, f) => {
      return f.index !== undefined && f.index > max ? f.index : max;
    }, 0);
    const isLastCreatedField = field.index === maxIndex;

    const action = createDeleteFieldAction({
      field: { ...field }, // Clone to avoid reference issues
      addField: (fieldToRestore) => {
        // When undoing deletion, assign new index (as per user requirement)
        const restoredField = { ...fieldToRestore, index: getNextFieldIndex() };
        set((prevState) => ({
          fields: [...prevState.fields, restoredField],
        }));
      },
      deleteField: (fieldId) => {
        set((prevState) => ({
          fields: prevState.fields.filter((f) => f.id !== fieldId),
          selectedFieldId: prevState.selectedFieldId === fieldId ? null : prevState.selectedFieldId,
        }));
        // Decrement LastIndex only if deleting the most recently created field
        if (isLastCreatedField) {
          decrementLastIndex();
        }
      },
    });

    state.undoManager.execute(action);
  },

  // Undo-aware multi-field deletion
  deleteMultipleFieldsWithUndo: (ids) => {
    const state = get();
    const fieldsToDelete = state.fields.filter((f) => ids.includes(f.id));

    if (fieldsToDelete.length === 0) {
      console.warn('No fields found for deletion:', ids);
      return;
    }

    // Find the highest index among fields being deleted
    const maxDeleteIndex = fieldsToDelete.reduce((max, f) => {
      return f.index !== undefined && f.index > max ? f.index : max;
    }, 0);

    // Check if deleting the field with highest index overall
    const overallMaxIndex = state.fields.reduce((max, f) => {
      return f.index !== undefined && f.index > max ? f.index : max;
    }, 0);
    const deletingLastCreatedField = maxDeleteIndex === overallMaxIndex;

    // Create a composite undo action for all fields
    const action = {
      type: 'DELETE_MULTIPLE_FIELDS' as const,
      timestamp: Date.now(),
      description: `Delete ${fieldsToDelete.length} fields`,
      execute: () => {
        set((prevState) => ({
          fields: prevState.fields.filter((f) => !ids.includes(f.id)),
          selectedFieldId: null,
          selectedFieldIds: [],
        }));
        if (deletingLastCreatedField) {
          // Find the new max index after deletion
          const remainingFields = state.fields.filter((f) => !ids.includes(f.id));
          const newMaxIndex = remainingFields.reduce((max, f) => {
            return f.index !== undefined && f.index > max ? f.index : max;
          }, 0);
          localStorage.setItem(LAST_INDEX_KEY, newMaxIndex.toString());
        }
      },
      undo: () => {
        // Restore all deleted fields
        set((prevState) => ({
          fields: [...prevState.fields, ...fieldsToDelete.map((f) => ({
            ...f,
            index: getNextFieldIndex(),
          }))],
        }));
      },
    };

    state.undoManager.execute(action);
  },

  selectField: (id) => set({ selectedFieldId: id, selectedFieldIds: id ? [id] : [], activeTool: 'select' }),

  // Multi-select actions
  toggleFieldSelection: (id) => set((state) => {
    const currentIds = state.selectedFieldIds;
    const isSelected = currentIds.includes(id);
    const newIds = isSelected
      ? currentIds.filter(fid => fid !== id)
      : [...currentIds, id];
    return {
      selectedFieldIds: newIds,
      selectedFieldId: newIds.length === 1 ? newIds[0] : null,
      activeTool: 'select',
    };
  }),

  addToSelection: (id) => set((state) => {
    if (state.selectedFieldIds.includes(id)) return state;
    const newIds = [...state.selectedFieldIds, id];
    return {
      selectedFieldIds: newIds,
      selectedFieldId: newIds.length === 1 ? newIds[0] : null,
      activeTool: 'select',
    };
  }),

  clearSelection: () => set({ selectedFieldId: null, selectedFieldIds: [] }),

  selectMultipleFields: (ids) => set({
    selectedFieldIds: ids,
    selectedFieldId: ids.length === 1 ? ids[0] : null,
    activeTool: 'select',
  }),

  updateMultipleFields: (ids, updates) => set((state) => ({
    fields: state.fields.map((field) =>
      ids.includes(field.id) ? { ...field, ...updates } : field
    ),
  })),

  // Move all selected fields by a delta (in PDF coordinates)
  moveMultipleFieldsByDelta: (deltaX, deltaY) => {
    const state = get();
    const selectedIds = state.selectedFieldIds;

    if (selectedIds.length <= 1) return;

    set((prevState) => ({
      fields: prevState.fields.map((field) => {
        if (selectedIds.includes(field.id)) {
          return {
            ...field,
            x: field.x + deltaX,
            y: field.y + deltaY,
          };
        }
        return field;
      }),
    }));
  },

  getFieldsForPage: (page) => {
    const state = get();
    return state.fields.filter((field) => field.pageNumber === page);
  },

  // Copy currently selected field to clipboard
  copyField: () => {
    const state = get();
    if (state.selectedFieldId) {
      const fieldToCopy = state.fields.find((f) => f.id === state.selectedFieldId);
      if (fieldToCopy) {
        set({ copiedField: { ...fieldToCopy } });
        console.log('✓ Field copied to clipboard:', fieldToCopy.name);
      }
    }
  },

  // Paste copied field at offset position
  pasteField: () => {
    const state = get();
    if (!state.copiedField) {
      console.warn('No field in clipboard');
      return;
    }

    // Generate new field with offset position
    const offsetX = 20; // 20pt offset to the right
    const offsetY = 20; // 20pt offset down

    const newField: Omit<FieldDefinition, 'id'> = {
      ...state.copiedField,
      name: `${state.copiedField.type}_${Date.now()}`, // New unique name
      x: state.copiedField.x + offsetX,
      y: state.copiedField.y - offsetY, // Subtract because PDF y-axis goes up
    };

    // Use addFieldWithUndo for undo/redo support
    state.addFieldWithUndo(newField);

    console.log('✓ Field pasted with undo support');
  },

  // Duplicate a specific field (for context menu/button)
  duplicateField: (id) => {
    const state = get();
    const fieldToDuplicate = state.fields.find((f) => f.id === id);

    if (!fieldToDuplicate) {
      console.warn('Field not found for duplication:', id);
      return;
    }

    // Generate new field with offset position
    const offsetX = 20;
    const offsetY = 20;

    const newField: Omit<FieldDefinition, 'id'> = {
      ...fieldToDuplicate,
      name: `${fieldToDuplicate.type}_${Date.now()}`,
      x: fieldToDuplicate.x + offsetX,
      y: fieldToDuplicate.y - offsetY,
    };

    // Use addFieldWithUndo for undo/redo support
    state.addFieldWithUndo(newField);

    console.log('✓ Field duplicated with undo support');
  },

  // Load fields from template (replace all fields)
  loadFields: (fields) => {
    // Initialize LastIndex based on loaded fields
    initializeLastIndex(fields);

    set({
      fields,
      selectedFieldId: null,
      selectedFieldIds: [],
    });
    console.log(`✓ Loaded ${fields.length} fields from template`);
  },

  // Undo/Redo actions
  undo: () => {
    const state = get();
    state.undoManager.undo();
  },

  redo: () => {
    const state = get();
    state.undoManager.redo();
  },

  canUndo: () => {
    const state = get();
    return state.undoManager.canUndo();
  },

  canRedo: () => {
    const state = get();
    return state.undoManager.canRedo();
  },

  // Drag actions
  startDrag: (x, y) =>
    set({
      isDragging: true,
      dragStartX: x,
      dragStartY: y,
      dragCurrentX: x,
      dragCurrentY: y,
    }),

  updateDragPosition: (x, y) =>
    set({
      dragCurrentX: x,
      dragCurrentY: y,
    }),

  endDrag: () =>
    set({
      isDragging: false,
      dragStartX: null,
      dragStartY: null,
      dragCurrentX: null,
      dragCurrentY: null,
    }),

  // Marquee selection actions
  startMarquee: (x, y) =>
    set({
      isMarqueeSelecting: true,
      marqueeStartX: x,
      marqueeStartY: y,
      marqueeEndX: x,
      marqueeEndY: y,
    }),

  updateMarquee: (x, y) =>
    set({
      marqueeEndX: x,
      marqueeEndY: y,
    }),

  endMarquee: () =>
    set({
      isMarqueeSelecting: false,
      marqueeStartX: null,
      marqueeStartY: null,
      marqueeEndX: null,
      marqueeEndY: null,
    }),

  // Metadata actions
  setPageMetadata: (pageNumber, metadata) =>
    set((state) => ({
      pagesMetadata: {
        ...state.pagesMetadata,
        [pageNumber]: metadata,
      },
    })),

  // Hover actions
  setHoveredField: (id) => set({ hoveredFieldId: id }),

  // Reset
  reset: () => set(initialState),

  // Crash Recovery
  restoreFromRecovery: (recoveryData) => {
    // Initialize LastIndex based on recovered fields
    initializeLastIndex(recoveryData.fields);

    set({
      currentPage: recoveryData.currentPage,
      zoomLevel: recoveryData.zoomLevel,
      fields: recoveryData.fields,
      totalPages: recoveryData.totalPages,
      selectedFieldId: null,
      selectedFieldIds: [],
    });
    console.log(`[Store] Restored ${recoveryData.fields.length} fields from recovery data`);
  },

  // Page Reprocessing - replace all fields for a specific page
  replaceFieldsForPage: (pageNumber, newFields) => {
    set((state) => {
      // Remove all existing fields for this page
      const fieldsFromOtherPages = state.fields.filter(f => f.pageNumber !== pageNumber);

      // Combine with new fields
      const allFields = [...fieldsFromOtherPages, ...newFields];

      // Re-initialize LastIndex based on all fields
      initializeLastIndex(allFields);

      console.log(`[Store] Replaced fields for page ${pageNumber}: removed old, added ${newFields.length} new`);

      return {
        fields: allFields,
        selectedFieldId: null,
      };
    });
  },
}));
