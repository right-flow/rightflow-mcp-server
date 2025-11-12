import { AlertTriangle } from 'lucide-react';

interface UploadWarningDialogProps {
  onNewDocument: () => void;
  onNewVersion: () => void;
  onCancel: () => void;
  fieldCount: number;
}

export const UploadWarningDialog: React.FC<UploadWarningDialogProps> = ({
  onNewDocument,
  onNewVersion,
  onCancel,
  fieldCount,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" dir="rtl">
      <div className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">העלאת PDF חדש</h2>
            <p className="text-sm text-muted-foreground">קיימים {fieldCount} שדות במסמך הנוכחי</p>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <p className="text-sm text-foreground">
            מה ברצונך לעשות עם השדות הקיימים?
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onNewDocument}
            className="w-full bg-green-500 text-white font-medium py-3 px-4 rounded-md hover:bg-green-600 transition-colors text-right"
          >
            <div className="flex flex-col">
              <span className="font-semibold">מסמך חדש</span>
              <span className="text-xs opacity-90">כל השדות הקיימים ימחקו</span>
            </div>
          </button>

          <button
            onClick={onNewVersion}
            className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-md hover:bg-primary/90 transition-colors text-right"
          >
            <div className="flex flex-col">
              <span className="font-semibold">גרסת PDF חדשה</span>
              <span className="text-xs opacity-90">טעינת קובץ PDF ללא מחיקת השדות</span>
            </div>
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-muted text-foreground font-medium py-2 px-4 rounded-md hover:bg-muted/80 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};
