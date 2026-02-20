/**
 * MCP Configuration Helpers
 * Utilities for generating and managing MCP server configuration
 */

import { getOS } from './deviceDetection';

/**
 * Platform-specific config file paths
 */
const CONFIG_PATHS = {
  windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
  macos: '~/Library/Application Support/Claude/claude_desktop_config.json',
  linux: '~/.config/Claude/claude_desktop_config.json',
} as const;

export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Get platform identifier for MCP configuration
 * Maps OS detection to platform keys
 */
export function getPlatformForMcp(): Platform {
  const os = getOS();

  // Map OS names to platform identifiers
  switch (os.name.toLowerCase()) {
    case 'windows':
      return 'windows';
    case 'macos':
      return 'macos';
    case 'linux':
    case 'android': // Treat Android as Linux
    default:
      return 'linux'; // Default to Linux for unknown OS
  }
}

/**
 * Get config file path for a specific platform
 */
export function getConfigPath(platform: Platform): string {
  return CONFIG_PATHS[platform];
}

/**
 * Generate MCP server configuration with API key
 */
export function generateMcpConfig(apiKey: string): object {
  return {
    mcpServers: {
      rightflow: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-http', 'http://localhost:3003/api/v1/mcp'],
        env: {
          RIGHTFLOW_API_KEY: apiKey,
        },
      },
    },
  };
}

/**
 * Download JSON config file
 * @param apiKey - The API key to include in the config
 * @param filename - Optional filename (defaults to claude_desktop_config.json)
 */
export function downloadConfigFile(apiKey: string, filename = 'claude_desktop_config.json'): void {
  const config = generateMcpConfig(apiKey);
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
