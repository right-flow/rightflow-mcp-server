import { create } from 'zustand';
import { FieldDefinition, ToolMode, PageMetadata, FormSection } from '@/types/fields';
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

  // Section state (NEW - v2.0)
  sections: FormSection[];

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

  // AI Field Extraction state (NEW)
  isExtractingFields: boolean;
  extractionProgress: {
    message: string;        // Hebrew status message
    currentPage?: number;   // Optional: current page
    totalPages?: number;    // Optional: total pages
  } | null;

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

  // Actions - AI Extraction (NEW)
  startExtraction: () => void;
  endExtraction: () => void;
  setExtractionProgress: (progress: { message: string; currentPage?: number; totalPages?: number }) => void;
  clearExtractionProgress: () => void;

  // Actions - Reset
  reset: () => void;

  // Actions - Crash Recovery
  restoreFromRecovery: (recoveryData: RecoveryData) => void;

  // Actions - Page Reprocessing
  replaceFieldsForPage: (pageNumber: number, newFields: FieldDefinition[]) => void;

  // Actions - Sections (NEW - v2.0)
  addSection: (pageNumber: number, name?: string) => void;
  deleteSection: (sectionId: string) => void;
  renameSection: (sectionId: string, newName: string) => void;
  reorderSection: (sectionId: string, newOrder: number) => void;
  toggleSectionCollapse: (sectionId: string) => void;
  moveFieldToSection: (fieldId: string, sectionId: string) => void;
  reorderFieldInSection: (sectionId: string, fieldId: string, newIndex: number) => void;
  getSectionsForPage: (pageNumber: number) => FormSection[];
  ensureUngroupedSection: (pageNumber: number) => void;
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
  sections: [] as FormSection[], // NEW - v2.0
  isExtractingFields: false,
  extractionProgress: null,
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

    // Ensure Ungrouped section exists for this page
    get().ensureUngroupedSection(fieldData.pageNumber);

    // Auto-generate field name if not provided or empty
    let fieldName = fieldData.name;
    if (!fieldName || fieldName === '') {
      // Count fields of this type to generate next number
      const fieldsOfType = state.fields.filter(f => f.type === fieldData.type);
      const nextNumber = fieldsOfType.length + 1;
      fieldName = `${fieldData.type}_${nextNumber}`;
    }

    // Handle section assignment (NEW - v2.0)
    let sectionId = fieldData.sectionId;
    let sectionName = fieldData.sectionName;

    if (!sectionId) {
      // No sectionId provided - need to assign to a section
      // Priority: 1) Use provided sectionName, 2) Inherit from last field, 3) Default to Ungrouped
      if (!sectionName && state.lastUpdatedFieldId) {
        const lastUpdatedField = state.fields.find(f => f.id === state.lastUpdatedFieldId);
        if (lastUpdatedField?.sectionId) {
          sectionId = lastUpdatedField.sectionId;
        } else if (lastUpdatedField?.sectionName) {
          sectionName = lastUpdatedField.sectionName;
        }
      }

      // Find or create section
      if (sectionName && !sectionId) {
        // Find existing section by name on this page
        const existingSection = state.sections.find(
          s => s.name === sectionName && s.pageNumber === fieldData.pageNumber,
        );
        if (existingSection) {
          sectionId = existingSection.id;
        } else {
          // Auto-create section from sectionName
          const newSectionId = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const sectionsOnPage = state.sections.filter(s => s.pageNumber === fieldData.pageNumber);
          const newSection: FormSection = {
            id: newSectionId,
            name: sectionName,
            pageNumber: fieldData.pageNumber,
            order: sectionsOnPage.length,
            isCollapsed: false,
            fieldIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add section to store
          set((prevState) => ({
            sections: [...prevState.sections, newSection],
          }));

          sectionId = newSectionId;
          console.log(`[Store] Auto-created section: ${sectionName}`);
        }
      }

      // Default to 'ungrouped_pageX' if still no section
      if (!sectionId) {
        sectionId = `ungrouped_page${fieldData.pageNumber}`;
        sectionName = 'Ungrouped';
      }
    } else {
      // sectionId provided - get sectionName from section
      const section = state.sections.find(s => s.id === sectionId);
      if (section) {
        sectionName = section.name;
      } else {
        // Invalid sectionId - fall back to Ungrouped for this page
        sectionId = `ungrouped_page${fieldData.pageNumber}`;
        sectionName = 'Ungrouped';
      }
    }

    // Get next creation order index
    const fieldIndex = getNextFieldIndex();

    const newField: FieldDefinition = {
      ...fieldData,
      name: fieldName,
      sectionId, // NEW - v2.0
      sectionName, // Backward compatibility
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
          // Update section's fieldIds
          sections: prevState.sections.map(s =>
            s.id === field.sectionId && !s.fieldIds.includes(field.id)
              ? { ...s, fieldIds: [...s.fieldIds, field.id], updatedAt: new Date() }
              : s,
          ),
        }));

        // Track field customization for onboarding progress
        if (!localStorage.getItem('onboarding_has_customized')) {
          localStorage.setItem('onboarding_has_customized', 'true');
        }
      },
      deleteField: (id) => {
        const _fieldToDelete = state.fields.find(f => f.id === id);
        set((prevState) => ({
          fields: prevState.fields.filter((f) => f.id !== id),
          selectedFieldId: prevState.selectedFieldId === id ? null : prevState.selectedFieldId,
          // Remove from section's fieldIds
          sections: prevState.sections.map(s =>
            s.fieldIds.includes(id)
              ? { ...s, fieldIds: s.fieldIds.filter(fid => fid !== id), updatedAt: new Date() }
              : s,
          ),
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

        // Track field customization for onboarding progress
        if (!localStorage.getItem('onboarding_has_customized')) {
          localStorage.setItem('onboarding_has_customized', 'true');
        }
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
      ids.includes(field.id) ? { ...field, ...updates } : field,
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

    const state = get();

    // Backward compatibility: Auto-generate sections from sectionName if no sections exist
    const needsSectionMigration = state.sections.length === 0 && fields.some(f => f.sectionName && !f.sectionId);

    if (needsSectionMigration) {
      console.log('[Store] Migrating legacy data: generating sections from sectionName');

      // Collect unique section names per page
      const sectionsByPage: Record<number, Set<string>> = {};
      fields.forEach(field => {
        const page = field.pageNumber;
        const sectionName = field.sectionName || 'Ungrouped';

        if (!sectionsByPage[page]) {
          sectionsByPage[page] = new Set();
        }
        sectionsByPage[page].add(sectionName);
      });

      // Create sections
      const newSections: FormSection[] = [];
      let orderCounter = 0;

      Object.entries(sectionsByPage).forEach(([pageStr, sectionNames]) => {
        const page = parseInt(pageStr);
        sectionNames.forEach(sectionName => {
          // Use page-specific 'ungrouped_pageX' ID for Ungrouped sections
          const sectionId = sectionName === 'Ungrouped'
            ? `ungrouped_page${page}`
            : `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          newSections.push({
            id: sectionId,
            name: sectionName,
            pageNumber: page,
            order: orderCounter++,
            isCollapsed: false,
            fieldIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      });

      // Assign fields to sections
      const updatedFields = fields.map(field => {
        const sectionName = field.sectionName || 'Ungrouped';
        const section = newSections.find(
          s => s.name === sectionName && s.pageNumber === field.pageNumber,
        );

        if (section && !field.sectionId) {
          // Update section's fieldIds
          if (!section.fieldIds.includes(field.id)) {
            section.fieldIds.push(field.id);
          }
          return { ...field, sectionId: section.id };
        }
        return field;
      });

      set({
        fields: updatedFields,
        sections: newSections,
        selectedFieldId: null,
        selectedFieldIds: [],
      });

      console.log(`✓ Loaded ${fields.length} fields and migrated to ${newSections.length} sections`);
    } else {
      // Normal load without migration
      // Check for orphaned fields (no sectionId) and assign them to "ungrouped"
      const fieldsWithOrphans = fields.some(f => !f.sectionId);

      if (fieldsWithOrphans) {
        const updatedFields = fields.map(f =>
          !f.sectionId ? { ...f, sectionId: `ungrouped_page${f.pageNumber}`, sectionName: 'Ungrouped' } : f,
        );

        // Find all unique pages with fields
        const pagesWithFields = [...new Set(updatedFields.map(f => f.pageNumber))];

        // Ensure Ungrouped section exists for each page
        pagesWithFields.forEach(pageNumber => {
          get().ensureUngroupedSection(pageNumber);
        });

        set({
          fields: updatedFields,
          selectedFieldId: null,
          selectedFieldIds: [],
        });

        console.log(`✓ Loaded ${fields.length} fields (assigned orphaned fields to Ungrouped)`);
      } else {
        // Even if no orphans, ensure Ungrouped sections exist for all pages with fields
        const pagesWithFields = [...new Set(fields.map(f => f.pageNumber))];
        pagesWithFields.forEach(pageNumber => {
          get().ensureUngroupedSection(pageNumber);
        });

        set({
          fields,
          selectedFieldId: null,
          selectedFieldIds: [],
        });
        console.log(`✓ Loaded ${fields.length} fields from template`);
      }
    }
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

  // AI Extraction actions
  startExtraction: () =>
    set({
      isExtractingFields: true,
      extractionProgress: { message: 'מתחיל זיהוי שדות...' },
    }),

  endExtraction: () =>
    set({
      isExtractingFields: false,
      extractionProgress: null,
    }),

  setExtractionProgress: (progress) =>
    set({
      extractionProgress: progress,
    }),

  clearExtractionProgress: () =>
    set({
      extractionProgress: null,
    }),

  // Reset
  reset: () => set({
    ...initialState,
    undoManager: new UndoManager(), // Create new instance to avoid sharing references
    sections: [], // Explicitly reset sections
    fields: [], // Explicitly reset fields
    isExtractingFields: false, // Reset extraction state
    extractionProgress: null,
  }),

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

  // ========================================
  // Section Actions (NEW - v2.0)
  // ========================================

  addSection: (pageNumber, name) => {
    const state = get();

    // Generate unique ID
    const sectionId = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use provided name or generate default
    const sectionName = name && name.trim() !== '' ? name : `Section ${state.sections.length + 1}`;

    // Calculate order (last position on page)
    const sectionsOnPage = state.sections.filter(s => s.pageNumber === pageNumber);
    const order = sectionsOnPage.length;

    const newSection: FormSection = {
      id: sectionId,
      name: sectionName,
      pageNumber,
      order,
      isCollapsed: false,
      fieldIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((prevState) => ({
      sections: [...prevState.sections, newSection],
    }));

    console.log(`[Store] Added section: ${sectionName} on page ${pageNumber}`);
  },

  // Helper: Ensure Ungrouped section exists for page
  ensureUngroupedSection: (pageNumber: number) => {
    const state = get();
    const ungroupedId = `ungrouped_page${pageNumber}`;
    const ungroupedExists = state.sections.some(
      s => s.id === ungroupedId && s.pageNumber === pageNumber,
    );

    if (!ungroupedExists) {
      const newSection: FormSection = {
        id: ungroupedId,
        name: 'Ungrouped',
        pageNumber,
        order: 999, // Put at end
        isCollapsed: false,
        fieldIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((prevState) => ({
        sections: [...prevState.sections, newSection],
      }));

      console.log(`[Store] Auto-created Ungrouped section for page ${pageNumber}`);
    }
  },

  deleteSection: (sectionId) => {
    const state = get();

    // Prevent deletion of default "Ungrouped" sections
    if (sectionId.startsWith('ungrouped_page')) {
      console.warn('[Store] Cannot delete default Ungrouped section');
      return;
    }

    const section = state.sections.find(s => s.id === sectionId);
    if (!section) {
      console.warn(`[Store] Section not found: ${sectionId}`);
      return;
    }

    // Move fields to "Ungrouped" section for the same page
    const fieldsToMove = state.fields.filter(f => f.sectionId === sectionId);
    const ungroupedId = `ungrouped_page${section.pageNumber}`;

    // Ensure Ungrouped section exists for this page before moving fields
    get().ensureUngroupedSection(section.pageNumber);

    set((prevState) => ({
      sections: prevState.sections.map(s => {
        if (s.id === ungroupedId) {
          // Add moved field IDs to Ungrouped section
          const movedFieldIds = fieldsToMove.map(f => f.id);
          const newFieldIds = [...s.fieldIds, ...movedFieldIds.filter(id => !s.fieldIds.includes(id))];
          return { ...s, fieldIds: newFieldIds, updatedAt: new Date() };
        }
        return s;
      }).filter(s => s.id !== sectionId),
      fields: prevState.fields.map(f =>
        f.sectionId === sectionId ? { ...f, sectionId: ungroupedId, sectionName: 'Ungrouped' } : f,
      ),
    }));

    console.log(`[Store] Deleted section: ${section.name}, moved ${fieldsToMove.length} fields to Ungrouped`);
  },

  renameSection: (sectionId, newName) => {
    const trimmedName = newName.trim();

    // Prevent empty names
    if (trimmedName === '') {
      console.warn('[Store] Cannot rename section to empty string');
      return;
    }

    set((state) => ({
      sections: state.sections.map(s =>
        s.id === sectionId ? { ...s, name: trimmedName, updatedAt: new Date() } : s,
      ),
      // Update field.sectionName for backward compatibility
      fields: state.fields.map(f =>
        f.sectionId === sectionId ? { ...f, sectionName: trimmedName } : f,
      ),
    }));

    console.log(`[Store] Renamed section to: ${trimmedName}`);
  },

  reorderSection: (sectionId, newOrder) => {
    const state = get();
    const section = state.sections.find(s => s.id === sectionId);

    if (!section) {
      console.warn(`[Store] Section not found: ${sectionId}`);
      return;
    }

    const sectionsOnPage = state.sections.filter(s => s.pageNumber === section.pageNumber);
    const oldOrder = section.order;

    // Clamp order to valid range
    const clampedOrder = Math.max(0, Math.min(newOrder, sectionsOnPage.length - 1));

    // No-op if order doesn't change
    if (oldOrder === clampedOrder) {
      return;
    }

    set((prevState) => ({
      sections: prevState.sections.map(s => {
        // Skip sections on other pages
        if (s.pageNumber !== section.pageNumber) {
          return s;
        }

        // Move the target section to new position
        if (s.id === sectionId) {
          return { ...s, order: clampedOrder, updatedAt: new Date() };
        }

        // Shift other sections
        if (oldOrder < clampedOrder) {
          // Moving down: shift sections between old and new position up
          if (s.order > oldOrder && s.order <= clampedOrder) {
            return { ...s, order: s.order - 1, updatedAt: new Date() };
          }
        } else {
          // Moving up: shift sections between new and old position down
          if (s.order >= clampedOrder && s.order < oldOrder) {
            return { ...s, order: s.order + 1, updatedAt: new Date() };
          }
        }

        return s;
      }),
    }));

    console.log(`[Store] Reordered section from ${oldOrder} to ${clampedOrder}`);
  },

  toggleSectionCollapse: (sectionId) => {
    set((state) => ({
      sections: state.sections.map(s =>
        s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed, updatedAt: new Date() } : s,
      ),
    }));

    console.log(`[Store] Toggled collapse state for section: ${sectionId}`);
  },

  moveFieldToSection: (fieldId, sectionId) => {
    const state = get();
    const field = state.fields.find(f => f.id === fieldId);

    if (!field) {
      console.warn(`[Store] Field not found: ${fieldId}`);
      return;
    }

    // Check if target section exists
    const targetSection = state.sections.find(s => s.id === sectionId);

    // If section doesn't exist or is on different page, move to Ungrouped
    if (!targetSection || targetSection.pageNumber !== field.pageNumber) {
      const ungroupedId = `ungrouped_page${field.pageNumber}`;
      get().ensureUngroupedSection(field.pageNumber);

      set((prevState) => ({
        fields: prevState.fields.map(f =>
          f.id === fieldId ? { ...f, sectionId: ungroupedId, sectionName: 'Ungrouped' } : f,
        ),
        sections: prevState.sections.map(s => {
          if (s.id === ungroupedId && !s.fieldIds.includes(fieldId)) {
            return { ...s, fieldIds: [...s.fieldIds, fieldId], updatedAt: new Date() };
          }
          // Remove from old section
          if (s.fieldIds.includes(fieldId) && s.id !== ungroupedId) {
            return { ...s, fieldIds: s.fieldIds.filter(id => id !== fieldId), updatedAt: new Date() };
          }
          return s;
        }),
      }));
      console.warn(`[Store] Target section invalid, moved field to Ungrouped`);
      return;
    }

    // Update field's sectionId and sectionName (backward compat)
    set((prevState) => ({
      fields: prevState.fields.map(f =>
        f.id === fieldId ? { ...f, sectionId, sectionName: targetSection.name } : f,
      ),
      // Update section's fieldIds array
      sections: prevState.sections.map(s => {
        if (s.id === sectionId && !s.fieldIds.includes(fieldId)) {
          return { ...s, fieldIds: [...s.fieldIds, fieldId], updatedAt: new Date() };
        }
        // Remove from old section
        if (s.fieldIds.includes(fieldId) && s.id !== sectionId) {
          return { ...s, fieldIds: s.fieldIds.filter(id => id !== fieldId), updatedAt: new Date() };
        }
        return s;
      }),
    }));

    console.log(`[Store] Moved field ${fieldId} to section: ${targetSection.name}`);
  },

  reorderFieldInSection: (sectionId, fieldId, newIndex) => {
    const state = get();
    const section = state.sections.find(s => s.id === sectionId);

    if (!section) {
      console.warn(`[Store] Section not found: ${sectionId}`);
      return;
    }

    const fieldIds = [...section.fieldIds];
    const currentIndex = fieldIds.indexOf(fieldId);

    if (currentIndex === -1) {
      console.warn(`[Store] Field not in section: ${fieldId}`);
      return;
    }

    // Reorder array
    fieldIds.splice(currentIndex, 1);
    fieldIds.splice(newIndex, 0, fieldId);

    set((prevState) => ({
      sections: prevState.sections.map(s =>
        s.id === sectionId ? { ...s, fieldIds, updatedAt: new Date() } : s,
      ),
    }));

    console.log(`[Store] Reordered field in section: ${fieldId} to index ${newIndex}`);
  },

  getSectionsForPage: (pageNumber) => {
    const state = get();
    return state.sections
      .filter(s => s.pageNumber === pageNumber)
      .sort((a, b) => a.order - b.order);
  },
}));
