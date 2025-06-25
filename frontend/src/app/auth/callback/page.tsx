"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        console.log('[Auth Callback Page] Processing auth callback...');
        console.log('[Auth Callback Page] Full URL:', window.location.href);
        
        // Import supabase here to ensure it's initialized with the URL params
        const { default: supabase } = await import('@/lib/supabaseClient');
        
        // Check for errors first
        const searchParams = new URLSearchParams(window.location.search);
        const error = searchParams.get('error');
        
        if (error) {
          console.error('[Auth Callback Page] Error from auth:', error);
          router.push(`/login?error=${error}`);
          return;
        }

        // Wait a bit for Supabase to process the URL (detectSessionInUrl: true)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('[Auth Callback Page] Session check:', {
          hasSession: !!session,
          sessionError: sessionError?.message,
          userId: session?.user?.id
        });
        
        if (session) {
          console.log('[Auth Callback Page] Session obtained successfully');
          router.push('/dashboard');
        } else {
          console.error('[Auth Callback Page] No session found:', sessionError);
          router.push('/login?error=session_failed');
        }
      } catch (err) {
        console.error('[Auth Callback Page] Unexpected error:', err);
        router.push('/login?error=unexpected_error');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}