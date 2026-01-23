/**
 * ConditionalRulesPanel Component
 * UI for building conditional logic rules for form fields
 * Supports Hebrew RTL and Dark/Light mode
 */

import { useCallback, useMemo } from 'react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldDefinition, ConditionalRule, FieldVisibility } from '@/types/fields';
import { useTranslation, useDirection } from '@/i18n';
import { cn } from '@/utils/cn';
import { ConditionalOperator, ConditionalAction } from '@/services/conditional/conditional-types';

interface ConditionalRulesPanelProps {
  /** ID of the field being configured */
  fieldId: string;
  /** All fields in the form (for source field selection) */
  allFields: FieldDefinition[];
  /** Current rules for this field */
  currentRules: ConditionalRule[];
  /** Default visibility when no rules match */
  defaultVisibility: FieldVisibility;
  /** Callback when rules change */
  onRulesChange: (rules: ConditionalRule[]) => void;
  /** Callback when default visibility changes */
  onDefaultVisibilityChange: (visibility: FieldVisibility) => void;
}

/**
 * Generate a unique ID for a new rule
 */
function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function ConditionalRulesPanel({
  fieldId,
  allFields,
  currentRules,
  defaultVisibility,
  onRulesChange,
  onDefaultVisibilityChange,
}: ConditionalRulesPanelProps) {
  const t = useTranslation();
  const direction = useDirection();

  // Get available source fields (exclude current field)
  const sourceFields = useMemo(
    () => allFields.filter((f) => f.id !== fieldId),
    [allFields, fieldId],
  );

  // Add a new empty rule
  const handleAddRule = useCallback(() => {
    const newRule: ConditionalRule = {
      id: generateRuleId(),
      sourceFieldId: '',
      operator: 'equals',
      value: '',
      action: 'show',
    };
    onRulesChange([...currentRules, newRule]);
  }, [currentRules, onRulesChange]);

  // Remove a rule
  const handleRemoveRule = useCallback(
    (ruleId: string) => {
      onRulesChange(currentRules.filter((r) => r.id !== ruleId));
    },
    [currentRules, onRulesChange],
  );

  // Update a rule
  const handleUpdateRule = useCallback(
    (ruleId: string, updates: Partial<ConditionalRule>) => {
      onRulesChange(
        currentRules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      );
    },
    [currentRules, onRulesChange],
  );

  // Operator options
  const operatorOptions: { value: ConditionalOperator; label: string }[] = [
    { value: 'equals', label: t.equals },
    { value: 'not_equals', label: t.notEquals },
    { value: 'contains', label: t.contains },
    { value: 'is_empty', label: t.isEmpty },
    { value: 'is_not_empty', label: t.isNotEmpty },
  ];

  // Action options
  const actionOptions: { value: ConditionalAction; label: string }[] = [
    { value: 'show', label: t.show },
    { value: 'hide', label: t.hide },
    { value: 'require', label: t.require },
    { value: 'unrequire', label: t.unrequire },
  ];

  // Check if operator needs a value input
  const operatorNeedsValue = (operator: ConditionalOperator): boolean => {
    return operator !== 'is_empty' && operator !== 'is_not_empty';
  };

  // Get options for a source field (for dropdown/radio fields)
  const getSourceFieldOptions = (sourceFieldId: string): string[] | null => {
    const field = allFields.find((f) => f.id === sourceFieldId);
    if (field && (field.type === 'dropdown' || field.type === 'radio')) {
      return field.options || [];
    }
    return null;
  };

  return (
    <div
      dir={direction}
      className={cn(
        'p-3 rounded-lg border border-border',
        'bg-muted/30 space-y-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">{t.conditionalLogic}</span>
      </div>

      {/* Default Visibility */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t.defaultVisibility}</Label>
        <Select
          value={defaultVisibility}
          onChange={(e) => onDefaultVisibilityChange(e.target.value as FieldVisibility)}
          className="h-8 text-sm"
        >
          <option value="visible">{t.visible}</option>
          <option value="hidden">{t.hidden}</option>
        </Select>
      </div>

      {/* Rules List */}
      {currentRules.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t.noRules}
        </p>
      ) : (
        <div className="space-y-3">
          {currentRules.map((rule, index) => (
            <div
              key={rule.id}
              className={cn(
                'p-3 rounded-md border border-border',
                'bg-background space-y-2',
              )}
            >
              {/* Rule Index & Remove */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {index > 0 && (
                    <Select
                      value={rule.logicType || 'and'}
                      onChange={(e) =>
                        handleUpdateRule(rule.id, {
                          logicType: e.target.value as 'and' | 'or',
                        })
                      }
                      className="h-6 text-xs w-16 inline-block"
                    >
                      <option value="and">{t.and}</option>
                      <option value="or">{t.or}</option>
                    </Select>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemoveRule(rule.id)}
                  title={t.remove}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>

              {/* When (Source Field) */}
              <div className="space-y-1">
                <Label className="text-xs">{t.when}</Label>
                <Select
                  value={rule.sourceFieldId}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, { sourceFieldId: e.target.value })
                  }
                  className="h-8 text-sm"
                >
                  <option value="">{t.selectField}</option>
                  {sourceFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label || field.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Operator */}
              <div className="space-y-1">
                <Select
                  value={rule.operator}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      operator: e.target.value as ConditionalOperator,
                    })
                  }
                  className="h-8 text-sm"
                >
                  {operatorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Value */}
              {operatorNeedsValue(rule.operator) && (
                <div className="space-y-1">
                  {(() => {
                    const options = getSourceFieldOptions(rule.sourceFieldId);
                    if (options && options.length > 0) {
                      return (
                        <Select
                          value={String(rule.value)}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, { value: e.target.value })
                          }
                          className="h-8 text-sm"
                        >
                          <option value="">{t.enterValue}</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      );
                    }
                    return (
                      <Input
                        value={String(rule.value)}
                        onChange={(e) =>
                          handleUpdateRule(rule.id, { value: e.target.value })
                        }
                        placeholder={t.enterValue}
                        className="h-8 text-sm"
                        dir={direction}
                      />
                    );
                  })()}
                </div>
              )}

              {/* Action */}
              <div className="space-y-1">
                <Label className="text-xs">{t.then}</Label>
                <Select
                  value={rule.action}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      action: e.target.value as ConditionalAction,
                    })
                  }
                  className="h-8 text-sm"
                >
                  {actionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Rule Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddRule}
        className="w-full"
      >
        <Plus className="w-4 h-4 ml-2" />
        {t.addRule}
      </Button>
    </div>
  );
}
