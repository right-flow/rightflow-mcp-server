import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';
import { sanitizeUserInput } from '@/utils/inputSanitization';

interface MultiSelectPropertiesPanelProps {
  selectedFields: FieldDefinition[];
  onUpdateAll: (updates: Partial<FieldDefinition>) => void;
  onClose: () => void;
}

export const MultiSelectPropertiesPanel = ({
  selectedFields,
  onUpdateAll,
  onClose,
}: MultiSelectPropertiesPanelProps) => {
  // Get common values across all selected fields
  const getCommonValue = <K extends keyof FieldDefinition>(key: K): FieldDefinition[K] | 'mixed' => {
    if (selectedFields.length === 0) return 'mixed' as any;
    const firstValue = selectedFields[0][key];
    const allSame = selectedFields.every(f => f[key] === firstValue);
    return allSame ? firstValue : 'mixed' as any;
  };

  // Check if all selected fields have the same type
  const hasTextFields = selectedFields.some(f => f.type === 'text');
  const allSameType = selectedFields.every(f => f.type === selectedFields[0]?.type);

  const commonSectionName = getCommonValue('sectionName');
  const commonRequired = getCommonValue('required');
  const commonAutoFill = getCommonValue('autoFill');
  const commonDirection = getCommonValue('direction');
  const commonFont = getCommonValue('font');
  const commonFontSize = getCommonValue('fontSize');

  return (
    <div
      className={cn(
        'fixed right-4 top-20 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-[2000]',
        'animate-in slide-in-from-right duration-200',
        'max-h-[80vh] overflow-y-auto'
      )}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">עריכה מרובה</h3>
          <p className="text-sm text-muted-foreground">
            {selectedFields.length} שדות נבחרו
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Field Types Summary */}
      <div className="mb-4 p-2 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          סוגי שדות: {[...new Set(selectedFields.map(f => {
            switch(f.type) {
              case 'text': return 'טקסט';
              case 'checkbox': return 'תיבת סימון';
              case 'radio': return 'רדיו';
              case 'dropdown': return 'רשימה';
              case 'signature': return 'חתימה';
              default: return f.type;
            }
          }))].join(', ')}
        </p>
      </div>

      {/* Common Properties */}
      <div className="space-y-4">
        {/* Section Name */}
        <div className="space-y-2">
          <Label htmlFor="multi-section">שם מקטע</Label>
          <Input
            id="multi-section"
            value={commonSectionName === 'mixed' ? '' : (commonSectionName || '')}
            onChange={(e) => {
              const sanitized = sanitizeUserInput(e.target.value);
              onUpdateAll({ sectionName: sanitized || 'כללי' });
            }}
            placeholder={commonSectionName === 'mixed' ? '(מעורב)' : 'לדוגמה: פרטים אישיים'}
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground">
            יעודכן עבור כל {selectedFields.length} השדות הנבחרים
          </p>
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="multi-required">שדה חובה</Label>
            <p className="text-xs text-muted-foreground">
              {commonRequired === 'mixed' ? '(מעורב)' : ''}
            </p>
          </div>
          <Switch
            id="multi-required"
            checked={commonRequired === true}
            onCheckedChange={(checked) => onUpdateAll({ required: checked })}
          />
        </div>

        {/* Auto-fill Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="multi-autofill">מילוי אוטומטי</Label>
            <p className="text-xs text-muted-foreground">
              {commonAutoFill === 'mixed' ? '(מעורב)' : ''}
            </p>
          </div>
          <Switch
            id="multi-autofill"
            checked={commonAutoFill === true}
            onCheckedChange={(checked) => onUpdateAll({ autoFill: checked })}
          />
        </div>

        {/* Text-specific properties (only if there are text fields) */}
        {hasTextFields && (
          <>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-3">מאפייני טקסט</p>
              {!allSameType && (
                <p className="text-xs text-amber-600 mb-2">
                  * יחולו רק על שדות טקסט
                </p>
              )}
            </div>

            {/* Direction Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multi-direction">כיוון טקסט מימין לשמאל</Label>
                <p className="text-xs text-muted-foreground">
                  {commonDirection === 'mixed' ? '(מעורב)' : ''}
                </p>
              </div>
              <Switch
                id="multi-direction"
                checked={commonDirection === 'rtl'}
                onCheckedChange={(checked) => onUpdateAll({ direction: checked ? 'rtl' : 'ltr' })}
              />
            </div>

            {/* Font Selection */}
            <div className="space-y-2">
              <Label htmlFor="multi-font">גופן</Label>
              <Select
                id="multi-font"
                value={commonFont === 'mixed' ? '' : (commonFont || 'NotoSansHebrew')}
                onChange={(e) => onUpdateAll({ font: e.target.value })}
              >
                {commonFont === 'mixed' && <option value="">(מעורב)</option>}
                <option value="NotoSansHebrew">Noto Sans Hebrew (עברית)</option>
                <option value="Arial">Arial</option>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="multi-font-size">גודל גופן (pt)</Label>
              <Input
                id="multi-font-size"
                type="number"
                min="8"
                max="24"
                value={commonFontSize === 'mixed' ? '' : (commonFontSize || 12)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 8 && val <= 24) {
                    onUpdateAll({ fontSize: val });
                  }
                }}
                placeholder={commonFontSize === 'mixed' ? '(מעורב)' : ''}
                dir="ltr"
                className="text-left"
              />
            </div>
          </>
        )}

        {/* Info */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            טיפ: לחץ על שדה תוך לחיצה על Ctrl להוספה/הסרה מהבחירה
          </p>
        </div>
      </div>
    </div>
  );
};
