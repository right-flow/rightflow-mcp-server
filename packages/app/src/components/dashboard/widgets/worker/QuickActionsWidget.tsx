// Quick Actions Widget
// Created: 2026-02-07
// Updated: 2026-02-07 - Hide mobile-only buttons on desktop
// Purpose: Large touch-friendly action buttons for field workers (mobile-first)

import { useNavigate } from 'react-router-dom';
import { FileText, Plus, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';

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

  // Desktop-friendly actions only
  // Mobile-only actions (QR scan, Camera, GPS) removed for desktop version
  const actions: QuickAction[] = [
    {
      id: 'new-form',
      label: 'טופס חדש',
      icon: <Plus className="w-6 h-6" />,
      description: 'צור טופס חדש',
      action: () => navigate('/editor'),
      color: 'bg-primary text-primary-foreground',
    },
    {
      id: 'my-responses',
      label: 'תגובות',
      icon: <History className="w-6 h-6" />,
      description: 'צפה בתגובות',
      action: () => navigate('/responses'),
      color: 'bg-zinc-600 text-white',
    },
    {
      id: 'my-forms',
      label: 'הטפסים שלי',
      icon: <FileText className="w-6 h-6" />,
      description: 'ניהול טפסים',
      action: () => navigate('/responses'),
      color: 'bg-purple-500 text-white',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">פעולות מהירות</CardTitle>
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
