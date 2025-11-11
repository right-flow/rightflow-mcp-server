/**
 * Recovery Dialog Component
 *
 * Prompts user to restore from crash recovery data
 */

import * as React from 'react';
import { RecoveryData, formatRecoveryTimestamp } from '@/utils/crashRecovery';

interface RecoveryDialogProps {
  recoveryData: RecoveryData;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  recoveryData,
  onRestore,
  onDiscard,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" dir="rtl">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">שחזור עבודה</h2>
            <p className="text-sm text-muted-foreground">נמצאה עבודה שלא נשמרה</p>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-md mb-6">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">קובץ PDF:</div>
            <div className="font-medium truncate">{recoveryData.pdfFileName || 'לא ידוע'}</div>

            <div className="text-muted-foreground">שדות:</div>
            <div className="font-medium">{recoveryData.fields.length}</div>

            <div className="text-muted-foreground">עמודים:</div>
            <div className="font-medium">{recoveryData.totalPages}</div>

            <div className="text-muted-foreground">נשמר:</div>
            <div className="font-medium">{formatRecoveryTimestamp(recoveryData.timestamp)}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          האם ברצונך לשחזר את העבודה שלא נשמרה? פעולה זו תחליף את העבודה הנוכחית.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onRestore}
            className="flex-1 bg-primary text-primary-foreground font-medium py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
          >
            שחזר עבודה
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 bg-muted text-foreground font-medium py-2 px-4 rounded-md hover:bg-muted/80 transition-colors"
          >
            התחל מחדש
          </button>
        </div>
      </div>
    </div>
  );
};
