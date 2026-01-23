/**
 * Device Detection Utilities
 * Capture device and browser information for form metadata
 */

export interface DeviceInfo {
  /** User agent string */
  userAgent: string;
  /** Device type (mobile, tablet, desktop) */
  deviceType: 'mobile' | 'tablet' | 'desktop';
  /** Operating system */
  os: string;
  /** OS version */
  osVersion: string;
  /** Browser name */
  browser: string;
  /** Browser version */
  browserVersion: string;
  /** Screen width */
  screenWidth: number;
  /** Screen height */
  screenHeight: number;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Touch support */
  touchSupported: boolean;
  /** Online status */
  isOnline: boolean;
  /** Language */
  language: string;
  /** Timezone */
  timezone: string;
}

/**
 * Detect device type from user agent and screen size
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;

  // Check for mobile
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return 'mobile';
  }

  // Check for tablet
  if (/iPad|Android/i.test(ua) && !/Mobile/i.test(ua)) {
    return 'tablet';
  }

  // Check by screen size as fallback
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';

  return 'desktop';
}

/**
 * Detect operating system
 */
export function getOS(): { name: string; version: string } {
  const ua = navigator.userAgent;

  // Windows
  if (/Windows NT 10.0/i.test(ua)) return { name: 'Windows', version: '10' };
  if (/Windows NT 6.3/i.test(ua)) return { name: 'Windows', version: '8.1' };
  if (/Windows NT 6.2/i.test(ua)) return { name: 'Windows', version: '8' };
  if (/Windows NT 6.1/i.test(ua)) return { name: 'Windows', version: '7' };
  if (/Windows/i.test(ua)) return { name: 'Windows', version: 'Unknown' };

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+)[._](\d+)/);
  if (macMatch) {
    return { name: 'macOS', version: `${macMatch[1]}.${macMatch[2]}` };
  }
  if (/Mac/i.test(ua)) return { name: 'macOS', version: 'Unknown' };

  // iOS
  const iosMatch = ua.match(/OS (\d+)[._](\d+)/);
  if (iosMatch) {
    return { name: 'iOS', version: `${iosMatch[1]}.${iosMatch[2]}` };
  }
  if (/iPhone|iPad|iPod/i.test(ua)) return { name: 'iOS', version: 'Unknown' };

  // Android
  const androidMatch = ua.match(/Android (\d+\.?\d*)/);
  if (androidMatch) {
    return { name: 'Android', version: androidMatch[1] };
  }
  if (/Android/i.test(ua)) return { name: 'Android', version: 'Unknown' };

  // Linux
  if (/Linux/i.test(ua)) return { name: 'Linux', version: 'Unknown' };

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Detect browser
 */
export function getBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent;

  // Edge (Chromium-based)
  const edgeMatch = ua.match(/Edg\/(\d+\.\d+)/);
  if (edgeMatch) {
    return { name: 'Edge', version: edgeMatch[1] };
  }

  // Chrome
  const chromeMatch = ua.match(/Chrome\/(\d+\.\d+)/);
  if (chromeMatch && !/Edg/i.test(ua)) {
    return { name: 'Chrome', version: chromeMatch[1] };
  }

  // Safari
  const safariMatch = ua.match(/Version\/(\d+\.\d+).*Safari/);
  if (safariMatch && !/Chrome|Chromium/i.test(ua)) {
    return { name: 'Safari', version: safariMatch[1] };
  }

  // Firefox
  const firefoxMatch = ua.match(/Firefox\/(\d+\.\d+)/);
  if (firefoxMatch) {
    return { name: 'Firefox', version: firefoxMatch[1] };
  }

  // Opera
  const operaMatch = ua.match(/OPR\/(\d+\.\d+)/);
  if (operaMatch) {
    return { name: 'Opera', version: operaMatch[1] };
  }

  // Internet Explorer
  const ieMatch = ua.match(/MSIE (\d+\.\d+)|Trident.*rv:(\d+\.\d+)/);
  if (ieMatch) {
    return { name: 'Internet Explorer', version: ieMatch[1] || ieMatch[2] };
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Check if touch is supported
 */
export function isTouchSupported(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - IE specific
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Get timezone
 */
export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Unknown';
  }
}

/**
 * Get complete device information
 */
export function getDeviceInfo(): DeviceInfo {
  const os = getOS();
  const browser = getBrowser();

  return {
    userAgent: navigator.userAgent,
    deviceType: getDeviceType(),
    os: os.name,
    osVersion: os.version,
    browser: browser.name,
    browserVersion: browser.version,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    touchSupported: isTouchSupported(),
    isOnline: navigator.onLine,
    language: navigator.language,
    timezone: getTimezone(),
  };
}

/**
 * Get a simplified device string for display
 */
export function getDeviceString(): string {
  const os = getOS();
  const browser = getBrowser();
  const deviceType = getDeviceType();

  return `${deviceType} - ${os.name} ${os.version} - ${browser.name} ${browser.version}`;
}

/**
 * Check if running as PWA (installed app)
 */
export function isPWA(): boolean {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS Safari specific check
  // @ts-expect-error - iOS specific
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

/**
 * Get connection information
 */
export function getConnectionInfo(): {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} | null {
  // @ts-expect-error - NetworkInformation API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return null;
  }

  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false,
  };
}
