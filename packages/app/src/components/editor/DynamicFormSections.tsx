import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical, ChevronDown, ChevronRight, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import type { FormSection, FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';
import { useTranslation } from '@/i18n';

export interface DynamicFormSectionsProps {
  pageNumber: number;
  sections: FormSection[];
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[];
  errorFieldIds?: Set<string>;
  onAddSection: (pageNumber: number, name?: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, newName: string) => void;
  onReorderSection: (sectionId: string, newOrder: number) => void;
  onToggleCollapse: (sectionId: string) => void;
  onMoveField: (fieldId: string, sectionId: string) => void;
  onFieldSelect: (fieldId: string) => void;
  onToggleFieldSelection: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onPageNavigate: (pageNumber: number) => void;
  hoveredFieldId: string | null;
  onFieldHover: (fieldId: string | null) => void;
  direction: 'ltr' | 'rtl';
}

export const DynamicFormSections = ({
  pageNumber,
  sections,
  fields,
  selectedFieldId,
  selectedFieldIds,
  errorFieldIds,
  onAddSection,
  onDeleteSection,
  onRenameSection,
  onReorderSection,
  onToggleCollapse,
  onMoveField,
  onFieldSelect,
  onToggleFieldSelection,
  onFieldDelete,
  onPageNavigate,
  hoveredFieldId,
  onFieldHover,
  direction,
}: DynamicFormSectionsProps) => {
  const t = useTranslation();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const handleAddSection = () => {
    onAddSection(pageNumber);
  };

  const handleToggleCollapse = (sectionId: string) => {
    onToggleCollapse(sectionId);
  };

  const handleStartRename = (section: FormSection) => {
    setEditingSectionId(section.id);
    setEditingName(section.name);
  };

  const handleSaveRename = (sectionId: string) => {
    if (editingName.trim() !== '') {
      onRenameSection(sectionId, editingName.trim());
    }
    setEditingSectionId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingSectionId(null);
    setEditingName('');
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm(t.deleteConfirmMessage.replace('{count}', '1'))) {
      onDeleteSection(sectionId);
    }
  };

  const handleFieldClick = (field: FieldDefinition, e: React.MouseEvent) => {
    if (field.pageNumber !== pageNumber) {
      onPageNavigate(field.pageNumber);
    }
    if (e.ctrlKey || e.metaKey) {
      onToggleFieldSelection(field.id);
    } else {
      onFieldSelect(field.id);
    }
  };

  const handleFieldDelete = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    onFieldDelete(fieldId);
  };

  // Get fields for a specific section
  const getFieldsForSection = (sectionId: string) => {
    return fields.filter(f => f.sectionId === sectionId);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'checkbox':
        return '☑️';
      case 'radio':
        return '⚪';
      case 'dropdown':
        return '▼';
      case 'signature':
        return '✍️';
      default:
        return '📄';
    }
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col h-full p-4" dir={direction} data-testid="sections-container">
        <div className="text-center text-muted-foreground text-sm py-8">
          <p>{t.noFieldsYet}</p>
          <p className="mt-2 text-xs">{t.useToolsAbove}</p>
          <Button
            onClick={handleAddSection}
            className="mt-4"
            size="sm"
            data-testid="add-section-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.addSection}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" dir={direction} data-testid="sections-container">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </span>
        <Button
          onClick={handleAddSection}
          size="sm"
          variant="outline"
          data-testid="add-section-button"
        >
          <Plus className="w-4 h-4 mr-1" />
          {t.addSection}
        </Button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-3">
          {sortedSections.map((section) => {
            const sectionFields = getFieldsForSection(section.id);
            const isEditing = editingSectionId === section.id;

            return (
              <div
                key={section.id}
                className={cn(
                  'rounded-md border bg-card transition-colors',
                  'hover:border-primary/50'
                )}
                data-testid={`section-${section.id}`}
              >
                {/* Section Header */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => !isEditing && handleToggleCollapse(section.id)}
                  data-testid="section-header"
                >
                  {/* First Row: Section Name Only */}
                  <div className="mb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveRename(section.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveRename(section.id);
                          } else if (e.key === 'Escape') {
                            handleCancelRename();
                          }
                        }}
                        autoFocus
                        className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="font-medium text-sm block"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(section);
                        }}
                      >
                        {section.name}
                      </span>
                    )}
                  </div>

                  {/* Second Row: All Controls */}
                  <div
                    className={cn(
                      'flex items-center gap-2',
                      direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Drag Handle */}
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab hover:text-foreground" />

                    {/* Collapse Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCollapse(section.id);
                      }}
                      data-testid="collapse-button"
                      className="focus:outline-none"
                    >
                      {section.isCollapsed ? (
                        direction === 'rtl' ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Field Count Badge */}
                    <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                      {sectionFields.length} {sectionFields.length === 1 ? t.field : t.fields}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Section Menu */}
                    <div className={cn(
                      "flex items-center gap-1",
                      direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(section);
                        }}
                        className="p-1 hover:bg-muted rounded"
                        title={t.renameSection}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!section.id.startsWith('ungrouped_page') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(section.id);
                          }}
                          className="p-1 hover:bg-destructive/10 text-destructive rounded"
                          title={t.deleteSection}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Body (Fields List) */}
                {!section.isCollapsed && (
                  <div className="px-3 pb-3 space-y-1">
                    {sectionFields.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No fields in this section
                      </div>
                    ) : (
                      sectionFields.map((field) => {
                        const isSelected =
                          field.id === selectedFieldId || selectedFieldIds.includes(field.id);
                        const isHovered = field.id === hoveredFieldId;
                        const hasError = errorFieldIds?.has(field.id);

                        return (
                          <div
                            key={field.id}
                            onClick={(e) => handleFieldClick(field, e)}
                            onMouseEnter={() => onFieldHover(field.id)}
                            onMouseLeave={() => onFieldHover(null)}
                            className={cn(
                              'group flex items-center gap-2 p-2 rounded cursor-pointer transition-colors',
                              'hover:bg-muted',
                              isSelected && 'bg-primary/10 border border-primary',
                              isHovered && 'ring-1 ring-primary/50',
                              hasError && 'bg-destructive/10 border-destructive'
                            )}
                            data-testid={`field-${field.id}`}
                          >
                            {/* Field Icon */}
                            <span className="text-base">{getFieldIcon(field.type)}</span>

                            {/* Field Name */}
                            <span className="flex-1 text-sm truncate">{field.name}</span>

                            {/* Field Type */}
                            <span className="text-xs text-muted-foreground">{field.type}</span>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => handleFieldDelete(e, field.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive rounded"
                              title={t.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
