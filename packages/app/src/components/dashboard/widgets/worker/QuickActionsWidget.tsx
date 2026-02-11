// Quick Actions Widget
// Created: 2026-02-07
// Updated: 2026-02-10 - Improved localization
// Purpose: Large touch-friendly action buttons for field workers (mobile-first)

import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { useTranslation } from '../../../../i18n';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
  color: string;
}

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const t = useTranslation();

  // Desktop-friendly actions only
  // Mobile-only actions (QR scan, Camera, GPS) removed for desktop version
  const actions: QuickAction[] = [
    {
      id: 'new-form',
      label: t['dashboard.widgets.quickActions.newForm'],
      icon: <MaterialIcon name="add" size="lg" />,
      description: t['dashboard.widgets.quickActions.newFormDesc'],
      action: () => navigate('/editor'),
      color: 'bg-primary text-primary-foreground',
    },
    {
      id: 'my-responses',
      label: t['dashboard.widgets.quickActions.responses'],
      icon: <MaterialIcon name="history" size="lg" />,
      description: t['dashboard.widgets.quickActions.responsesDesc'],
      action: () => navigate('/responses'),
      color: 'bg-gray-600 text-white dark:bg-gray-700',
    },
    {
      id: 'my-forms',
      label: t['dashboard.widgets.quickActions.myForms'],
      icon: <MaterialIcon name="description" size="lg" />,
      description: t['dashboard.widgets.quickActions.myFormsDesc'],
      action: () => navigate('/responses'),
      color: 'bg-gray-500 text-white dark:bg-gray-600',
    },
  ];

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
          {t['dashboard.widgets.quickActions.title']}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              className={`
                ${action.color}
                flex flex-col items-center justify-center
                p-4 rounded-xl
                min-h-[100px]
                transition-all duration-200
                hover:scale-105 hover:shadow-lg
                active:scale-95
                touch-manipulation
              `}
            >
              <div className="mb-2">{action.icon}</div>
              <div className="text-sm font-semibold text-center">{action.label}</div>
              <div className="text-xs opacity-80 text-center mt-1">{action.description}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
