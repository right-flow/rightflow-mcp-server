/**
 * Test MCP Connection Component
 * Allows users to verify their MCP setup is working
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { type Platform } from '@/utils/mcpConfigHelpers';
import { trackMcpConnectionTested } from '@/utils/mcpAnalytics';

interface TestMcpConnectionProps {
  apiKey: string;
  platform: Platform;
}

export function TestMcpConnection({ apiKey, platform }: TestMcpConnectionProps) {
  const [testing, setTesting] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setLastTestResult(null);

    try {
      // Make a test request to the MCP endpoint
      const response = await fetch('http://localhost:3003/api/v1/mcp/templates', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setLastTestResult('success');
        trackMcpConnectionTested(true, platform);
        toast.success('✅ החיבור תקין!', {
          description: 'ה-MCP server מגיב בהצלחה',
        });
      } else {
        const errorText = await response.text();
        setLastTestResult('error');
        trackMcpConnectionTested(false, platform);
        toast.error('❌ שגיאה בחיבור', {
          description: `סטטוס: ${response.status} - ${errorText.slice(0, 100)}`,
        });
      }
    } catch (error) {
      setLastTestResult('error');
      trackMcpConnectionTested(false, platform);

      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        toast.error('❌ לא ניתן להתחבר ל-MCP server', {
          description: 'ודא ש-RightFlow רץ על http://localhost:3003',
        });
      } else {
        toast.error('❌ שגיאה בבדיקת החיבור', {
          description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
        });
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-2 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <h4 className="font-semibold text-sm">בדיקת חיבור</h4>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        בדוק שההגדרות שלך עובדות ע"י שליחת בקשת מבחן ל-MCP server
      </p>

      <Button
        onClick={handleTestConnection}
        disabled={testing}
        size="sm"
        variant={lastTestResult === 'success' ? 'default' : 'outline'}
        className={
          lastTestResult === 'success'
            ? 'bg-green-600 hover:bg-green-700'
            : lastTestResult === 'error'
              ? 'border-red-500 text-red-600'
              : ''
        }
      >
        {testing ? '🔄 בודק...' : lastTestResult === 'success' ? '✅ החיבור תקין' : '🧪 בדוק חיבור'}
      </Button>

      {lastTestResult === 'success' && (
        <p className="text-xs text-green-600">כל הכבוד! ההגדרה שלך עובדת מצוין 🎉</p>
      )}
    </div>
  );
}
