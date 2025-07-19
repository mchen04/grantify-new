"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';

// Define the context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const initAttempted = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    // Prevent multiple initialization attempts
    if (initAttempted.current) {
      return;
    }
    initAttempted.current = true;
    
    // Check for auth-success cookie and refresh session if found
    const checkAuthSuccess = async () => {
      if (typeof window !== 'undefined' && document.cookie.includes('auth-success=true')) {
        console.log('[AuthContext] Auth success cookie found, refreshing session...');
        // Remove the cookie
        document.cookie = 'auth-success=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // Force refresh the session
        await supabase.auth.refreshSession();
      }
    };
    
    checkAuthSuccess();
    
    // Force loading to complete after reasonable timeout
    const forceComplete = () => {
      if (mounted && isLoading) {
        console.log('[AuthContext] Force completing auth initialization');
        setIsLoading(false);
      }
    };
    
    const timeoutId = setTimeout(forceComplete, 2000);
    
    // Simplified auth initialization
    const initAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth...');
        
        // Check if we have required environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error('[AuthContext] Missing Supabase environment variables');
          if (mounted) {
            setIsLoading(false);
            clearTimeout(timeoutId);
          }
          return;
        }

        // Try to get current session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]);
        
        if (mounted) {
          console.log('[AuthContext] Auth completed:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            error: error?.message
          });
          
          setSession(session);
          setUser(session?.user ?? null);
          userRef.current = session?.user ?? null;
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('[AuthContext] Auth failed:', error);
        if (mounted) {
          // Set to not loading even on error
          setIsLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    // Start auth initialization
    initAuth();

    // Set up auth state change listener
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (mounted) {
            console.log('[AuthContext] Auth state change:', event, {
              hasSession: !!session,
              hasUser: !!session?.user,
              userId: session?.user?.id
            });
            
            // Handle token refresh for expired sessions
            if (event === 'TOKEN_REFRESHED') {
              console.log('[AuthContext] Token refreshed successfully');
            } else if (event === 'SIGNED_OUT') {
              console.log('[AuthContext] User signed out');
            } else if (event === 'SIGNED_IN') {
              console.log('[AuthContext] User signed in:', {
                userId: session?.user?.id,
                email: session?.user?.email
              });
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            userRef.current = session?.user ?? null;
            setIsLoading(false);
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error('[AuthContext] Failed to set up auth listener:', error);
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      console.log('[AuthContext] Initiating Google OAuth with redirect to:', `${window.location.origin}/auth/callback`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('[AuthContext] OAuth initiation error:', error);
      } else {
        console.log('[AuthContext] OAuth initiated successfully:', data);
      }
      
      return { error };
    } catch (error) {
      console.error('[AuthContext] OAuth exception:', error);
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthContext] Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Create a higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WithAuth: React.FC<P> = (props) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };

  return WithAuth;
};