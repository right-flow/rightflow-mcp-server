import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/store/settingsStore';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { previewFilename } from '@/utils/filenameGenerator';
import { cn } from '@/utils/cn';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'naming';

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('text');
  const {
    settings,
    updateTextFieldSettings,
    updateCheckboxFieldSettings,
    updateRadioFieldSettings,
    updateDropdownFieldSettings,
    updateNamingSettings,
    resetSettings,
  } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">הגדרות ברירת מחדל לשדות</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'text'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
            onClick={() => setActiveTab('text')}
          >
            שדה טקסט
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'checkbox'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
            onClick={() => setActiveTab('checkbox')}
          >
            תיבת סימון
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'radio'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
            onClick={() => setActiveTab('radio')}
          >
            כפתורי רדיו
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'dropdown'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
            onClick={() => setActiveTab('dropdown')}
          >
            רשימה נפתחת
          </button>
          <button
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'naming'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
            onClick={() => setActiveTab('naming')}
          >
            הגדרת שמות
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'text' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">הגדרות שדה טקסט</h3>

              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="text-font">גופן ברירת מחדל</Label>
                <Select
                  id="text-font"
                  value={settings.textField.font}
                  onChange={(e) => updateTextFieldSettings({ font: e.target.value })}
                >
                  <option value="NotoSansHebrew">Noto Sans Hebrew (עברית)</option>
                  <option value="Arial">Arial</option>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label htmlFor="text-font-size">גודל גופן (pt)</Label>
                <Input
                  id="text-font-size"
                  type="number"
                  min="8"
                  max="24"
                  value={settings.textField.fontSize}
                  onChange={(e) => {
                    const sanitized = sanitizeUserInput(e.target.value);
                    const value = parseInt(sanitized) || 12;
                    updateTextFieldSettings({ fontSize: value });
                  }}
                  dir="ltr"
                  className="text-left"
                />
              </div>

              {/* Text Direction */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="text-direction">כיוון טקסט RTL (מימין לשמאל)</Label>
                  <p className="text-xs text-muted-foreground">
                    מופעל: עברית | כבוי: אנגלית
                  </p>
                </div>
                <Switch
                  id="text-direction"
                  checked={settings.textField.direction === 'rtl'}
                  onCheckedChange={(checked) =>
                    updateTextFieldSettings({ direction: checked ? 'rtl' : 'ltr' })
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'checkbox' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">הגדרות תיבת סימון</h3>

              {/* Checkbox Style */}
              <div className="space-y-2">
                <Label htmlFor="checkbox-style">סוג סימון</Label>
                <Select
                  id="checkbox-style"
                  value={settings.checkboxField.style}
                  onChange={(e) =>
                    updateCheckboxFieldSettings({ style: e.target.value as 'x' | 'check' })
                  }
                >
                  <option value="check">סימון V (✓)</option>
                  <option value="x">סימון X (✗)</option>
                </Select>
                <p className="text-xs text-muted-foreground">
                  קובע את סגנון הסימון שיופיע בתיבת הסימון
                </p>
              </div>
            </div>
          )}

          {activeTab === 'radio' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">הגדרות כפתורי רדיו</h3>

              {/* Orientation */}
              <div className="space-y-2">
                <Label htmlFor="radio-orientation">סידור כפתורים</Label>
                <Select
                  id="radio-orientation"
                  value={settings.radioField.orientation}
                  onChange={(e) =>
                    updateRadioFieldSettings({
                      orientation: e.target.value as 'vertical' | 'horizontal',
                    })
                  }
                >
                  <option value="vertical">אנכי (אחד מתחת לשני)</option>
                  <option value="horizontal">אופקי (אחד ליד השני)</option>
                </Select>
              </div>

              {/* Default Button Count */}
              <div className="space-y-2">
                <Label htmlFor="radio-count">מספר כפתורים ברירת מחדל</Label>
                <Input
                  id="radio-count"
                  type="number"
                  min="2"
                  max="10"
                  value={settings.radioField.defaultButtonCount}
                  onChange={(e) => {
                    const sanitized = sanitizeUserInput(e.target.value);
                    const value = parseInt(sanitized) || 3;
                    updateRadioFieldSettings({ defaultButtonCount: value });
                  }}
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  מספר הכפתורים שייווצרו בקבוצה חדשה (2-10)
                </p>
              </div>

              {/* Spacing */}
              <div className="space-y-2">
                <Label htmlFor="radio-spacing">מרווח בין כפתורים (pt)</Label>
                <Input
                  id="radio-spacing"
                  type="number"
                  min="10"
                  max="100"
                  value={settings.radioField.spacing}
                  onChange={(e) => {
                    const sanitized = sanitizeUserInput(e.target.value);
                    const value = parseInt(sanitized) || 30;
                    updateRadioFieldSettings({ spacing: value });
                  }}
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground">
                  מרווח אנכי/אופקי בין כפתורים (10-100)
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dropdown' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">הגדרות רשימה נפתחת</h3>

              {/* Font Selection */}
              <div className="space-y-2">
                <Label htmlFor="dropdown-font">גופן ברירת מחדל</Label>
                <Select
                  id="dropdown-font"
                  value={settings.dropdownField.font}
                  onChange={(e) => updateDropdownFieldSettings({ font: e.target.value })}
                >
                  <option value="NotoSansHebrew">Noto Sans Hebrew (עברית)</option>
                  <option value="Arial">Arial</option>
                </Select>
              </div>

              {/* Text Direction */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dropdown-direction">כיוון טקסט RTL (מימין לשמאל)</Label>
                  <p className="text-xs text-muted-foreground">
                    מופעל: עברית | כבוי: אנגלית
                  </p>
                </div>
                <Switch
                  id="dropdown-direction"
                  checked={settings.dropdownField.direction === 'rtl'}
                  onCheckedChange={(checked) =>
                    updateDropdownFieldSettings({ direction: checked ? 'rtl' : 'ltr' })
                  }
                />
              </div>
            </div>
          )}

          {activeTab === 'naming' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">הגדרת שמות קבצים</h3>

              {/* Insurance Company */}
              <div className="space-y-2">
                <Label htmlFor="insurance-company">חברת הביטוח</Label>
                <Input
                  id="insurance-company"
                  type="text"
                  value={settings.naming.insuranceCompany}
                  onChange={(e) => {
                    const sanitized = sanitizeUserInput(e.target.value);
                    updateNamingSettings({ insuranceCompany: sanitized });
                  }}
                  placeholder="לדוגמא: כלל ביטוח"
                  dir="rtl"
                />
              </div>

              {/* Insurance Branch */}
              <div className="space-y-2">
                <Label htmlFor="insurance-branch">ענף הביטוח</Label>
                <Select
                  id="insurance-branch"
                  value={settings.naming.insuranceBranch}
                  onChange={(e) =>
                    updateNamingSettings({
                      insuranceBranch: e.target.value as
                        | 'ביטוח אלמנטרי'
                        | 'ביטוח חיים'
                        | 'ביטוח בריאות'
                        | 'פנסיה'
                        | 'קופות גמל',
                    })
                  }
                >
                  <option value="ביטוח אלמנטרי">ביטוח אלמנטרי</option>
                  <option value="ביטוח חיים">ביטוח חיים</option>
                  <option value="ביטוח בריאות">ביטוח בריאות</option>
                  <option value="פנסיה">פנסיה</option>
                  <option value="קופות גמל">קופות גמל</option>
                </Select>
              </div>

              {/* Form Name */}
              <div className="space-y-2">
                <Label htmlFor="form-name">שם הטופס</Label>
                <Input
                  id="form-name"
                  type="text"
                  value={settings.naming.formName}
                  onChange={(e) => {
                    const sanitized = sanitizeUserInput(e.target.value);
                    updateNamingSettings({ formName: sanitized });
                  }}
                  placeholder="לדוגמא: טופס תביעה"
                  dir="rtl"
                />
              </div>

              {/* Filename Template Builder */}
              <div className="space-y-3">
                <Label>תבנית שם קובץ</Label>
                <p className="text-xs text-muted-foreground">
                  בנה את שם הקובץ מפרמטרים ומפרידים
                </p>

                {/* Inline Template Builder */}
                <div className="flex flex-wrap items-center gap-1 p-2 bg-muted rounded-md min-h-[40px]">
                  {settings.naming.filenameTemplate.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      התבנית ריקה - לחץ &quot;הוסף פרמטר&quot; או &quot;הוסף מפריד&quot; להתחיל
                    </p>
                  ) : (
                    settings.naming.filenameTemplate.map((segment, index) => (
                      <div key={index} className="flex items-center gap-1">
                        {segment.type === 'parameter' ? (
                          <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 rounded px-2 py-1">
                            <Select
                              value={segment.value}
                              onChange={(e) => {
                                const newTemplate = [...settings.naming.filenameTemplate];
                                newTemplate[index] = { type: 'parameter', value: e.target.value };
                                updateNamingSettings({ filenameTemplate: newTemplate });
                              }}
                              className="text-xs h-6 w-[140px] px-1 py-0"
                              aria-label={`פרמטר ${index + 1} - בחר סוג פרמטר`}
                            >
                              <option value="insuranceCompany">חברת הביטוח</option>
                              <option value="insuranceBranch">ענף הביטוח</option>
                              <option value="formName">שם הטופס</option>
                            </Select>
                            <button
                              onClick={() => {
                                const newTemplate = settings.naming.filenameTemplate.filter(
                                  (_, i) => i !== index,
                                );
                                updateNamingSettings({ filenameTemplate: newTemplate });
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`מחק פרמטר ${index + 1}`}
                              title="מחק פרמטר"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-secondary border border-border rounded px-2 py-1">
                            <Input
                              type="text"
                              value={segment.value}
                              onChange={(e) => {
                                const sanitized = sanitizeUserInput(e.target.value);
                                const newTemplate = [...settings.naming.filenameTemplate];
                                newTemplate[index] = { type: 'separator', value: sanitized };
                                updateNamingSettings({ filenameTemplate: newTemplate });
                              }}
                              placeholder="_"
                              dir="ltr"
                              className="text-xs text-left h-6 w-[50px] px-1 py-0"
                              aria-label={`מפריד ${index + 1}`}
                            />
                            <button
                              onClick={() => {
                                const newTemplate = settings.naming.filenameTemplate.filter(
                                  (_, i) => i !== index,
                                );
                                updateNamingSettings({ filenameTemplate: newTemplate });
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`מחק מפריד ${index + 1}`}
                              title="מחק מפריד"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTemplate = [
                        ...settings.naming.filenameTemplate,
                        { type: 'parameter' as const, value: 'insuranceCompany' },
                      ];
                      updateNamingSettings({ filenameTemplate: newTemplate });
                    }}
                  >
                    הוסף פרמטר
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTemplate = [
                        ...settings.naming.filenameTemplate,
                        { type: 'separator' as const, value: '_' },
                      ];
                      updateNamingSettings({ filenameTemplate: newTemplate });
                    }}
                  >
                    הוסף מפריד
                  </Button>
                </div>

                {/* Preview */}
                <div className="p-3 bg-muted rounded-md">
                  <Label className="text-xs text-muted-foreground">תצוגה מקדימה:</Label>
                  <p className="text-sm font-mono mt-1 break-all" dir="ltr">
                    {previewFilename(settings.naming)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t">
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="w-4 h-4 ml-2" />
            איפוס להגדרות ברירת מחדל
          </Button>
          <Button onClick={onClose}>סגור</Button>
        </div>
      </div>
    </div>
  );
};
