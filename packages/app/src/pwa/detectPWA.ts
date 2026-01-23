/**
 * PWA Detection Utilities
 * Detects device type and PWA installation status
 */

/**
 * Checks if the current device is running iOS
 */
export function isIOS(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Checks if the current device is running Android
 */
export function isAndroid(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
}

/**
 * Checks if the app is currently running in standalone mode (installed as PWA)
 */
export function isInStandaloneMode(): boolean {
  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone property
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  // Check Android TWA (Trusted Web Activity)
  if (document.referrer.includes('android-app://')) {
    return true;
  }

  return false;
}

/**
 * Checks if the current browser supports PWA installation
 */
export function supportsPWAInstall(): boolean {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}

/**
 * Checks if we should show the iOS install prompt
 * (iOS device, Safari browser, not in standalone mode)
 */
export function shouldShowIOSInstallPrompt(): boolean {
  return isIOS() && !isInStandaloneMode() && isSafari();
}

/**
 * Checks if the current browser is Safari
 */
export function isSafari(): boolean {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('safari') && !userAgent.includes('chrome');
}

/**
 * Checks if we should show the Android install prompt
 * (Android device, supports PWA, not in standalone mode)
 */
export function shouldShowAndroidInstallPrompt(): boolean {
  return isAndroid() && !isInStandaloneMode();
}

/**
 * Gets the current platform name
 */
export function getPlatform(): 'ios' | 'android' | 'desktop' {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
}

/**
 * Checks if the device is a mobile device
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Gets the safe area insets for iOS devices
 */
export function getSafeAreaInsets() {
  const getInset = (variable: string) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
    return parseInt(value) || 0;
  };

  return {
    top: getInset('--safe-area-inset-top') || (isIOS() ? 44 : 0),
    right: getInset('--safe-area-inset-right') || 0,
    bottom: getInset('--safe-area-inset-bottom') || (isIOS() ? 34 : 0),
    left: getInset('--safe-area-inset-left') || 0,
  };
}
