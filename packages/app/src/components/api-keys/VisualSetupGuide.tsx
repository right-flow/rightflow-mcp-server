/**
 * Visual Setup Guide Component
 * Animated step-by-step visual guide for MCP setup
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { type Platform } from '@/utils/mcpConfigHelpers';

interface VisualSetupGuideProps {
  platform: Platform;
}

export function VisualSetupGuide({ platform }: VisualSetupGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: '📂',
      title: 'פתח את קובץ התצורה',
      description: 'השתמש בנתיב שהועתק או פתח דרך Settings → Developer → Edit Config',
      tip: 'אם הקובץ לא קיים, צור אותו ידנית',
    },
    {
      icon: '✏️',
      title: 'הדבק את התצורה',
      description: 'העתק את ה-JSON והדבק אותו בקובץ התצורה',
      tip: 'אם יש תצורה קיימת, הוסף את "rightflow" בתוך "mcpServers"',
    },
    {
      icon: '💾',
      title: 'שמור את הקובץ',
      description: 'שמור את השינויים בקובץ התצורה',
      tip: 'ודא שה-JSON תקין לפני שמירה',
    },
    {
      icon: '🔄',
      title: 'הפעל מחדש את Claude Code',
      description: 'סגור לגמרי ופתח מחדש את Claude Code',
      tip: 'הפעלה מחדש נדרשת כדי לטעון את התצורה החדשה',
    },
    {
      icon: '✅',
      title: 'אמת שהכל עובד',
      description: 'בדוק ש-RightFlow מופיע ברשימת ה-MCP servers',
      tip: 'נסה לבצע פעולה כדי לוודא שהחיבור תקין',
    },
  ];

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span>🎬</span>
          <span>מדריך ויזואלי מפורט</span>
        </span>
        <span className="transform transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : '' }}>
          ▼
        </span>
      </Button>

      {isOpen && (
        <div className="mt-4 space-y-3 animate-in slide-in-from-top-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              style={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl">
                {step.icon}
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm mb-1">
                  {index + 1}. {step.title}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{step.description}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">💡 {step.tip}</p>
              </div>
            </div>
          ))}

          {/* Embedded video placeholder */}
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              🎥 סרטון הדרכה (בקרוב)
            </p>
            <p className="text-xs text-gray-500">
              בקרוב נוסיף סרטון הדרכה מפורט שמראה את כל התהליך צעד אחרי צעד
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
