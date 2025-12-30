import { useState, useEffect } from 'react';
import { Type, CheckSquare, Circle, ChevronDown, PenTool, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';
import { useTranslation, useDirection } from '@/i18n';

interface ExtractedFieldsTabProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  selectedFieldIds: string[];
  currentPage: number;
  errorFieldIds?: Set<string>;
  onFieldSelect: (fieldId: string) => void;
  onToggleFieldSelection: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onPageNavigate: (page: number) => void;
  hoveredFieldId: string | null;
  onFieldHover: (fieldId: string | null) => void;
}

export const ExtractedFieldsTab = ({
  fields,
  selectedFieldId,
  selectedFieldIds,
  currentPage,
  errorFieldIds,
  onFieldSelect,
  onToggleFieldSelection,
  onFieldDelete,
  onPageNavigate,
  hoveredFieldId,
  onFieldHover,
}: ExtractedFieldsTabProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const [lastIndex, setLastIndex] = useState<number>(0);

  useEffect(() => {
    const storedLastIndex = localStorage.getItem('rightflow_last_field_index');
    setLastIndex(parseInt(storedLastIndex || '0', 10));

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rightflow_last_field_index' && e.newValue) {
        setLastIndex(parseInt(e.newValue, 10));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fields]);

  const handleFieldClick = (field: FieldDefinition, e: React.MouseEvent) => {
    if (field.pageNumber !== currentPage) {
      onPageNavigate(field.pageNumber);
    }
    if (e.ctrlKey || e.metaKey) {
      onToggleFieldSelection(field.id);
    } else {
      onFieldSelect(field.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    onFieldDelete(fieldId);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="w-3.5 h-3.5" />;
      case 'checkbox':
        return <CheckSquare className="w-3.5 h-3.5" />;
      case 'radio':
        return <Circle className="w-3.5 h-3.5" />;
      case 'dropdown':
        return <ChevronDown className="w-3.5 h-3.5" />;
      case 'signature':
        return <PenTool className="w-3.5 h-3.5" />;
      default:
        return <Type className="w-3.5 h-3.5" />;
    }
  };

  const getFieldColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'hsl(var(--field-text))';
      case 'checkbox':
        return 'hsl(var(--field-checkbox))';
      case 'radio':
        return 'hsl(var(--field-radio))';
      case 'dropdown':
        return 'hsl(var(--field-dropdown))';
      case 'signature':
        return 'hsl(var(--signature-border))';
      default:
        return 'hsl(var(--field-text))';
    }
  };

  // Group fields by page and then by section
  const fieldsByPage = fields.reduce((acc, field) => {
    if (!acc[field.pageNumber]) {
      acc[field.pageNumber] = {};
    }
    const sectionName = field.sectionName || t.general;
    if (!acc[field.pageNumber][sectionName]) {
      acc[field.pageNumber][sectionName] = [];
    }
    acc[field.pageNumber][sectionName].push(field);
    return acc;
  }, {} as Record<number, Record<string, FieldDefinition[]>>);

  const sortedPages = Object.keys(fieldsByPage)
    .map(Number)
    .sort((a, b) => a - b);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col h-full p-4" dir={direction}>
        <div className="text-center text-muted-foreground text-sm py-8">
          <p>{t.noFieldsYet}</p>
          <p className="mt-2 text-xs">{t.useToolsAbove}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" dir={direction}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {fields.length} {fields.length === 1 ? t.field : t.fields}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs font-mono">
            <span className="text-muted-foreground">{t.counter}:</span>
            <span className="font-semibold text-primary">{lastIndex}</span>
          </div>
        </div>
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-4">
          {sortedPages.map((pageNum) => {
            const sections = fieldsByPage[pageNum];
            const sortedSections = Object.keys(sections).sort();

            return (
              <div key={pageNum}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {t.page} {pageNum}
                </div>
                <div className="space-y-2">
                  {sortedSections.map((sectionName) => (
                    <div key={`${pageNum}-${sectionName}`} className="space-y-0.5">
                      <div className="text-xs font-bold text-primary bg-primary/5 rounded px-2 py-1 mb-1 mt-1.5 border-r-2 border-primary">
                        📂 {sectionName}
                      </div>
                      {sections[sectionName].map((field) => {
                        const hasError = errorFieldIds?.has(field.id);
                        return (
                          <div
                            key={field.id}
                            className={cn(
                              'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mr-2',
                              hasError
                                ? 'bg-destructive/10 border border-destructive hover:bg-destructive/20'
                                : selectedFieldId === field.id ||
                                  selectedFieldIds.includes(field.id)
                                ? 'bg-primary/10 border border-primary'
                                : hoveredFieldId === field.id
                                ? 'bg-primary/5 border border-primary/30 ring-1 ring-primary/20'
                                : 'hover:bg-muted border border-transparent'
                            )}
                            onClick={(e) => handleFieldClick(field, e)}
                            onMouseEnter={() => onFieldHover(field.id)}
                            onMouseLeave={() => onFieldHover(null)}
                          >
                            <div
                              className="flex-shrink-0"
                              style={{ color: getFieldColor(field.type) }}
                            >
                              {getFieldIcon(field.type)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {field.label || field.name}
                              </div>
                              {field.label && (
                                <div
                                  className="text-[10px] text-muted-foreground truncate leading-tight"
                                  dir="ltr"
                                >
                                  {field.name}
                                </div>
                              )}
                              {field.required && (
                                <div className="text-[10px] text-destructive leading-tight">
                                  {t.required}
                                </div>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => handleDelete(e, field.id)}
                              title={t.deleteField}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
