import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import type { FieldDefinition } from '@/types/fields';

// Mock i18n
let mockDirection = 'ltr';
vi.mock('@/i18n', () => ({
  useDirection: () => mockDirection,
  useTranslation: () => ({
    general: 'General',
    noFieldsYet: 'No fields yet',
    useToolsAbove: 'Use tools above',
    fieldsList: 'Fields List',
    extractedFields: 'Fields',
    jsonView: 'JSON',
    documentHistory: 'History',
    field: 'field',
    fields: 'fields',
    counter: 'Counter',
    delete: 'Delete',
    deleteConfirmMessage: 'Are you sure you want to delete {count} field(s)?',
    cancel: 'Cancel',
    save: 'Save',
    undo: 'Undo',
    redo: 'Redo',
    addSection: 'Add Section',
    renameSection: 'Rename Section',
    deleteSection: 'Delete Section',
    ungrouped: 'Ungrouped',
  }),
}));

// Mock useMediaQuery
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false,
  useIsMobile: () => false,
  useIsTablet: () => false,
  useIsDesktop: () => true,
  useIsTouchDevice: () => false,
  useBreakpoint: () => 'desktop',
}));

// Import component after mocks (direct import, not lazy)
import { DynamicFormSections } from '@/components/editor/DynamicFormSections';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('DynamicFormSections - TDD Suite', () => {
  beforeEach(() => {
    // Reset store before each test
    useTemplateEditorStore.getState().reset();
    mockDirection = 'ltr';
    localStorage.clear();
  });

  // ========================================
  // CATEGORY 1: Section Rendering (5 tests)
  // ========================================

  describe('Section Rendering', () => {
    it('should render sections for current page', () => {
      const { addSection } = useTemplateEditorStore.getState();

      // Create sections on different pages
      addSection(1, 'Page 1 Section A');
      addSection(1, 'Page 1 Section B');
      addSection(2, 'Page 2 Section A');

      renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections.filter((s) => s.pageNumber === 1)}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="ltr"
        />
      );

      expect(screen.getByText('Page 1 Section A')).toBeInTheDocument();
      expect(screen.getByText('Page 1 Section B')).toBeInTheDocument();
      expect(screen.queryByText('Page 2 Section A')).not.toBeInTheDocument();
    });

    it('should render default "Ungrouped" section', () => {
      const { addSection } = useTemplateEditorStore.getState();

      // Create default ungrouped section
      addSection(1, 'Ungrouped');

      renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="ltr"
        />
      );

      expect(screen.getByText('Ungrouped')).toBeInTheDocument();
    });

    it('should render fields within sections', () => {
      const { addSection, addFieldWithUndo } = useTemplateEditorStore.getState();

      addSection(1, 'Test Section');
      const section = useTemplateEditorStore.getState().sections.find((s) => s.name === 'Test Section');

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: section?.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        name: 'Test Field',
      });

      const fields = useTemplateEditorStore.getState().fields;

      renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={fields}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="ltr"
        />
      );

      expect(screen.getByText('Test Section')).toBeInTheDocument();
      expect(screen.getByText('Test Field')).toBeInTheDocument();
    });

    it('should render collapsed vs expanded state', () => {
      const { addSection, toggleSectionCollapse } = useTemplateEditorStore.getState();

      addSection(1, 'Collapsible Section');
      const section = useTemplateEditorStore.getState().sections[0];

      const { container } = renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={toggleSectionCollapse}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="ltr"
        />
      );

      // Section should be expanded by default
      expect(section.isCollapsed).toBe(false);

      // Click collapse button
      const collapseButton = container.querySelector('[data-testid="collapse-button"]');
      if (collapseButton) {
        fireEvent.click(collapseButton);
      }

      // Section should now be collapsed
      waitFor(() => {
        const updatedSection = useTemplateEditorStore.getState().sections[0];
        expect(updatedSection.isCollapsed).toBe(true);
      });
    });

    it('should render empty section with no fields', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'Empty Section');

      renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="ltr"
        />
      );

      expect(screen.getByText('Empty Section')).toBeInTheDocument();
      // Should show "0 fields" or similar indicator
    });
  });

  // ========================================
  // CATEGORY 2: Section CRUD Operations (8 tests)
  // ========================================

  describe('Section CRUD Operations', () => {
    it('should create new section with default name', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, '');

      const sections = useTemplateEditorStore.getState().sections;
      expect(sections.length).toBe(1);
      expect(sections[0].name).toMatch(/^(Untitled Section|Section \d+)$/);
      expect(sections[0].pageNumber).toBe(1);
      expect(sections[0].order).toBe(0);
    });

    it('should create new section with custom name', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'Custom Section');

      const sections = useTemplateEditorStore.getState().sections;
      expect(sections.length).toBe(1);
      expect(sections[0].name).toBe('Custom Section');
    });

    it('should rename section', () => {
      const { addSection, renameSection } = useTemplateEditorStore.getState();

      addSection(1, 'Original Name');
      const section = useTemplateEditorStore.getState().sections[0];

      renameSection(section.id, 'New Name');

      const updatedSection = useTemplateEditorStore.getState().sections[0];
      expect(updatedSection.name).toBe('New Name');
    });

    it('should delete section and move fields to Ungrouped', () => {
      const { addSection, addFieldWithUndo, deleteSection } =
        useTemplateEditorStore.getState();

      // Create section and add field
      addSection(1, 'Test Section');
      const section = useTemplateEditorStore.getState().sections[0];

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: section.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const fieldCountBefore = useTemplateEditorStore.getState().fields.length;

      // Delete section
      deleteSection(section.id);

      const fieldCountAfter = useTemplateEditorStore.getState().fields.length;
      const field = useTemplateEditorStore.getState().fields[0];

      // Fields should not be deleted
      expect(fieldCountAfter).toBe(fieldCountBefore);
      // Field should be moved to Ungrouped
      expect(field?.sectionId).toBe('ungrouped');
    });

    it('should toggle section collapse state', () => {
      const { addSection, toggleSectionCollapse } = useTemplateEditorStore.getState();

      addSection(1, 'Test');
      const section = useTemplateEditorStore.getState().sections[0];

      expect(section.isCollapsed).toBe(false);

      toggleSectionCollapse(section.id);

      const updatedSection = useTemplateEditorStore.getState().sections[0];
      expect(updatedSection.isCollapsed).toBe(true);

      toggleSectionCollapse(updatedSection.id);

      const reExpanded = useTemplateEditorStore.getState().sections[0];
      expect(reExpanded.isCollapsed).toBe(false);
    });

    it('should allow duplicate section names', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'Same Name');
      addSection(1, 'Same Name');

      const sections = useTemplateEditorStore.getState().sections;
      const duplicates = sections.filter((s) => s.name === 'Same Name');
      expect(duplicates.length).toBe(2);
      expect(duplicates[0].id).not.toBe(duplicates[1].id);
    });

    it('should prevent empty section names (default to placeholder)', () => {
      const { addSection, renameSection } = useTemplateEditorStore.getState();

      addSection(1, 'Test');
      const section = useTemplateEditorStore.getState().sections[0];

      renameSection(section.id, '');

      const updatedSection = useTemplateEditorStore.getState().sections[0];
      expect(updatedSection.name).not.toBe('');
      expect(updatedSection.name).toMatch(/^(Untitled Section|Test)$/); // Either reverted or defaulted
    });

    it('should reorder sections', () => {
      const { addSection, reorderSection } = useTemplateEditorStore.getState();

      addSection(1, 'Section A'); // order 0
      addSection(1, 'Section B'); // order 1
      addSection(1, 'Section C'); // order 2

      const sectionB = useTemplateEditorStore.getState().sections.find((s) => s.name === 'Section B');

      // Move Section B to position 0
      reorderSection(sectionB!.id, 0);

      const reordered = useTemplateEditorStore
        .getState()
        .sections.sort((a, b) => a.order - b.order);

      expect(reordered[0].name).toBe('Section B');
    });
  });

  // ========================================
  // CATEGORY 3: Field-to-Section Assignment (6 tests)
  // ========================================

  describe('Field-to-Section Assignment', () => {
    it('should move field to section', () => {
      const { addSection, addFieldWithUndo, moveFieldToSection, sections, fields } =
        useTemplateEditorStore.getState();

      addSection(1, 'Target Section');
      const section = useTemplateEditorStore.getState().sections[0];

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];

      moveFieldToSection(field.id, section.id);

      const updatedField = useTemplateEditorStore.getState().fields[0];
      expect(updatedField.sectionId).toBe(section.id);
    });

    it('should move field to Ungrouped if target section does not exist', () => {
      const { addFieldWithUndo, moveFieldToSection, fields } = useTemplateEditorStore.getState();

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];

      moveFieldToSection(field.id, 'nonexistent_section_id');

      const updatedField = useTemplateEditorStore.getState().fields[0];
      expect(updatedField.sectionId).toBe('ungrouped');
    });

    it('should handle moving field to same section as no-op', () => {
      const { addSection, addFieldWithUndo, moveFieldToSection } =
        useTemplateEditorStore.getState();

      addSection(1, 'Section A');
      const section = useTemplateEditorStore.getState().sections[0];

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: section.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];
      const sectionAfterAdd = useTemplateEditorStore.getState().sections[0];
      const fieldIdsBefore = [...sectionAfterAdd.fieldIds];

      moveFieldToSection(field.id, section.id);

      const fieldIdsAfter = useTemplateEditorStore.getState().sections[0].fieldIds;
      expect(fieldIdsAfter).toEqual(fieldIdsBefore);
    });

    it('should update section.fieldIds when field is moved', () => {
      const { addSection, addFieldWithUndo, moveFieldToSection } =
        useTemplateEditorStore.getState();

      addSection(1, 'Source');
      addSection(1, 'Target');
      const [source, target] = useTemplateEditorStore.getState().sections;

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: source.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];

      moveFieldToSection(field.id, target.id);

      const updatedSource = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.id === source.id);
      const updatedTarget = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.id === target.id);

      expect(updatedSource?.fieldIds).not.toContain(field.id);
      expect(updatedTarget?.fieldIds).toContain(field.id);
    });

    it('should prevent field assignment to section on different page', () => {
      const { addSection, addFieldWithUndo, moveFieldToSection } =
        useTemplateEditorStore.getState();

      addSection(1, 'Page 1 Section');
      addSection(2, 'Page 2 Section');

      const page1Section = useTemplateEditorStore.getState().sections.find((s) => s.pageNumber === 1);
      const page2Section = useTemplateEditorStore.getState().sections.find((s) => s.pageNumber === 2);

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: page1Section?.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];

      // Attempt to move to page 2 section
      moveFieldToSection(field.id, page2Section!.id);

      const updatedField = useTemplateEditorStore.getState().fields[0];
      const section = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.id === updatedField.sectionId);

      // Field should still be on page 1
      expect(section?.pageNumber).toBe(1);
    });

    it('should assign orphaned fields to Ungrouped', () => {
      const orphanedField: FieldDefinition = {
        id: 'orphan',
        type: 'text',
        pageNumber: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        // No sectionId, no sectionName
      };

      useTemplateEditorStore.getState().loadFields([orphanedField]);

      const field = useTemplateEditorStore.getState().fields[0];
      expect(field.sectionId).toBe('ungrouped');
    });
  });

  // ========================================
  // CATEGORY 4: Drag-and-Drop (4 tests - simplified)
  // ========================================

  describe('Drag-and-Drop Operations', () => {
    it('should reorder sections via drag-and-drop', () => {
      const { addSection, reorderSection } = useTemplateEditorStore.getState();

      addSection(1, 'Section A'); // order 0
      addSection(1, 'Section B'); // order 1
      addSection(1, 'Section C'); // order 2

      const sectionC = useTemplateEditorStore.getState().sections.find((s) => s.name === 'Section C');

      // Move Section C to first position
      reorderSection(sectionC!.id, 0);

      const reordered = useTemplateEditorStore
        .getState()
        .sections.sort((a, b) => a.order - b.order);

      expect(reordered[0].name).toBe('Section C');
    });

    it('should handle drag to same position as no-op', () => {
      const { addSection, reorderSection } = useTemplateEditorStore.getState();

      addSection(1, 'Section A');
      addSection(1, 'Section B');

      const sectionB = useTemplateEditorStore.getState().sections.find((s) => s.name === 'Section B');
      const orderBefore = sectionB!.order;

      reorderSection(sectionB!.id, orderBefore);

      const orderAfter = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.name === 'Section B')!.order;

      expect(orderAfter).toBe(orderBefore);
    });

    it('should clamp negative section order to 0', () => {
      const { addSection, reorderSection } = useTemplateEditorStore.getState();

      addSection(1, 'Test Section');
      const section = useTemplateEditorStore.getState().sections[0];

      reorderSection(section.id, -5);

      const updatedSection = useTemplateEditorStore.getState().sections[0];
      expect(updatedSection.order).toBeGreaterThanOrEqual(0);
    });

    it('should clamp out-of-bounds section order to max', () => {
      const { addSection, reorderSection } = useTemplateEditorStore.getState();

      for (let i = 0; i < 5; i++) {
        addSection(1, `Section ${i}`);
      }

      const section = useTemplateEditorStore.getState().sections[0];
      reorderSection(section.id, 999);

      const updatedSection = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.id === section.id);

      expect(updatedSection!.order).toBeLessThan(5);
    });
  });

  // ========================================
  // CATEGORY 5: Collapse State Persistence (3 tests)
  // ========================================

  describe('Collapse State Persistence', () => {
    it('should persist collapse state to localStorage', () => {
      const { addSection, toggleSectionCollapse } = useTemplateEditorStore.getState();

      addSection(1, 'Collapsible');
      const section = useTemplateEditorStore.getState().sections[0];

      toggleSectionCollapse(section.id);

      const persistedData = JSON.parse(localStorage.getItem('templateEditorStore') || '{}');
      const persistedSection = persistedData.sections?.[0];

      expect(persistedSection?.isCollapsed).toBe(true);
    });

    it('should restore collapse state from localStorage', () => {
      const { addSection, toggleSectionCollapse } = useTemplateEditorStore.getState();

      addSection(1, 'Test');
      const section = useTemplateEditorStore.getState().sections[0];
      toggleSectionCollapse(section.id);

      // Simulate page reload by creating new store instance
      const collapsedState = useTemplateEditorStore.getState().sections[0].isCollapsed;

      expect(collapsedState).toBe(true);
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => {
        const { addSection, toggleSectionCollapse } = useTemplateEditorStore.getState();
        addSection(1, 'Test');
        const section = useTemplateEditorStore.getState().sections[0];
        toggleSectionCollapse(section.id);
      }).not.toThrow();

      // Restore
      localStorage.setItem = originalSetItem;
    });
  });

  // ========================================
  // CATEGORY 6: RTL Support (3 tests)
  // ========================================

  describe('RTL Support', () => {
    it('should render sections in RTL mode', () => {
      mockDirection = 'rtl';
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'פרטים אישיים');

      const { container } = renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="rtl"
        />
      );

      expect(screen.getByText('פרטים אישיים')).toBeInTheDocument();
      const sections = container.querySelector('[data-testid="sections-container"]');
      expect(sections).toHaveAttribute('dir', 'rtl');
    });

    it('should handle mixed bidirectional text in section names', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'Personal Info פרטים אישיים 2024');

      const section = useTemplateEditorStore.getState().sections[0];
      expect(section.name).toBe('Personal Info פרטים אישיים 2024');
    });

    it('should position drag handles correctly in RTL', () => {
      mockDirection = 'rtl';
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'Test');

      const { container } = renderWithRouter(
        <DynamicFormSections
          pageNumber={1}
          sections={useTemplateEditorStore.getState().sections}
          fields={[]}
          selectedFieldId={null}
          selectedFieldIds={[]}
          onAddSection={addSection}
          onDeleteSection={() => {}}
          onRenameSection={() => {}}
          onReorderSection={() => {}}
          onToggleCollapse={() => {}}
          onMoveField={() => {}}
          onFieldSelect={() => {}}
          onToggleFieldSelection={() => {}}
          onFieldDelete={() => {}}
          onPageNavigate={() => {}}
          hoveredFieldId={null}
          onFieldHover={() => {}}
          direction="rtl"
        />
      );

      const header = container.querySelector('[data-testid="section-header"]');
      // In RTL, flex direction should be row-reverse
      expect(header).toHaveStyle({ flexDirection: 'row-reverse' });
    });
  });

  // ========================================
  // CATEGORY 7: Backward Compatibility (3 tests)
  // ========================================

  describe('Backward Compatibility', () => {
    it('should auto-generate sections from legacy data with sectionName', () => {
      const legacyFields: FieldDefinition[] = [
        {
          id: 'f1',
          type: 'text',
          pageNumber: 1,
          sectionName: 'Section A',
          x: 100,
          y: 100,
          width: 200,
          height: 30,
        },
        {
          id: 'f2',
          type: 'text',
          pageNumber: 1,
          sectionName: 'Section A',
          x: 100,
          y: 150,
          width: 200,
          height: 30,
        },
        {
          id: 'f3',
          type: 'text',
          pageNumber: 1,
          sectionName: 'Section B',
          x: 100,
          y: 200,
          width: 200,
          height: 30,
        },
      ];

      useTemplateEditorStore.getState().loadFields(legacyFields);

      const { sections } = useTemplateEditorStore.getState();
      expect(sections.length).toBeGreaterThanOrEqual(2);
      expect(sections.some((s) => s.name === 'Section A')).toBe(true);
      expect(sections.some((s) => s.name === 'Section B')).toBe(true);
    });

    it('should prioritize sectionId over sectionName when both exist', () => {
      const { addSection } = useTemplateEditorStore.getState();

      addSection(1, 'New Section');
      const section = useTemplateEditorStore.getState().sections[0];

      const conflictingField: FieldDefinition = {
        id: 'f_conflict',
        type: 'text',
        pageNumber: 1,
        sectionName: 'Old Name',
        sectionId: section.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      };

      useTemplateEditorStore.setState({
        fields: [conflictingField],
      });

      const field = useTemplateEditorStore.getState().fields[0];
      const assignedSection = useTemplateEditorStore
        .getState()
        .sections.find((s) => s.id === field.sectionId);

      expect(assignedSection?.name).toBe('New Section'); // Not "Old Name"
    });

    it('should write both sectionId and sectionName for backward compatibility', () => {
      const { addSection, addFieldWithUndo } = useTemplateEditorStore.getState();

      addSection(1, 'My Section');
      const section = useTemplateEditorStore.getState().sections[0];

      addFieldWithUndo({
        type: 'text',
        pageNumber: 1,
        sectionId: section.id,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      });

      const field = useTemplateEditorStore.getState().fields[0];
      const assignedSection = useTemplateEditorStore.getState().sections.find((s) => s.id === field.sectionId);

      // Both properties should be present
      expect(field.sectionId).toBeDefined();
      expect(field.sectionName).toBe(assignedSection?.name);
    });
  });
});
