/**
 * Landing Page (Phase 1)
 * Welcome screen for unauthenticated users
 * Redirects to dashboard for authenticated users
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInButton, useUser } from '@clerk/clerk-react';

export function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          {/* Hero Section */}
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            RightFlow
          </h1>
          <p className="text-2xl text-gray-700 mb-2">
            Hebrew PDF Form Builder
          </p>
          <p className="text-xl text-gray-600 mb-12">
            The only PDF form builder built for Hebrew & RTL languages
          </p>

          {/* CTA Button */}
          <div className="mb-16">
            <SignInButton mode="modal">
              <button className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg">
                Get Started Free
              </button>
            </SignInButton>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold mb-2">Native Hebrew Support</h3>
              <p className="text-gray-600">
                Full RTL support with proper text direction and font rendering
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
              <p className="text-gray-600">
                Drag and drop interface for creating forms in minutes
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is encrypted and stored securely on Israeli servers
              </p>
            </div>
          </div>

          {/* Pricing Preview */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 text-lg">
              Starting from <span className="font-bold text-2xl text-blue-600">₪0/month</span>
            </p>
            <p className="text-gray-500 mt-2">Free plan includes 3 forms · 100 responses/month</p>
          </div>
        </div>
      </div>
    </div>
  );
}
