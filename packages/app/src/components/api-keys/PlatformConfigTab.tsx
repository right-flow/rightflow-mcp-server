/**
 * Platform Config Tab Component
 * Platform-specific MCP setup instructions
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { JsonConfigDisplay } from './JsonConfigDisplay';
import { TestMcpConnection } from './TestMcpConnection';
import { VisualSetupGuide } from './VisualSetupGuide';
import { getConfigPath, copyToClipboard, type Platform } from '@/utils/mcpConfigHelpers';
import { trackMcpPathCopied } from '@/utils/mcpAnalytics';

interface PlatformConfigTabProps {
  platform: Platform;
  apiKey: string;
}

export function PlatformConfigTab({ platform, apiKey }: PlatformConfigTabProps) {
  const [pathCopied, setPathCopied] = useState(false);
  const configPath = getConfigPath(platform);

  const handleCopyPath = async () => {
    const success = await copyToClipboard(configPath);
    if (success) {
      setPathCopied(true);
      setTimeout(() => setPathCopied(false), 2000);
      trackMcpPathCopied(platform);
      toast.success('הנתיב הועתק!', {
        description: 'עכשיו אתה יכול למצוא את קובץ התצורה',
      });
    } else {
      toast.error('שגיאה בהעתקה', {
        description: 'אנא נסה שוב או העתק ידנית',
      });
    }
  };

  return (
    <div className="space-y-6 py-4 max-h-96 overflow-y-auto pl-2">
      {/* Step 1: Config File Location */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">1. מצא את קובץ התצורה</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono overflow-x-auto">
            {configPath}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopyPath}>
            {pathCopied ? '✓ הועתק!' : 'העתק נתיב'}
          </Button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          או פתח דרך: <strong>Settings → Developer → Edit Config</strong>
        </p>
      </div>

      {/* Step 2: Add Configuration */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">2. הוסף את התצורה הבאה</h3>
        <JsonConfigDisplay apiKey={apiKey} platform={platform} />
      </div>

      {/* Step 3: Restart Claude Code */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">3. הפעל מחדש את Claude Code</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          סגור ופתח מחדש את Claude Code כדי לטעון את השינויים
        </p>
      </div>

      {/* Step 4: Verification */}
      <div className="space-y-2">
        <h3 className="font-semibold text-base">4. אמת שההתקנה עבדה</h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-gray-700 dark:text-gray-300">
              הפעל Claude Code ובדוק שאין שגיאות
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-gray-700 dark:text-gray-300">
              בדוק ש-RightFlow מופיע ברשימת ה-MCP servers
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-gray-700 dark:text-gray-300">
              נסה לבצע פעולה דרך Claude Code
            </span>
          </div>
        </div>

        {/* Troubleshooting */}
        <Alert className="mt-4">
          <AlertTitle>בעיות נפוצות</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>אם אין קובץ תצורה - צור אותו ידנית</li>
              <li>וודא שה-JSON תקין (ללא פסיקים מיותרים)</li>
              <li>בדוק ש-RightFlow רץ על http://localhost:3003</li>
              <li>אם יש שגיאה באימות - ודא שהמפתח נכון</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Visual Setup Guide */}
        <VisualSetupGuide platform={platform} />

        {/* Test Connection */}
        <TestMcpConnection apiKey={apiKey} platform={platform} />
      </div>
    </div>
  );
}
