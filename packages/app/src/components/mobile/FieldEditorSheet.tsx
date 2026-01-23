/**
 * Field Editor Sheet Component
 * Bottom sheet for editing form fields on mobile
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface Field {
  id: string;
  type: 'text' | 'checkbox' | 'signature' | 'radio' | 'dropdown' | 'date' | 'camera' | 'gps';
  name: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FieldEditorSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback when sheet is closed */
  onClose: () => void;
  /** Field being edited */
  field: Field | null;
  /** Callback when field is saved */
  onSave?: (field: Field) => void;
  /** Callback when field is deleted */
  onDelete?: (fieldId: string) => void;
}

const fieldTypeOptions = [
  { value: 'text', label: 'טקסט' },
  { value: 'checkbox', label: 'תיבת סימון' },
  { value: 'signature', label: 'חתימה' },
  { value: 'radio', label: 'בחירה יחידה' },
  { value: 'dropdown', label: 'רשימה נפתחת' },
  { value: 'date', label: 'תאריך' },
  { value: 'camera', label: 'מצלמה' },
  { value: 'gps', label: 'מיקום GPS' },
];

/**
 * Field Editor Sheet - Mobile-optimized field editor
 *
 * @example
 * ```tsx
 * <FieldEditorSheet
 *   isOpen={isEditing}
 *   onClose={() => setIsEditing(false)}
 *   field={selectedField}
 *   onSave={(field) => updateField(field)}
 *   onDelete={(id) => deleteField(id)}
 * />
 * ```
 */
export function FieldEditorSheet({
  isOpen,
  onClose,
  field,
  onSave,
  onDelete,
}: FieldEditorSheetProps) {
  const [editedField, setEditedField] = useState<Field | null>(field);

  // Update local state when field prop changes
  if (field && field.id !== editedField?.id) {
    setEditedField(field);
  }

  if (!editedField) {
    return null;
  }

  const handleSave = () => {
    if (editedField) {
      onSave?.(editedField);
      onClose();
    }
  };

  const handleDelete = () => {
    if (editedField) {
      onDelete?.(editedField.id);
      onClose();
    }
  };

  const updateField = <K extends keyof Field>(key: K, value: Field[K]) => {
    if (editedField) {
      setEditedField({ ...editedField, [key]: value });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>עריכת שדה</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="field-name">שם השדה</Label>
            <Input
              id="field-name"
              type="text"
              value={editedField.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="הכנס שם שדה"
              className="text-lg h-12"
            />
          </div>

          {/* Field Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">תווית (אופציונלי)</Label>
            <Input
              id="field-label"
              type="text"
              value={editedField.label || ''}
              onChange={(e) => updateField('label', e.target.value)}
              placeholder="תווית להצגה"
              className="text-lg h-12"
            />
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="field-type">סוג שדה</Label>
            <select
              id="field-type"
              value={editedField.type}
              onChange={(e) => updateField('type', e.target.value as Field['type'])}
              className="w-full h-12 px-4 text-lg rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {fieldTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="field-required" className="text-base">
              שדה חובה
            </Label>
            <Switch
              id="field-required"
              checked={editedField.required || false}
              onCheckedChange={(checked) => updateField('required', checked)}
            />
          </div>

          {/* Placeholder (for text fields) */}
          {editedField.type === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">טקסט ממלא מקום</Label>
              <Input
                id="field-placeholder"
                type="text"
                value={editedField.placeholder || ''}
                onChange={(e) => updateField('placeholder', e.target.value)}
                placeholder="הכנס טקסט ממלא מקום"
                className="text-lg h-12"
              />
            </div>
          )}

          {/* Position & Size (read-only, shown for reference) */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              מיקום וגודל
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div>X: {Math.round(editedField.x)}px</div>
              <div>Y: {Math.round(editedField.y)}px</div>
              <div>רוחב: {Math.round(editedField.width)}px</div>
              <div>גובה: {Math.round(editedField.height)}px</div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={handleSave}
            className="w-full h-12 text-lg"
            size="lg"
          >
            שמור שינויים
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full h-12 text-lg"
            size="lg"
          >
            מחק שדה
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full h-12 text-lg"
            size="lg"
          >
            ביטול
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
