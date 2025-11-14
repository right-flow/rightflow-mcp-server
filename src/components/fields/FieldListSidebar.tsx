import { useState, useEffect } from 'react';
import { Type, CheckSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';

interface FieldListSidebarProps {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  currentPage: number;
  errorFieldIds?: Set<string>; // Set of field IDs with validation errors
  onFieldSelect: (fieldId: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onPageNavigate: (page: number) => void;
}

export const FieldListSidebar = ({
  fields,
  selectedFieldId,
  currentPage,
  errorFieldIds,
  onFieldSelect,
  onFieldDelete,
  onPageNavigate,
}: FieldListSidebarProps) => {
  const [lastIndex, setLastIndex] = useState<number>(0);

  // Read LastIndex from localStorage and update when fields change
  useEffect(() => {
    const storedLastIndex = localStorage.getItem('rightflow_last_field_index');
    setLastIndex(parseInt(storedLastIndex || '0', 10));

    // Listen for storage changes (in case other tabs update it)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rightflow_last_field_index' && e.newValue) {
        setLastIndex(parseInt(e.newValue, 10));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fields]); // Re-read when fields change

  const handleFieldClick = (field: FieldDefinition) => {
    // Navigate to field's page if not already there
    if (field.pageNumber !== currentPage) {
      onPageNavigate(field.pageNumber);
    }
    // Select the field
    onFieldSelect(field.id);
  };

  const handleDelete = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    onFieldDelete(fieldId);
  };

  // Group fields by page
  const fieldsByPage = fields.reduce((acc, field) => {
    if (!acc[field.pageNumber]) {
      acc[field.pageNumber] = [];
    }
    acc[field.pageNumber].push(field);
    return acc;
  }, {} as Record<number, FieldDefinition[]>);

  const sortedPages = Object.keys(fieldsByPage)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="w-64 h-full bg-sidebar-bg border-r border-border overflow-y-auto p-4" dir="rtl">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold">רשימת שדות</h3>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs font-mono">
            <span className="text-muted-foreground">מונה:</span>
            <span className="font-semibold text-primary">{lastIndex}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {fields.length} {fields.length === 1 ? 'שדה' : 'שדות'}
        </p>
      </div>

      {fields.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          <p>אין שדות עדיין</p>
          <p className="mt-2 text-xs">
            השתמש בכלים מלמעלה להוספת שדות
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPages.map((pageNum) => (
            <div key={pageNum}>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                עמוד {pageNum}
              </div>
              <div className="space-y-1">
                {fieldsByPage[pageNum].map((field) => {
                  const hasError = errorFieldIds?.has(field.id);
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
                        hasError
                          ? 'bg-destructive/10 border border-destructive hover:bg-destructive/20'
                          : selectedFieldId === field.id
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted border border-transparent',
                      )}
                      onClick={() => handleFieldClick(field)}
                    >
                      {/* Field icon */}
                      <div
                        className="flex-shrink-0"
                        style={{
                          color:
                            field.type === 'text'
                              ? 'hsl(var(--field-text))'
                              : 'hsl(var(--field-checkbox))',
                        }}
                      >
                        {field.type === 'text' ? (
                          <Type className="w-4 h-4" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                      </div>

                      {/* Field info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {field.label || field.name}
                        </div>
                        {field.label && (
                          <div className="text-xs text-muted-foreground truncate" dir="ltr">
                            {field.name}
                          </div>
                        )}
                        {field.required && (
                          <div className="text-xs text-destructive">חובה</div>
                        )}
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => handleDelete(e, field.id)}
                        title="מחק שדה"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
