import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';
import { useAppStore } from './store/appStore';
import { getTranslations } from './i18n/translations';

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Show update notification to user
        const { language } = useAppStore.getState();
        const t = getTranslations(language);

        const shouldUpdate = confirm(
          `${t.pwaNewVersionTitle}\n\n${t.pwaNewVersionMessage}`,
        );
        if (shouldUpdate) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        const { language } = useAppStore.getState();
        const t = getTranslations(language);
        console.log(`✅ ${t.pwaOfflineReady}`);
      },
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        const { language } = useAppStore.getState();
        const t = getTranslations(language);
        console.log(`✅ ${t.pwaRegistered}`);

        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // 1 hour
        }
      },
      onRegisterError(error: Error) {
        const { language } = useAppStore.getState();
        const t = getTranslations(language);
        console.error(`❌ ${t.pwaRegistrationError}:`, error);
      },
    });
  }).catch(error => {
    console.error('❌ שגיאה בטעינת PWA module:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
