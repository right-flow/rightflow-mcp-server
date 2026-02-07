/**
 * ProgressChecklist Component
 * Gamification checklist for tracking user progress
 * Date: 2026-02-06
 */

import { useState } from 'react';
import {
  CheckCircle,
  Circle,
  ChevronDown,
  FileText,
  Edit3,
  Rocket,
  BarChart3,
  Share2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '../../i18n';

export interface ProgressChecklistProps {
  formsCount?: number;
  isPublished?: boolean;
  responsesCount?: number;
  hasCustomized?: boolean;
  hasShared?: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: LucideIcon;
  completed: boolean;
}

export function ProgressChecklist({
  formsCount = 0,
  isPublished = false,
  responsesCount = 0,
  hasCustomized = false,
  hasShared = false,
}: ProgressChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = useTranslation();

  // Determine completion status for each item
  const items: ChecklistItem[] = [
    {
      id: 'create-form',
      label: t.onboardingCreateForm,
      icon: FileText,
      completed: formsCount > 0,
    },
    {
      id: 'customize',
      label: t.onboardingCustomize,
      icon: Edit3,
      completed: hasCustomized,
    },
    {
      id: 'publish',
      label: t.onboardingPublish,
      icon: Rocket,
      completed: isPublished,
    },
    {
      id: 'first-response',
      label: t.onboardingFirstResponse,
      icon: BarChart3,
      completed: responsesCount > 0,
    },
    {
      id: 'share',
      label: t.onboardingShare,
      icon: Share2,
      completed: hasShared,
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  // Hide when all items completed
  if (completedCount === totalCount) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 shadow-lg z-50">
      <div className="bg-white dark:bg-zinc-900 border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div
          className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsCollapsed(!isCollapsed);
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t.onboardingTitle}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t.onboardingCompleted.replace('{completed}', completedCount.toString()).replace('{total}', totalCount.toString())}
              </p>
            </div>
            <ChevronDown
              className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
              size={20}
              data-testid="chevron-icon"
            />
          </div>

          {/* Progress Bar */}
          <div className="mt-2">
            <div
              className="w-full bg-secondary rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${progress}% complete`}
            >
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        {!isCollapsed && (
          <div className="p-4 pt-0">
            <ul className="space-y-2" role="list">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="flex items-center gap-2">
                    {item.completed ? (
                      <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
                    ) : (
                      <Circle className="text-gray-300 flex-shrink-0" size={16} />
                    )}
                    <Icon className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
                    <span className={item.completed ? 'line-through text-gray-500' : ''}>
                      {item.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
