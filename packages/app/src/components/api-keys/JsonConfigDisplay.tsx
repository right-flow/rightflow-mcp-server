/**
 * JSON Config Display Component
 * Displays MCP configuration JSON with copy and download actions
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateMcpConfig, downloadConfigFile, copyToClipboard, type Platform } from '@/utils/mcpConfigHelpers';
import { trackMcpConfigCopied, trackMcpConfigDownloaded } from '@/utils/mcpAnalytics';

interface JsonConfigDisplayProps {
  apiKey: string;
  platform: Platform;
}

export function JsonConfigDisplay({ apiKey, platform }: JsonConfigDisplayProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const config = generateMcpConfig(apiKey);
  const jsonString = JSON.stringify(config, null, 2);

  const handleCopy = async () => {
    const success = await copyToClipboard(jsonString);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
      trackMcpConfigCopied(platform);
      toast.success('הועתק ללוח!', {
        description: 'התצורה הועתקה בהצלחה',
      });
    } else {
      toast.error('שגיאה בהעתקה', {
        description: 'אנא נסה שוב או העתק ידנית',
      });
    }
  };

  const handleDownload = () => {
    try {
      downloadConfigFile(apiKey);
      trackMcpConfigDownloaded(platform);
      toast.success('הקובץ הורד בהצלחה!', {
        description: 'העבר את הקובץ למיקום התצורה של Claude',
      });
    } catch (error) {
      toast.error('שגיאה בהורדת הקובץ', {
        description: 'אנא נסה שוב',
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto text-sm font-mono max-h-64">
          <code>{jsonString}</code>
        </pre>

        <div className="absolute top-2 left-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
            onClick={handleCopy}
          >
            {copySuccess ? '✓ הועתק!' : 'העתק JSON'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
            onClick={handleDownload}
          >
            הורד קובץ
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-600">
        💡 טיפ: אם יש לך כבר תצורת MCP, הוסף את "rightflow" בתוך "mcpServers" הקיים
      </p>
    </div>
  );
}
