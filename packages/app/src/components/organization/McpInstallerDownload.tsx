/**
 * MCP Installer Download Component
 * Provides download button for pre-configured MCP server installer package
 */

import { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useDirection } from '@/i18n';
import { useAuth } from '@clerk/clerk-react';

export function McpInstallerDownload() {
  const direction = useDirection();
  const { getToken } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Call backend endpoint
      const response = await fetch('/api/v1/organization/mcp-download', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to download installer');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'rightflow-mcp-installer.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(
        direction === 'rtl' ? 'הקובץ הורד בהצלחה!' : 'File downloaded successfully!',
        {
          description: direction === 'rtl'
            ? 'פרוש את הקובץ והרץ את setup-mcp.ps1'
            : 'Extract the file and run setup-mcp.ps1',
        }
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(
        direction === 'rtl' ? 'שגיאה בהורדת הקובץ' : 'Download failed',
        {
          description: errorMessage,
        }
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 3H4a1 1 0 0 0-1 1v5M9 3h12M9 3v18m12-18v18M9 21H4a1 1 0 0 1-1-1v-5m18 6h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {direction === 'rtl' ? 'תוסף Claude Code 🤖' : 'Claude Code Extension 🤖'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {direction === 'rtl'
              ? 'הורד והתקן את חיבור RightFlow עבור Claude Desktop'
              : 'Download and install RightFlow connector for Claude Desktop'}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          {direction === 'rtl' ? 'מה זה תוסף Claude Code?' : 'What is Claude Code Extension?'}
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
          {direction === 'rtl'
            ? 'תוסף MCP (Model Context Protocol) שמאפשר ל-Claude Desktop להפיק טפסי PDF בעברית עם תמיכה מלאה ב-RTL ו-20+ תבניות מוכנות בעברית איתך. אין צורך בהגדרות ידניות!'
            : 'MCP (Model Context Protocol) extension that enables Claude Desktop to generate Hebrew PDFs with proper RTL text handling and 20+ ready-made templates. No manual configuration needed!'}
        </p>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {direction === 'rtl'
                ? 'יצירת PDF בעברית עם תמיכה מלאה ב-RTL'
                : 'Hebrew PDF generation with proper RTL support'}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {direction === 'rtl'
                ? '+20 תבניות מוכנות (חוזה עבודה, השבחה, הנהלת חשבונות, נדל"ן)'
                : '20+ templates (employment, legal, accounting, HR, real estate)'}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {direction === 'rtl'
                ? 'אינטגרציה ישירה עם הארגון שלך (כולל API keys)'
                : 'Direct integration with your organization (includes API keys)'}
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {direction === 'rtl'
                ? 'מעקב אחר שימוש וקרדיטים'
                : 'Usage tracking and credits monitoring'}
            </span>
          </li>
        </ul>
      </div>

      {/* Requirements */}
      <div className="p-3 rounded-lg bg-muted/50">
        <h5 className="text-sm font-semibold mb-2 text-foreground">
          {direction === 'rtl' ? 'דרישות מערכת:' : 'System Requirements:'}
        </h5>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• {direction === 'rtl' ? 'Windows 10/11' : 'Windows 10/11'}</li>
          <li>
            • {direction === 'rtl' ? 'Node.js 18+' : 'Node.js 18+'}{' '}
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ({direction === 'rtl' ? 'הורד כאן' : 'Download'})
            </a>
          </li>
          <li>
            • {direction === 'rtl' ? 'Claude Desktop' : 'Claude Desktop'}{' '}
            <a
              href="https://claude.ai/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ({direction === 'rtl' ? 'הורד כאן' : 'Download'})
            </a>
          </li>
          <li>• {direction === 'rtl' ? '200MB פנויים' : '200MB free space'}</li>
        </ul>
      </div>

      {/* Download Button */}
      <div className="space-y-3">
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin ml-2" />
              {direction === 'rtl' ? 'מוריד...' : 'Downloading...'}
            </>
          ) : (
            <>
              <Download className={`w-5 h-5 ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
              {direction === 'rtl'
                ? 'הורד חבילת התקנה מותאמת אישית'
                : 'Download Personalized Installer'}
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {direction === 'rtl' ? 'שגיאה בהורדה' : 'Download Error'}
            </AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {direction === 'rtl'
            ? 'החבילה כוללת הגדרה מותאמת לארגון שלך. אין צורך להזין API keys ידנית!'
            : 'Package includes pre-configured settings for your organization. No need to enter API keys manually!'}
        </p>
      </div>

      {/* Instructions */}
      <div className="pt-4 border-t border-border">
        <h5 className="text-sm font-semibold mb-3 text-foreground">
          {direction === 'rtl' ? 'הוראות התקנה:' : 'Installation Instructions:'}
        </h5>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[1.5rem]">1.</span>
            <span>
              {direction === 'rtl'
                ? 'הורד את קובץ ה-ZIP ופרוש אותו לתיקייה זמנית'
                : 'Download the ZIP file and extract to a temporary folder'}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[1.5rem]">2.</span>
            <span>
              {direction === 'rtl'
                ? 'הרץ את setup-mcp.ps1 (לחיצה ימנית → "Run with PowerShell")'
                : 'Run setup-mcp.ps1 (right-click → "Run with PowerShell")'}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[1.5rem]">3.</span>
            <span>
              {direction === 'rtl'
                ? 'הפעל מחדש את Claude Desktop (סגירה מלאה ופתיחה מחדש)'
                : 'Restart Claude Desktop (completely close and reopen)'}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-foreground min-w-[1.5rem]">4.</span>
            <span>
              {direction === 'rtl'
                ? 'שאל את Claude: "הצג לי תבניות PDF זמינות"'
                : 'Ask Claude: "Show me available PDF templates"'}
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
