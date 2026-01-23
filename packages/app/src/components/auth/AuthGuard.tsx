import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Authentication Guard Component
 * Protects routes by redirecting unauthenticated users to sign-in page
 * Preserves the intended destination in location state for post-login redirect
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6100]"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  // Save the current location so we can redirect back after login
  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
