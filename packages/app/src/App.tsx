/**
 * Application Root (Phase 1)
 * Wraps the entire app with providers and routing
 */

import { useEffect } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { heIL, arSA, enUS } from '@clerk/localizations';
import { Router } from './Router';
import { PWAInstallPrompt } from './pwa/PWAInstallPrompt';
import { IOSInstallBanner } from './pwa/IOSInstallBanner';
import { Toaster } from './components/ui/toaster';
import { syncManager } from './sync/syncManager';
import { db } from './db/indexedDB';
import { useAppStore } from './store/appStore';

// Map app language to Clerk localization
const clerkLocalizations = {
  he: heIL,
  ar: arSA,
  en: enUS,
} as const;

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY not found. Authentication will not work.');
}

function App() {
  const language = useAppStore((state) => state.language);

  // Sync RTL direction to document root
  useEffect(() => {
    const direction = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  useEffect(() => {
    // Initialize IndexedDB and Sync Manager on app start
    const initializeOfflineSupport = async () => {
      try {
        // Initialize database
        await db.init();
        console.log('✅ IndexedDB initialized');

        // Initialize sync manager
        await syncManager.init();
        console.log('✅ Sync Manager initialized');
      } catch (error) {
        console.error('❌ Failed to initialize offline support:', error);
      }
    };

    initializeOfflineSupport();

    // Cleanup on unmount
    return () => {
      syncManager.destroy();
    };
  }, []);

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY || ''}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      localization={clerkLocalizations[language]}
      appearance={{
        layout: {
          socialButtonsPlacement: 'bottom',
        },
      }}
    >
      {/* PWA Install Prompts */}
      <PWAInstallPrompt />
      <IOSInstallBanner />

      {/* Toast Notifications */}
      <Toaster />

      {/* Main App Router */}
      <Router />
    </ClerkProvider>
  );
}

export default App;
