import { useState } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Users, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTranslation } from '@/i18n/useTranslation';

// Define types (matching ADR-007)
interface Approver {
  id: string;
  type: 'user' | 'role' | 'dynamic';
  value: string;
  fallback?: Approver;
}

interface EscalationRule {
  timeoutHours: number;
  escalateTo: Approver;
  notifyBeforeHours?: number;
  notificationMessage?: string;
}

interface ApprovalLevel {
  id: string;
  order: number;
  approvers: Approver[];
  approvalType: 'ANY' | 'ALL';
  timeout?: number;
  escalation?: EscalationRule;
  skipCondition?: any; // Condition type
}

interface ApprovalChain {
  id: string;
  levels: ApprovalLevel[];
  overallTimeout?: number;
  onTimeout: 'fail' | 'escalate' | 'auto-approve';
}

interface User {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
}

interface ApprovalChainBuilderProps {
  chain: ApprovalChain;
  availableUsers: User[];
  availableRoles: Role[];
  onChange: (chain: ApprovalChain) => void;
}

export function ApprovalChainBuilder({
  chain,
  availableUsers,
  availableRoles,
  onChange,
}: ApprovalChainBuilderProps) {
  const { t } = useTranslation();

  const addLevel = () => {
    const newLevel: ApprovalLevel = {
      id: crypto.randomUUID(),
      order: chain.levels.length + 1,
      approvers: [],
      approvalType: 'ALL',
    };

    onChange({
      ...chain,
      levels: [...chain.levels, newLevel],
    });
  };

  const removeLevel = (levelId: string) => {
    onChange({
      ...chain,
      levels: chain.levels.filter((l) => l.id !== levelId),
    });
  };

  const updateLevel = (levelId: string, updates: Partial<ApprovalLevel>) => {
    onChange({
      ...chain,
      levels: chain.levels.map((l) => (l.id === levelId ? { ...l, ...updates } : l)),
    });
  };

  const moveLevel = (levelId: string, direction: 'up' | 'down') => {
    const index = chain.levels.findIndex((l) => l.id === levelId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chain.levels.length - 1) return;

    const newLevels = [...chain.levels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];

    // Update order numbers
    newLevels.forEach((level, i) => {
      level.order = i + 1;
    });

    onChange({ ...chain, levels: newLevels });
  };

  return (
    <div className="space-y-4">
      {/* Overall Settings */}
      <div className="rounded-lg border p-4 dark:border-gray-700">
        <h3 className="mb-4 font-semibold">{t('workflow.approval.chainSettings')}</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('workflow.approval.overallTimeout')}
            </label>
            <Input
              type="number"
              value={chain.overallTimeout || ''}
              onChange={(e) =>
                onChange({
                  ...chain,
                  overallTimeout: parseInt(e.target.value) || undefined,
                })
              }
              placeholder={t('workflow.approval.hours')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('workflow.approval.onTimeout')}
            </label>
            <Select
              value={chain.onTimeout}
              onChange={(e) =>
                onChange({ ...chain, onTimeout: e.target.value as 'fail' | 'escalate' | 'auto-approve' })
              }
            >
              <option value="fail">{t('workflow.approval.timeout.fail')}</option>
              <option value="escalate">{t('workflow.approval.timeout.escalate')}</option>
              <option value="auto-approve">{t('workflow.approval.timeout.autoApprove')}</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Approval Levels */}
      <div className="space-y-4">
        {chain.levels.map((level, index) => (
          <ApprovalLevelCard
            key={level.id}
            level={level}
            levelNumber={index + 1}
            availableUsers={availableUsers}
            availableRoles={availableRoles}
            onUpdate={(updates) => updateLevel(level.id, updates)}
            onRemove={() => removeLevel(level.id)}
            onMoveUp={() => moveLevel(level.id, 'up')}
            onMoveDown={() => moveLevel(level.id, 'down')}
            canMoveUp={index > 0}
            canMoveDown={index < chain.levels.length - 1}
          />
        ))}
      </div>

      {/* Add Level Button */}
      <Button onClick={addLevel} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
        {t('workflow.approval.addLevel')}
      </Button>
    </div>
  );
}

interface ApprovalLevelCardProps {
  level: ApprovalLevel;
  levelNumber: number;
  availableUsers: User[];
  availableRoles: Role[];
  onUpdate: (updates: Partial<ApprovalLevel>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ApprovalLevelCard({
  level,
  levelNumber,
  availableUsers,
  availableRoles,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ApprovalLevelCardProps) {
  const { t } = useTranslation();

  const addApprover = () => {
    const newApprover: Approver = {
      id: crypto.randomUUID(),
      type: 'user',
      value: availableUsers[0]?.id || '',
    };

    onUpdate({
      approvers: [...level.approvers, newApprover],
    });
  };

  const removeApprover = (approverId: string) => {
    onUpdate({
      approvers: level.approvers.filter((a) => a.id !== approverId),
    });
  };

  const updateApprover = (approverId: string, updates: Partial<Approver>) => {
    onUpdate({
      approvers: level.approvers.map((a) => (a.id === approverId ? { ...a, ...updates } : a)),
    });
  };

  return (
    <div className="rounded-lg border-2 border-blue-500 p-4 dark:border-blue-400">
      {/* Level Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
            {levelNumber}
          </div>
          <h3 className="font-semibold">
            {t('workflow.approval.level')} {levelNumber}
          </h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={!canMoveUp}>
            <MoveUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={!canMoveDown}>
            <MoveDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {/* Approval Type */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">
          {t('workflow.approval.approvalType')}
        </label>
        <Select
          value={level.approvalType}
          onChange={(e) => onUpdate({ approvalType: e.target.value as 'ANY' | 'ALL' })}
        >
          <option value="ANY">{t('workflow.approval.approvalType.any')}</option>
          <option value="ALL">{t('workflow.approval.approvalType.all')}</option>
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          {level.approvalType === 'ALL'
            ? t('workflow.approval.approvalType.allDescription')
            : t('workflow.approval.approvalType.anyDescription')}
        </p>
      </div>

      {/* Approvers */}
      <div className="mb-4 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" />
          {t('workflow.approval.approvers')}
        </label>
        {level.approvers.map((approver) => (
          <ApproverRow
            key={approver.id}
            approver={approver}
            availableUsers={availableUsers}
            availableRoles={availableRoles}
            onUpdate={(updates) => updateApprover(approver.id, updates)}
            onRemove={() => removeApprover(approver.id)}
          />
        ))}
        <Button onClick={addApprover} variant="outline" size="sm" className="w-full">
          <Plus className="mr-2 h-3 w-3 rtl:ml-2 rtl:mr-0" />
          {t('workflow.approval.addApprover')}
        </Button>
      </div>

      {/* Timeout & Escalation */}
      <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            {t('workflow.approval.timeout')}
          </label>
          <Input
            type="number"
            value={level.timeout || ''}
            onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || undefined })}
            placeholder={t('workflow.approval.hours')}
          />
        </div>
        {level.timeout && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              {t('workflow.approval.escalation')}
            </label>
            <EscalationConfig
              escalation={level.escalation}
              availableUsers={availableUsers}
              availableRoles={availableRoles}
              onChange={(escalation) => onUpdate({ escalation })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ApproverRowProps {
  approver: Approver;
  availableUsers: User[];
  availableRoles: Role[];
  onUpdate: (updates: Partial<Approver>) => void;
  onRemove: () => void;
}

function ApproverRow({
  approver,
  availableUsers,
  availableRoles,
  onUpdate,
  onRemove,
}: ApproverRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {/* Approver Type */}
      <Select
        value={approver.type}
        onChange={(e) => onUpdate({ type: e.target.value as 'user' | 'role' | 'dynamic' })}
        className="w-32"
      >
        <option value="user">{t('workflow.approval.approverType.user')}</option>
        <option value="role">{t('workflow.approval.approverType.role')}</option>
        <option value="dynamic">{t('workflow.approval.approverType.dynamic')}</option>
      </Select>

      {/* Approver Value */}
      {approver.type === 'user' && (
        <Select value={approver.value} onChange={(e) => onUpdate({ value: e.target.value })} className="flex-1">
          <option value="" disabled>{t('workflow.approval.selectUser')}</option>
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      )}

      {approver.type === 'role' && (
        <Select value={approver.value} onChange={(e) => onUpdate({ value: e.target.value })} className="flex-1">
          <option value="" disabled>{t('workflow.approval.selectRole')}</option>
          {availableRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </Select>
      )}

      {approver.type === 'dynamic' && (
        <Input
          type="text"
          value={approver.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="field.path (e.g., user.manager)"
          className="flex-1"
        />
      )}

      {/* Remove Button */}
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

interface EscalationConfigProps {
  escalation?: EscalationRule;
  availableUsers: User[];
  availableRoles: Role[];
  onChange: (escalation?: EscalationRule) => void;
}

function EscalationConfig({
  escalation,
  availableUsers,
  availableRoles,
  onChange,
}: EscalationConfigProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(!!escalation);

  if (!enabled) {
    return (
      <Button
        onClick={() => {
          setEnabled(true);
          onChange({
            timeoutHours: 24,
            escalateTo: {
              id: crypto.randomUUID(),
              type: 'user',
              value: availableUsers[0]?.id || '',
            },
          });
        }}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {t('workflow.approval.addEscalation')}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs">
          {t('workflow.approval.escalation.timeoutHours')}
        </label>
        <Input
          type="number"
          value={escalation?.timeoutHours || ''}
          onChange={(e) =>
            onChange({
              ...escalation!,
              timeoutHours: parseInt(e.target.value) || 24,
            })
          }
          placeholder="24"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs">
          {t('workflow.approval.escalation.escalateTo')}
        </label>
        <Select
          value={escalation?.escalateTo?.value}
          onChange={(e) =>
            onChange({
              ...escalation!,
              escalateTo: {
                ...escalation!.escalateTo,
                value: e.target.value,
              },
            })
          }
        >
          {availableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
      </div>
      <Button
        onClick={() => {
          setEnabled(false);
          onChange(undefined);
        }}
        variant="ghost"
        size="sm"
        className="w-full text-red-600"
      >
        {t('workflow.approval.removeEscalation')}
      </Button>
    </div>
  );
}
