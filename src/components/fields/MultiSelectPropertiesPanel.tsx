import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { useTranslation, useDirection } from '@/i18n';

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
  const t = useTranslation();
  const direction = useDirection();

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

  // Helper function to get field type name
  const getFieldTypeName = (type: string) => {
    switch(type) {
      case 'text': return t.textField;
      case 'checkbox': return t.checkboxField;
      case 'radio': return t.radioField;
      case 'dropdown': return t.dropdownField;
      case 'signature': return t.signatureField;
      default: return type;
    }
  };

  return (
    <div
      className={cn(
        'fixed right-4 top-20 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-[2000]',
        'animate-in slide-in-from-right duration-200',
        'max-h-[80vh] overflow-y-auto'
      )}
      dir={direction}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{t.multiEdit}</h3>
          <p className="text-sm text-muted-foreground">
            {selectedFields.length} {t.fieldsSelected}
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
          {t.fieldTypes}: {[...new Set(selectedFields.map(f => getFieldTypeName(f.type)))].join(', ')}
        </p>
      </div>

      {/* Common Properties */}
      <div className="space-y-4">
        {/* Section Name */}
        <div className="space-y-2">
          <Label htmlFor="multi-section">{t.sectionName}</Label>
          <Input
            id="multi-section"
            value={commonSectionName === 'mixed' ? '' : (commonSectionName || '')}
            onChange={(e) => {
              const sanitized = sanitizeUserInput(e.target.value);
              onUpdateAll({ sectionName: sanitized || t.general });
            }}
            placeholder={commonSectionName === 'mixed' ? t.mixed : t.sectionNamePlaceholder}
            dir={direction}
          />
          <p className="text-xs text-muted-foreground">
            {t.willUpdateAllFields}
          </p>
        </div>

        {/* Required Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="multi-required">{t.requiredField}</Label>
            <p className="text-xs text-muted-foreground">
              {commonRequired === 'mixed' ? t.mixed : ''}
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
            <Label htmlFor="multi-autofill">{t.autoFill}</Label>
            <p className="text-xs text-muted-foreground">
              {commonAutoFill === 'mixed' ? t.mixed : ''}
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
              <p className="text-sm font-medium mb-3">{t.textProperties}</p>
              {!allSameType && (
                <p className="text-xs text-amber-600 mb-2">
                  {t.appliesToTextFieldsOnly}
                </p>
              )}
            </div>

            {/* Direction Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multi-direction">{t.textDirectionRtl}</Label>
                <p className="text-xs text-muted-foreground">
                  {commonDirection === 'mixed' ? t.mixed : ''}
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
              <Label htmlFor="multi-font">{t.font}</Label>
              <Select
                id="multi-font"
                value={commonFont === 'mixed' ? '' : (commonFont || 'NotoSansHebrew')}
                onChange={(e) => onUpdateAll({ font: e.target.value })}
              >
                {commonFont === 'mixed' && <option value="">{t.mixed}</option>}
                <option value="NotoSansHebrew">Noto Sans Hebrew</option>
                <option value="Arial">Arial</option>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="multi-font-size">{t.fontSize} (pt)</Label>
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
                placeholder={commonFontSize === 'mixed' ? t.mixed : ''}
                dir="ltr"
                className="text-left"
              />
            </div>
          </>
        )}

        {/* Info */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {t.multiSelectTip}
          </p>
        </div>
      </div>
    </div>
  );
};
