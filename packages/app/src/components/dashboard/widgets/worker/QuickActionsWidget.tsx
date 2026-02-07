// Quick Actions Widget
// Created: 2026-02-07
// Purpose: Large touch-friendly action buttons for field workers (mobile-first)

import { useNavigate } from 'react-router-dom';
import { FileText, Camera, QrCode, MapPin, Plus, History } from 'lucide-react';
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

  const actions: QuickAction[] = [
    {
      id: 'new-submission',
      label: 'הגשה חדשה',
      icon: <Plus className="w-6 h-6" />,
      description: 'מלא טופס חדש',
      action: () => navigate('/forms'),
      color: 'bg-primary text-primary-foreground',
    },
    {
      id: 'scan-qr',
      label: 'סרוק QR',
      icon: <QrCode className="w-6 h-6" />,
      description: 'פתח טופס בסריקה',
      action: () => {
        // TODO: Open QR scanner
        console.log('Open QR scanner');
      },
      color: 'bg-blue-500 text-white',
    },
    {
      id: 'take-photo',
      label: 'צלם תמונה',
      icon: <Camera className="w-6 h-6" />,
      description: 'הוסף תמונה לדוח',
      action: () => {
        // TODO: Open camera
        console.log('Open camera');
      },
      color: 'bg-amber-500 text-white',
    },
    {
      id: 'get-location',
      label: 'מיקום GPS',
      icon: <MapPin className="w-6 h-6" />,
      description: 'סמן מיקום נוכחי',
      action: () => {
        // TODO: Get current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              console.log('Location:', pos.coords.latitude, pos.coords.longitude);
            },
            (err) => console.error('Location error:', err)
          );
        }
      },
      color: 'bg-green-500 text-white',
    },
    {
      id: 'my-submissions',
      label: 'ההגשות שלי',
      icon: <History className="w-6 h-6" />,
      description: 'צפה בהיסטוריה',
      action: () => navigate('/responses?user=me'),
      color: 'bg-zinc-600 text-white',
    },
    {
      id: 'my-forms',
      label: 'הטפסים שלי',
      icon: <FileText className="w-6 h-6" />,
      description: 'טפסים מוקצים',
      action: () => navigate('/forms?assigned=me'),
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
