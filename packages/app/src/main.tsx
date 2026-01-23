import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/index.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Show update notification to user
        const shouldUpdate = confirm(
          'גרסה חדשה של האפליקציה זמינה! \nלחץ אישור כדי לעדכן עכשיו.',
        );
        if (shouldUpdate) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('✅ האפליקציה מוכנה לעבודה במצב לא מקוון');
      },
      onRegistered(registration: ServiceWorkerRegistration | undefined) {
        console.log('✅ Service Worker נרשם בהצלחה');

        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // 1 hour
        }
      },
      onRegisterError(error: Error) {
        console.error('❌ שגיאה ברישום Service Worker:', error);
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
