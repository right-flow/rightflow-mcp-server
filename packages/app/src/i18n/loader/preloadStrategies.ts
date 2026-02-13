import type { TranslationNamespace, Language } from '../types/index';
import { preloadNamespaces } from './namespaceLoader';

/**
 * Route to namespace mapping
 * Defines which namespaces should be preloaded for each route
 */
export const routeNamespaces: Record<string, TranslationNamespace[]> = {
  '/': ['common'],
  '/dashboard': ['common', 'dashboard'],
  '/editor': ['common', 'editor'],
  '/editor/:formId': ['common', 'editor'],
  '/billing': ['common', 'billing'],
  '/billing/subscription': ['common', 'billing'],
  '/billing/usage': ['common', 'billing'],
  '/billing/history': ['common', 'billing'],
  '/organization': ['common', 'dashboard'],
  '/organization/whatsapp': ['common', 'dashboard', 'editor'],
  '/organization/users': ['common', 'dashboard'],
  '/reports': ['common', 'dashboard'],
  '/responses': ['common', 'dashboard'],
  '/responses/:formId': ['common', 'dashboard'],
  '/workflow': ['common', 'workflow'],
  '/workflow/:formId': ['common', 'workflow'],
  '/automation': ['common', 'workflow'],
  '/help': ['common', 'help'],
};

/**
 * Get namespaces for a route path
 *
 * @param pathname - The current route pathname
 * @returns Array of namespaces to load for this route
 */
export function getNamespacesForRoute(pathname: string): TranslationNamespace[] {
  // Check exact match first
  if (routeNamespaces[pathname]) {
    return routeNamespaces[pathname];
  }

  // Check pattern matches (with params)
  for (const [pattern, namespaces] of Object.entries(routeNamespaces)) {
    if (matchRoute(pattern, pathname)) {
      return namespaces;
    }
  }

  // Default to common only
  return ['common'];
}

/**
 * Simple route pattern matching
 * Supports :param placeholders
 */
function matchRoute(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, i) => {
    return part.startsWith(':') || part === pathParts[i];
  });
}

/**
 * Preload namespaces for current route
 * Call this from router or layout component
 *
 * @param pathname - The current route pathname
 * @param language - The current language
 */
export async function preloadRouteTranslations(
  pathname: string,
  language: Language
): Promise<void> {
  const namespaces = getNamespacesForRoute(pathname);
  await preloadNamespaces(language, namespaces);
}

/**
 * Preload all critical namespaces
 * Call this on app initialization
 *
 * @param language - The current language
 */
export async function preloadCriticalNamespaces(language: Language): Promise<void> {
  // Always preload common namespace
  await preloadNamespaces(language, ['common']);
}

/**
 * Get all unique namespaces used by the app
 * Useful for preloading everything in advance
 */
export function getAllNamespaces(): TranslationNamespace[] {
  const allNamespaces = new Set<TranslationNamespace>();

  Object.values(routeNamespaces).forEach((namespaces) => {
    namespaces.forEach((ns) => allNamespaces.add(ns));
  });

  return Array.from(allNamespaces);
}
