/**
 * MCP Setup Instructions Component
 * Main component for displaying platform-specific MCP setup instructions
 */

import { useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlatformConfigTab } from './PlatformConfigTab';
import { getPlatformForMcp } from '@/utils/mcpConfigHelpers';
import { trackMcpSetupViewed, trackMcpPlatformChanged } from '@/utils/mcpAnalytics';

interface McpSetupInstructionsProps {
  apiKey: string;
}

export function McpSetupInstructions({ apiKey }: McpSetupInstructionsProps) {
  const detectedPlatform = getPlatformForMcp();

  // Track when setup instructions are viewed
  useEffect(() => {
    trackMcpSetupViewed(detectedPlatform);
  }, [detectedPlatform]);

  // Track platform tab changes
  const handlePlatformChange = (newPlatform: string) => {
    if (newPlatform !== detectedPlatform) {
      trackMcpPlatformChanged(detectedPlatform, newPlatform);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Warning about one-time visibility */}
      <Alert variant="warning">
        <AlertTitle>שים לב!</AlertTitle>
        <AlertDescription>
          זוהי ההזדמנות היחידה לראות את המפתח המלא. לא תוכל לראותו שוב!
        </AlertDescription>
      </Alert>

      {/* Platform-specific tabs */}
      <div>
        <h3 className="font-semibold text-base mb-3">הוראות התקנה:</h3>

        <Tabs defaultValue={detectedPlatform} onValueChange={handlePlatformChange}>
          <TabsList className="w-full">
            <TabsTrigger value="windows" className="flex-1">
              Windows
            </TabsTrigger>
            <TabsTrigger value="macos" className="flex-1">
              macOS
            </TabsTrigger>
            <TabsTrigger value="linux" className="flex-1">
              Linux
            </TabsTrigger>
          </TabsList>

          <TabsContent value="windows">
            <PlatformConfigTab platform="windows" apiKey={apiKey} />
          </TabsContent>

          <TabsContent value="macos">
            <PlatformConfigTab platform="macos" apiKey={apiKey} />
          </TabsContent>

          <TabsContent value="linux">
            <PlatformConfigTab platform="linux" apiKey={apiKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
