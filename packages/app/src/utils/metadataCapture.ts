/**
 * Metadata Capture Utility
 * Captures comprehensive metadata for form submissions
 */

import { getDeviceInfo, isPWA, getConnectionInfo } from './deviceDetection';
import type { SubmissionMetadata } from '@/db/schema';
import type { FormTiming } from '@/hooks/useFormTiming';
import { v4 as uuid } from 'uuid';

/**
 * Generate or retrieve device ID
 * Stored in localStorage for consistency across sessions
 */
export function getDeviceId(): string {
  const DEVICE_ID_KEY = 'rightflow-device-id';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = uuid();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Capture comprehensive submission metadata
 */
export function captureSubmissionMetadata(options: {
  userId: string;
  organizationId?: string;
  startedAt: Date;
  completedAt?: Date;
  timing?: FormTiming;
  locationCaptured?: boolean;
}): SubmissionMetadata {
  const {
    userId,
    organizationId,
    startedAt,
    completedAt,
    timing,
    locationCaptured = false,
  } = options;

  // Get device information
  const deviceInfo = getDeviceInfo();
  const isPWAMode = isPWA();
  const connection = getConnectionInfo();

  // Build metadata
  const metadata: SubmissionMetadata = {
    // User & Organization
    userId,
    organizationId,

    // Timing
    startedAt,
    completedAt,
    submittedAt: new Date(),

    // Include timing data if provided
    ...(timing && {
      totalSeconds: timing.totalSeconds,
      activeSeconds: timing.activeSeconds,
      idleSeconds: timing.idleSeconds,
      pauseCount: timing.pauseCount,
    }),

    // Device Information
    deviceId: getDeviceId(),
    deviceType: deviceInfo.deviceType,
    os: deviceInfo.os,
    osVersion: deviceInfo.osVersion,
    browser: deviceInfo.browser,
    browserVersion: deviceInfo.browserVersion,
    userAgent: deviceInfo.userAgent,
    isPWA: isPWAMode,

    // Screen & Display
    screenWidth: deviceInfo.screenWidth,
    screenHeight: deviceInfo.screenHeight,
    viewportWidth: deviceInfo.viewportWidth,
    viewportHeight: deviceInfo.viewportHeight,
    pixelRatio: deviceInfo.pixelRatio,

    // Capabilities
    touchSupported: deviceInfo.touchSupported,
    language: deviceInfo.language,
    timezone: deviceInfo.timezone,

    // Network
    isOnline: deviceInfo.isOnline,
    ...(connection && {
      connectionType: connection.type,
      connectionSpeed: connection.effectiveType,
    }),

    // Location (for GDPR compliance)
    locationCaptured,
  };

  console.log('[MetadataCapture] Captured metadata:', {
    device: `${metadata.deviceType} - ${metadata.os} ${metadata.osVersion}`,
    browser: `${metadata.browser} ${metadata.browserVersion}`,
    timing: timing ? `${timing.totalSeconds}s (${timing.activeSeconds}s active)` : 'not tracked',
    online: metadata.isOnline,
    pwa: metadata.isPWA,
  });

  return metadata;
}

/**
 * Format metadata for display
 */
export function formatMetadata(metadata: SubmissionMetadata): {
  label: string;
  value: string;
}[] {
  const items: { label: string; value: string }[] = [];

  // Device
  if (metadata.deviceType) {
    items.push({
      label: 'מכשיר',
      value: metadata.deviceType === 'mobile' ? 'נייד' : metadata.deviceType === 'tablet' ? 'טאבלט' : 'מחשב',
    });
  }

  // Operating System
  if (metadata.os) {
    items.push({
      label: 'מערכת הפעלה',
      value: `${metadata.os} ${metadata.osVersion || ''}`.trim(),
    });
  }

  // Browser
  if (metadata.browser) {
    items.push({
      label: 'דפדפן',
      value: `${metadata.browser} ${metadata.browserVersion || ''}`.trim(),
    });
  }

  // Timing
  if (metadata.totalSeconds !== undefined) {
    items.push({
      label: 'זמן מילוי',
      value: formatDuration(metadata.totalSeconds),
    });
  }

  if (metadata.activeSeconds !== undefined) {
    items.push({
      label: 'זמן פעיל',
      value: formatDuration(metadata.activeSeconds),
    });
  }

  // Screen
  if (metadata.screenWidth && metadata.screenHeight) {
    items.push({
      label: 'רזולוציה',
      value: `${metadata.screenWidth}x${metadata.screenHeight}`,
    });
  }

  // Connection
  if (metadata.connectionSpeed) {
    items.push({
      label: 'מהירות חיבור',
      value: metadata.connectionSpeed,
    });
  }

  // Online/Offline
  items.push({
    label: 'סטטוס',
    value: metadata.isOnline ? 'מקוון' : 'לא מקוון',
  });

  // PWA
  if (metadata.isPWA) {
    items.push({
      label: 'אפליקציה מותקנת',
      value: 'כן',
    });
  }

  // Location
  if (metadata.locationCaptured) {
    items.push({
      label: 'מיקום נלכד',
      value: 'כן',
    });
  }

  // Timezone
  if (metadata.timezone) {
    items.push({
      label: 'אזור זמן',
      value: metadata.timezone,
    });
  }

  return items;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} שניות`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} דקות ו-${remainingSeconds} שניות`
      : `${minutes} דקות`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} שעות ו-${remainingMinutes} דקות`
    : `${hours} שעות`;
}

/**
 * Check if metadata contains personally identifiable information (for GDPR)
 */
export function containsPII(metadata: SubmissionMetadata): boolean {
  // IP address is PII
  if (metadata.ipAddress) return true;

  // Location is PII
  if (metadata.locationCaptured) return true;

  // Device ID could be considered PII
  if (metadata.deviceId) return true;

  return false;
}

/**
 * Strip PII from metadata (for anonymous analytics)
 */
export function stripPII(metadata: SubmissionMetadata): SubmissionMetadata {
  const stripped: SubmissionMetadata = { ...metadata };

  // Remove PII fields
  delete stripped.ipAddress;
  delete stripped.deviceId;
  delete stripped.userId;
  stripped.locationCaptured = false;

  return stripped;
}
