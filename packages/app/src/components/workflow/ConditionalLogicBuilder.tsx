import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import type { Condition, ConditionOperator } from '@/backend/services/workflow/types';

interface Field {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'dropdown';
  options?: string[]; // For dropdown fields
}

interface ConditionGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: (Condition | ConditionGroup)[];
}

interface ConditionalLogicBuilderProps {
  availableFields: Field[];
  initialConditions?: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
}

export function ConditionalLogicBuilder({
  availableFields,
  initialConditions,
  onChange,
}: ConditionalLogicBuilderProps) {
  const [conditionGroup, setConditionGroup] = useState<ConditionGroup>(
    initialConditions || {
      id: crypto.randomUUID(),
      logic: 'and',
      conditions: [],
    }
  );

  const handleAddCondition = (groupId: string) => {
    const newCondition: Condition = {
      field: availableFields[0]?.id || '',
      operator: 'eq',
      value: '',
    };

    const updated = addConditionToGroup(conditionGroup, groupId, newCondition);
    setConditionGroup(updated);
    onChange(updated);
  };

  const handleRemoveCondition = (groupId: string, conditionIndex: number) => {
    const updated = removeConditionFromGroup(conditionGroup, groupId, conditionIndex);
    setConditionGroup(updated);
    onChange(updated);
  };

  const handleUpdateCondition = (
    groupId: string,
    conditionIndex: number,
    updates: Partial<Condition>
  ) => {
    const updated = updateConditionInGroup(conditionGroup, groupId, conditionIndex, updates);
    setConditionGroup(updated);
    onChange(updated);
  };

  const handleToggleLogic = (groupId: string) => {
    const updated = toggleGroupLogic(conditionGroup, groupId);
    setConditionGroup(updated);
    onChange(updated);
  };

  const handleAddGroup = (parentGroupId: string) => {
    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      logic: 'and',
      conditions: [],
    };

    const updated = addGroupToGroup(conditionGroup, parentGroupId, newGroup);
    setConditionGroup(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <ConditionGroupRenderer
        group={conditionGroup}
        availableFields={availableFields}
        onAddCondition={handleAddCondition}
        onRemoveCondition={handleRemoveCondition}
        onUpdateCondition={handleUpdateCondition}
        onToggleLogic={handleToggleLogic}
        onAddGroup={handleAddGroup}
      />
    </div>
  );
}

interface ConditionGroupRendererProps {
  group: ConditionGroup;
  availableFields: Field[];
  onAddCondition: (groupId: string) => void;
  onRemoveCondition: (groupId: string, index: number) => void;
  onUpdateCondition: (groupId: string, index: number, updates: Partial<Condition>) => void;
  onToggleLogic: (groupId: string) => void;
  onAddGroup: (parentGroupId: string) => void;
  depth?: number;
}

function ConditionGroupRenderer({
  group,
  availableFields,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
  onToggleLogic,
  onAddGroup,
  depth = 0,
}: ConditionGroupRendererProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-lg border-2 p-4 ${
        depth > 0 ? 'border-dashed border-gray-300' : 'border-solid border-gray-400'
      } dark:border-gray-600`}
      style={{ marginInlineStart: depth * 20 }}
      data-testid="condition-group"
    >
      {/* Logic Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleLogic(group.id)}
          className="font-mono font-bold"
        >
          {group.logic.toUpperCase()}
        </Button>
        <span className="text-sm text-gray-500">
          {depth === 0 ? t('workflow.condition.rootGroup') : t('workflow.condition.nestedGroup')}
        </span>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {group.conditions.map((condition, index) => {
          if ('logic' in condition) {
            // Nested group
            return (
              <ConditionGroupRenderer
                key={condition.id}
                group={condition}
                availableFields={availableFields}
                onAddCondition={onAddCondition}
                onRemoveCondition={onRemoveCondition}
                onUpdateCondition={onUpdateCondition}
                onToggleLogic={onToggleLogic}
                onAddGroup={onAddGroup}
                depth={depth + 1}
              />
            );
          } else {
            // Single condition
            return (
              <ConditionRow
                key={index}
                condition={condition}
                availableFields={availableFields}
                onUpdate={(updates) => onUpdateCondition(group.id, index, updates)}
                onRemove={() => onRemoveCondition(group.id, index)}
              />
            );
          }
        })}
      </div>

      {/* Add Buttons */}
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddCondition(group.id)}
          className="flex-1"
        >
          <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {t('workflow.condition.addCondition')}
        </Button>
        {depth < 3 && ( // Limit nesting to 3 levels
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddGroup(group.id)}
            className="flex-1"
          >
            <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t('workflow.condition.addGroup')}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ConditionRowProps {
  condition: Condition;
  availableFields: Field[];
  onUpdate: (updates: Partial<Condition>) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, availableFields, onUpdate, onRemove }: ConditionRowProps) {
  const { t } = useTranslation();
  const selectedField = availableFields.find((f) => f.id === condition.field);

  const operatorOptions: { value: ConditionOperator; label: string; types: string[] }[] = [
    { value: 'eq', label: t('workflow.condition.operator.eq'), types: ['text', 'number', 'date', 'boolean', 'dropdown'] },
    { value: 'ne', label: t('workflow.condition.operator.ne'), types: ['text', 'number', 'date', 'boolean', 'dropdown'] },
    { value: 'gt', label: t('workflow.condition.operator.gt'), types: ['number', 'date'] },
    { value: 'lt', label: t('workflow.condition.operator.lt'), types: ['number', 'date'] },
    { value: 'gte', label: t('workflow.condition.operator.gte'), types: ['number', 'date'] },
    { value: 'lte', label: t('workflow.condition.operator.lte'), types: ['number', 'date'] },
    { value: 'contains', label: t('workflow.condition.operator.contains'), types: ['text'] },
    { value: 'exists', label: t('workflow.condition.operator.exists'), types: ['text', 'number', 'date', 'boolean', 'dropdown'] },
    { value: 'in', label: t('workflow.condition.operator.in'), types: ['text', 'number', 'dropdown'] },
    { value: 'not_in', label: t('workflow.condition.operator.notIn'), types: ['text', 'number', 'dropdown'] },
  ];

  // Filter operators based on field type
  const filteredOperators = selectedField
    ? operatorOptions.filter((op) => op.types.includes(selectedField.type))
    : operatorOptions;

  return (
    <div className="flex items-center gap-2">
      {/* Field Selector */}
      <Select value={condition.field} onValueChange={(v) => onUpdate({ field: v })}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder={t('workflow.condition.selectField')} />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => onUpdate({ operator: v as ConditionOperator })}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {filteredOperators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input (type-specific) */}
      {condition.operator !== 'exists' && (
        <ValueInput
          field={selectedField}
          operator={condition.operator}
          value={condition.value}
          onChange={(v) => onUpdate({ value: v })}
        />
      )}

      {/* Remove Button */}
      <Button variant="ghost" size="sm" onClick={onRemove} className="shrink-0">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

interface ValueInputProps {
  field?: Field;
  operator: ConditionOperator;
  value: any;
  onChange: (value: any) => void;
}

function ValueInput({ field, operator, value, onChange }: ValueInputProps) {
  const { t } = useTranslation();

  if (!field) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1"
        placeholder={t('workflow.condition.enterValue')}
      />
    );
  }

  switch (field.type) {
    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
      );

    case 'boolean':
      return (
        <Select value={value?.toString()} onValueChange={(v) => onChange(v === 'true')}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{t('common.true')}</SelectItem>
            <SelectItem value="false">{t('common.false')}</SelectItem>
          </SelectContent>
        </Select>
      );

    case 'dropdown':
      if (operator === 'in' || operator === 'not_in') {
        // Multi-select for arrays
        return (
          <Input
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(',')
                  .map((v: string) => v.trim())
                  .filter(Boolean)
              )
            }
            placeholder="value1, value2"
            className="flex-1"
          />
        );
      } else {
        // Single select
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

    default:
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
      );
  }
}

// ========== Helper Functions ==========

function addConditionToGroup(
  group: ConditionGroup,
  targetGroupId: string,
  condition: Condition
): ConditionGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      conditions: [...group.conditions, condition],
    };
  }

  return {
    ...group,
    conditions: group.conditions.map((c) =>
      'logic' in c ? addConditionToGroup(c, targetGroupId, condition) : c
    ),
  };
}

function removeConditionFromGroup(
  group: ConditionGroup,
  targetGroupId: string,
  index: number
): ConditionGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      conditions: group.conditions.filter((_, i) => i !== index),
    };
  }

  return {
    ...group,
    conditions: group.conditions.map((c) =>
      'logic' in c ? removeConditionFromGroup(c, targetGroupId, index) : c
    ),
  };
}

function updateConditionInGroup(
  group: ConditionGroup,
  targetGroupId: string,
  index: number,
  updates: Partial<Condition>
): ConditionGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      conditions: group.conditions.map((c, i) =>
        i === index && !('logic' in c) ? { ...c, ...updates } : c
      ),
    };
  }

  return {
    ...group,
    conditions: group.conditions.map((c) =>
      'logic' in c ? updateConditionInGroup(c, targetGroupId, index, updates) : c
    ),
  };
}

function toggleGroupLogic(group: ConditionGroup, targetGroupId: string): ConditionGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      logic: group.logic === 'and' ? 'or' : 'and',
    };
  }

  return {
    ...group,
    conditions: group.conditions.map((c) =>
      'logic' in c ? toggleGroupLogic(c, targetGroupId) : c
    ),
  };
}

function addGroupToGroup(
  group: ConditionGroup,
  targetGroupId: string,
  newGroup: ConditionGroup
): ConditionGroup {
  if (group.id === targetGroupId) {
    return {
      ...group,
      conditions: [...group.conditions, newGroup],
    };
  }

  return {
    ...group,
    conditions: group.conditions.map((c) =>
      'logic' in c ? addGroupToGroup(c, targetGroupId, newGroup) : c
    ),
  };
}
