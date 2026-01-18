/**
 * Application Root (Phase 1)
 * Wraps the entire app with providers and routing
 */

import { ClerkProvider } from '@clerk/clerk-react';
import { Router } from './Router';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY not found. Authentication will not work.');
}

function App() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY || ''}
      appearance={{
        layout: {
          socialButtonsPlacement: 'bottom',
        },
      }}
    >
      <Router />
    </ClerkProvider>
  );
}

export default App;
