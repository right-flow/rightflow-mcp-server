/**
 * MCP Setup Analytics
 * Track user interactions with MCP setup instructions
 */

export interface McpAnalyticsEvent {
  event: string;
  platform?: string;
  timestamp: string;
  properties?: Record<string, any>;
}

/**
 * Track MCP setup events
 * Currently logs to console - can be extended to send to analytics service
 */
export function trackMcpEvent(event: string, properties?: Record<string, any>): void {
  const analyticsEvent: McpAnalyticsEvent = {
    event,
    timestamp: new Date().toISOString(),
    ...(properties && { properties }),
  };

  // Log to console for now (can be sent to analytics service later)
  console.log('[MCP Analytics]', analyticsEvent);

  // Future: Send to analytics service
  // Example: posthog.capture(event, properties)
  // Example: mixpanel.track(event, properties)
  // Example: amplitude.logEvent(event, properties)
}

/**
 * Track when MCP setup instructions are viewed
 */
export function trackMcpSetupViewed(platform: string): void {
  trackMcpEvent('mcp_setup_viewed', { platform });
}

/**
 * Track when user switches platform tab
 */
export function trackMcpPlatformChanged(fromPlatform: string, toPlatform: string): void {
  trackMcpEvent('mcp_platform_changed', {
    from_platform: fromPlatform,
    to_platform: toPlatform,
  });
}

/**
 * Track when user copies config path
 */
export function trackMcpPathCopied(platform: string): void {
  trackMcpEvent('mcp_path_copied', { platform });
}

/**
 * Track when user copies JSON config
 */
export function trackMcpConfigCopied(platform: string): void {
  trackMcpEvent('mcp_config_copied', { platform });
}

/**
 * Track when user downloads config file
 */
export function trackMcpConfigDownloaded(platform: string): void {
  trackMcpEvent('mcp_config_downloaded', { platform });
}

/**
 * Track when user tests MCP connection
 */
export function trackMcpConnectionTested(success: boolean, platform: string): void {
  trackMcpEvent('mcp_connection_tested', {
    success,
    platform,
  });
}

/**
 * Track setup completion rate
 * Helps measure how many users complete the setup process
 */
export function trackMcpSetupCompleted(platform: string, timeSpent?: number): void {
  trackMcpEvent('mcp_setup_completed', {
    platform,
    ...(timeSpent && { time_spent_seconds: timeSpent }),
  });
}
