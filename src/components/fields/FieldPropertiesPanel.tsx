import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, PenTool, Shield, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { FieldDefinition } from '@/types/fields';
import { cn } from '@/utils/cn';
import { sanitizeUserInput, validateFieldName, sanitizeFontSize } from '@/utils/inputSanitization';
import { SignatureModal } from './SignatureModal';
import { useTranslation, useDirection } from '@/i18n';
import {
  detectFieldType,
  getAvailableFieldTypes,
  getValidatorsForFieldType,
} from '@/services/validation';

interface FieldPropertiesPanelProps {
  field: FieldDefinition;
  onUpdate: (updates: Partial<FieldDefinition>) => void;
  onClose: () => void;
}

export const FieldPropertiesPanel = ({
  field,
  onUpdate,
  onClose,
}: FieldPropertiesPanelProps) => {
  const t = useTranslation();
  const direction = useDirection();
  const labelInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isValidationExpanded, setIsValidationExpanded] = useState(false);

  // Get available field types for this field type
  const availableFieldTypes = useMemo(
    () => getAvailableFieldTypes(field.type),
    [field.type]
  );

  // Detect field type based on label (debounced)
  const detectedType = useMemo(() => {
    if (!field.label || field.label.trim() === '') return null;
    return detectFieldType(field.label, field.type, field.sectionName);
  }, [field.label, field.type, field.sectionName]);

  // Handle validation type change
  const handleValidationTypeChange = useCallback(
    (validationType: string) => {
      if (validationType === '') {
        // Clear validation
        onUpdate({
          validationType: undefined,
          validation: undefined,
        });
      } else {
        // Set validation type and get validators
        const validators = getValidatorsForFieldType(validationType);
        onUpdate({
          validationType,
          validation: {
            enabled: true,
            validators,
          },
        });
      }
    },
    [onUpdate]
  );

  // Handle validation toggle
  const handleValidationToggle = useCallback(
    (enabled: boolean) => {
      if (enabled && field.validationType) {
        const validators = getValidatorsForFieldType(field.validationType);
        onUpdate({
          validation: {
            enabled: true,
            validators,
          },
        });
      } else {
        onUpdate({
          validation: field.validation
            ? { ...field.validation, enabled }
            : { enabled, validators: [] },
        });
      }
    },
    [field.validationType, field.validation, onUpdate]
  );

  // Auto-apply detected type suggestion when label changes (only if no validation set)
  useEffect(() => {
    if (
      detectedType?.bestMatch &&
      !field.validationType &&
      detectedType.bestMatch.score >= 80
    ) {
      // Auto-suggest but don't auto-enable - just show in UI
    }
  }, [detectedType, field.validationType]);

  // Auto-focus name input when panel opens for a new field with empty name
  useEffect(() => {
    // Check if this is a newly created field (empty name)
    const isNewField = field.name === '';

    if (isNewField && nameInputRef.current) {
      // Small delay to ensure the panel is fully rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select(); // Select any existing text
      }, 100);
    }
  }, [field.id, field.name]); // Run when field changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validation = validateFieldName(e.target.value);
    if (validation.isValid) {
      onUpdate({ name: validation.sanitized });
    } else {
      // Show error but don't update (could add toast notification here)
      console.warn('Invalid field name:', validation.error);
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUserInput(e.target.value);
    onUpdate({ label: sanitized });
  };

  const handleDefaultValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUserInput(e.target.value);
    onUpdate({ defaultValue: sanitized });
  };

  const handleSectionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeUserInput(e.target.value);
    // Default to translated 'General' if empty
    onUpdate({ sectionName: sanitized || t.general });
  };

  const handleRequiredToggle = (checked: boolean) => {
    onUpdate({ required: checked });
  };

  const handleDirectionToggle = (checked: boolean) => {
    onUpdate({ direction: checked ? 'rtl' : 'ltr' });
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ font: e.target.value });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeFontSize(e.target.value);
    onUpdate({ fontSize: sanitized });
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
        <h3 className="text-lg font-semibold">
          {field.type === 'text' && t.textFieldProperties}
          {field.type === 'checkbox' && t.checkboxProperties}
          {field.type === 'radio' && t.radioProperties}
          {field.type === 'dropdown' && t.dropdownProperties}
          {field.type === 'signature' && t.signatureProperties}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Field Properties */}
      <div className="space-y-4">
        {/* Field Name */}
        <div className="space-y-2">
          <Label htmlFor="field-name">{t.fieldNameEnglish}</Label>
          <Input
            ref={nameInputRef}
            id="field-name"
            value={field.name}
            onChange={handleNameChange}
            placeholder="field_name"
            dir="ltr"
            className="text-left"
          />
          <p className="text-xs text-muted-foreground">
            {t.fieldNameHint}
          </p>
        </div>

        {/* Field Label */}
        <div className="space-y-2">
          <Label htmlFor="field-label">{t.labelTitle}</Label>
          <Input
            ref={labelInputRef}
            id="field-label"
            value={field.label || ''}
            onChange={handleLabelChange}
            placeholder={t.fieldLabel}
            dir={direction}
          />
          <p className="text-xs text-muted-foreground">
            {t.labelHint}
          </p>
        </div>

        {/* Validation Section */}
        {availableFieldTypes.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setIsValidationExpanded(!isValidationExpanded)}
              className="flex items-center justify-between w-full text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>{t.fieldValidation}</span>
                {field.validation?.enabled && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    {t.active}
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isValidationExpanded && 'rotate-180'
                )}
              />
            </button>

            {isValidationExpanded && (
              <div className="space-y-3 pt-2">
                {/* Detected/Suggested Type */}
                {detectedType?.bestMatch && !field.validationType && (
                  <div className="p-2 bg-primary/10 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t.suggestedType}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          handleValidationTypeChange(detectedType.bestMatch!.fieldTypeId)
                        }
                      >
                        {t.apply}
                      </Button>
                    </div>
                    <div className="font-medium text-primary">
                      {detectedType.bestMatch.displayName}
                    </div>
                  </div>
                )}

                {/* Validation Type Dropdown */}
                <div className="space-y-1">
                  <Label htmlFor="validation-type" className="text-xs">
                    {t.validationType}
                  </Label>
                  <Select
                    id="validation-type"
                    value={field.validationType || ''}
                    onChange={(e) => handleValidationTypeChange(e.target.value)}
                  >
                    <option value="">{t.noValidation}</option>
                    {availableFieldTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.displayName}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Validation Toggle */}
                {field.validationType && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="validation-enabled" className="text-xs">
                        {t.enableValidation}
                      </Label>
                      <Switch
                        id="validation-enabled"
                        checked={field.validation?.enabled || false}
                        onCheckedChange={handleValidationToggle}
                      />
                    </div>

                    {/* Show validators list */}
                    {field.validation?.validators &&
                      field.validation.validators.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">
                            {t.validators}:
                          </span>{' '}
                          {field.validation.validators
                            .map((v) => v.name)
                            .join(', ')}
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Field Index (Read-only) */}
        {field.index !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="field-index">{t.serialNumber}</Label>
            <Input
              id="field-index"
              value={field.index}
              readOnly
              disabled
              dir="ltr"
              className="text-left bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {t.serialNumberHint}
            </p>
          </div>
        )}

        {/* Section Name */}
        <div className="space-y-2">
          <Label htmlFor="field-section">{t.sectionName}</Label>
          <Input
            id="field-section"
            value={field.sectionName || ''}
            onChange={handleSectionNameChange}
            placeholder={t.sectionNamePlaceholder}
            dir={direction}
          />
          <p className="text-xs text-muted-foreground">
            {t.sectionNameHint}
          </p>
        </div>

        {/* Station Selection */}
        <div className="space-y-2">
          <Label htmlFor="field-station">{t.station}</Label>
          <Select
            id="field-station"
            value={field.station || 'client'}
            onChange={(e) => onUpdate({ station: e.target.value })}
          >
            <option value="client">{t.stationClient}</option>
            <option value="agent">{t.stationAgent}</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t.stationHint}
          </p>
        </div>

        {/* Default Value (text fields only) */}
        {field.type === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="field-default">{t.defaultValue}</Label>
            <Input
              id="field-default"
              value={field.defaultValue || ''}
              onChange={handleDefaultValueChange}
              placeholder={t.defaultValuePlaceholder}
              dir={field.direction}
            />
            <p className="text-xs text-muted-foreground">
              {t.defaultValueHint}
            </p>
          </div>
        )}

        {/* Radio Group Options (radio fields only) */}
        {field.type === 'radio' && (
          <>
            {/* Radio Orientation */}
            <div className="space-y-2">
              <Label htmlFor="radio-orientation">{t.radioOrientation}</Label>
              <Select
                id="radio-orientation"
                value={field.orientation || 'vertical'}
                onChange={(e) => onUpdate({ orientation: e.target.value as 'vertical' | 'horizontal' })}
              >
                <option value="vertical">{t.vertical}</option>
                <option value="horizontal">{t.horizontal}</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t.radioOrientationHint}
              </p>
            </div>

            {/* Radio Spacing */}
            <div className="space-y-2">
              <Label htmlFor="radio-spacing">{t.spacingBetweenButtons}</Label>
              <Input
                id="radio-spacing"
                type="number"
                min="0"
                max="50"
                step="0.01"
                value={field.spacing !== undefined ? field.spacing : 1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdate({ spacing: isNaN(val) ? 0 : Math.max(0, val) });
                }}
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                {t.spacingHint}
              </p>
            </div>

            {/* Radio Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t.radioOptions}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const currentOptions = field.options || [];
                    const newOptions = [...currentOptions, `Option ${currentOptions.length + 1}`];
                    onUpdate({ options: newOptions });
                  }}
                  className="h-7 px-2"
                >
                  <Plus className="w-3 h-3 ml-1" />
                  {t.add}
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(field.options || []).map((option, index) => (
                  <div key={index} className="flex gap-1">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = sanitizeUserInput(e.target.value);
                        onUpdate({ options: newOptions });
                      }}
                      placeholder={`Option ${index + 1}`}
                      dir={direction}
                      className="text-sm h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = (field.options || []).filter((_, i) => i !== index);
                        // Don't allow removing all options - keep at least 1
                        if (newOptions.length > 0) {
                          onUpdate({ options: newOptions });
                        }
                      }}
                      disabled={(field.options || []).length <= 1}
                      className="h-8 w-8 flex-shrink-0"
                      title={t.remove}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t.radioOptionsHint}
              </p>
            </div>
          </>
        )}

        {/* Dropdown Options (dropdown fields only) */}
        {field.type === 'dropdown' && (
          <div className="space-y-2">
            <Label htmlFor="field-options">{t.options}</Label>
            <textarea
              id="field-options"
              value={field.options?.join('\n') || ''}
              onChange={(e) => {
                const options = e.target.value.split('\n').map(opt => sanitizeUserInput(opt)).filter(opt => opt.length > 0);
                onUpdate({ options });
              }}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              dir={direction}
              rows={5}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t.dropdownOptionsHint}
            </p>
          </div>
        )}

        {/* Signature Field Properties */}
        {field.type === 'signature' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.signature}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="flex-1"
                >
                  <PenTool className="w-4 h-4 ml-2" />
                  {field.signatureImage ? t.editSignature : t.addSignature}
                </Button>
                {field.signatureImage && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onUpdate({ signatureImage: undefined, signatureTimestamp: undefined })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {field.signatureImage && (
                <div className="mt-2 border rounded p-2 bg-muted/20">
                  <img
                    src={field.signatureImage}
                    alt="Signature preview"
                    className="max-w-full h-16 object-contain mx-auto"
                  />
                  {field.signatureTimestamp && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {t.created}: {new Date(field.signatureTimestamp).toLocaleDateString(direction === 'rtl' ? 'he-IL' : 'en-US')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Required Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="field-required">{t.requiredField}</Label>
            <p className="text-xs text-muted-foreground">
              {t.requiredFieldHint}
            </p>
          </div>
          <Switch
            id="field-required"
            checked={field.required}
            onCheckedChange={handleRequiredToggle}
          />
        </div>

        {/* Auto-fill Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="field-autofill">{t.autoFill}</Label>
            <p className="text-xs text-muted-foreground">
              {t.autoFillHint}
            </p>
          </div>
          <Switch
            id="field-autofill"
            checked={field.autoFill || false}
            onCheckedChange={(checked) => onUpdate({ autoFill: checked })}
          />
        </div>

        {/* Direction Toggle (text fields only) */}
        {field.type === 'text' && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="field-direction">{t.textDirectionRtl}</Label>
              <p className="text-xs text-muted-foreground">
                {t.textDirectionHint}
              </p>
            </div>
            <Switch
              id="field-direction"
              checked={field.direction === 'rtl'}
              onCheckedChange={handleDirectionToggle}
            />
          </div>
        )}

        {/* Font Selection (text fields only) */}
        {field.type === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="field-font">{t.font}</Label>
            <Select
              id="field-font"
              value={field.font || 'NotoSansHebrew'}
              onChange={handleFontChange}
            >
              <option value="NotoSansHebrew">Noto Sans Hebrew</option>
              <option value="Arial">Arial</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t.selectFontHint}
            </p>
          </div>
        )}

        {/* Font Size (text fields only) */}
        {field.type === 'text' && (
          <div className="space-y-2">
            <Label htmlFor="field-font-size">{t.fontSize} (pt)</Label>
            <Input
              id="field-font-size"
              type="number"
              min="8"
              max="24"
              value={field.fontSize || 12}
              onChange={handleFontSizeChange}
              dir="ltr"
              className="text-left"
            />
            <p className="text-xs text-muted-foreground">
              {t.fontSizeRange}
            </p>
          </div>
        )}

        {/* Field Info */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">{t.pageLabel}:</span> {field.pageNumber}
            </div>
            <div>
              <span className="font-medium">{t.typeLabel}:</span>{' '}
              {field.type === 'text' && t.textField}
              {field.type === 'checkbox' && t.checkboxField}
              {field.type === 'radio' && t.radioField}
              {field.type === 'dropdown' && t.dropdownField}
              {field.type === 'signature' && t.signatureField}
            </div>
            <div>
              <span className="font-medium">{t.widthLabel}:</span> {Math.round(field.width)}pt
            </div>
            <div>
              <span className="font-medium">{t.heightLabel}:</span> {Math.round(field.height)}pt
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {field.type === 'signature' && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={(signatureImage, timestamp) => {
            onUpdate({ signatureImage, signatureTimestamp: timestamp });
          }}
          currentSignature={field.signatureImage}
        />
      )}
    </div>
  );
};
