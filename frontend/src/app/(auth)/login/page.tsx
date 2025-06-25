"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error params from auth callback
  useEffect(() => {
    const authError = searchParams.get('error');
    const errorMessages: Record<string, string> = {
      'auth_failed': 'Authentication failed. Please try again.',
      'unexpected_error': 'An unexpected error occurred. Please try again.',
      'no_code': 'Google login was cancelled or failed. Please try again.',
      'direct_access': 'Please login through the login page.',
      'You cancelled the login process': 'Login was cancelled.',
      'Google authentication service is temporarily unavailable': 'Google login is temporarily unavailable. Please try again later.',
      'Authentication service is temporarily unavailable': 'Authentication service is temporarily unavailable.',
      'Invalid authentication request': 'Invalid authentication request. Please try again.'
    };
    
    if (authError) {
      setError(errorMessages[authError] || `Authentication error: ${authError}`);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleLogin = async () => {
    console.log('[Login Page] Google login button clicked!');
    setError(null);
    
    try {
      setLoading(true);
      console.log('[Login Page] Calling signInWithGoogle...');
      
      const { error } = await signInWithGoogle();
      console.log('[Login Page] signInWithGoogle returned:', { error });
      
      if (error) {
        throw error;
      }
      
      // The redirect will be handled by Supabase OAuth flow
    } catch (error) {
      setError((error as Error).message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  // If still checking authentication status, show loading
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-8 pb-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Welcome to Grantify.ai
          </h1>
          
          <p className="text-gray-600 text-center mb-8">
            Sign in to discover grants tailored to your research
          </p>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <button
            onClick={() => {
              console.log('[Login Page] Button clicked directly!');
              handleGoogleLogin();
            }}
            disabled={loading}
            className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 transition-all duration-300 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-3"></div>
                Signing in...
              </span>
            ) : (
              <>
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
              
              <details className="text-sm">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  Can&apos;t sign in?
                </summary>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Having trouble signing in?</strong>
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Make sure pop-ups are enabled for this site</li>
                    <li>• Try using a different browser or incognito mode</li>
                    <li>• If you recently cleared Google cache, try signing out of Google first</li>
                    <li>• Ensure third-party cookies are enabled</li>
                    <li>• <Link href="/account-help" className="text-blue-600 hover:text-blue-800">View detailed help guide</Link></li>
                  </ul>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Debug info for support:</p>
                    <code className="text-xs bg-gray-100 p-1 rounded block">
                      Origin: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
                    </code>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}