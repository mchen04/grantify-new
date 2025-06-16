"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabaseClient';
import { csrfUtils } from '@/lib/apiClient';

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

  useEffect(() => {
    // Get the current session and user
    const getInitialSession = async () => {
      try {
        console.log('[AuthContext] Getting initial session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Initial session fetched:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
        setSession(session);
        setUser(session?.user ?? null);
        userRef.current = session?.user ?? null;
        
        // Initialize CSRF token if user is logged in
        if (session?.access_token) {
          await csrfUtils.initialize(session.access_token);
        }
        
        // Only set loading to false after everything is properly initialized
        setIsLoading(false);
      } catch (error) {
        console.error('[AuthContext] Error getting initial session:', error);
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[AuthContext] Auth state changed:', {
          event,
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        });
        setSession(session);
        setUser(session?.user ?? null);
        userRef.current = session?.user ?? null;
        setIsLoading(false);
        
        // Initialize CSRF token when user logs in
        if (session?.access_token) {
          await csrfUtils.initialize(session.access_token);
        } else {
          // Clear CSRF token on logout
          csrfUtils.clear();
        }
      }
    );

    // Clean up the subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Global preferences update listener - persistent across navigation
  useEffect(() => {
    const handlePreferencesUpdate = async (event: CustomEvent) => {
      try {
        // Global preferences update event received
        
        const currentUser = userRef.current;
        if (!currentUser) {
          // No user logged in, skipping global preferences refresh
          return;
        }
        
        // Clear caches to ensure fresh data
        // Clearing API caches
        const { cacheUtils } = await import('@/lib/apiClient');
        cacheUtils.clearCache();
        
        // Dispatch a custom event for any dashboard that might be listening
        // Broadcasting dashboard refresh event
        try {
          window.dispatchEvent(new CustomEvent('dashboardRefreshRequested', { 
            detail: { 
              timestamp: Date.now(),
              reason: 'preferences_updated',
              userId: currentUser.id
            } 
          }));
        } catch (eventError) {
          
        }
      } catch (error) {
        
      }
    };

    // Setting up global preferences update listener
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate as unknown as EventListener);
    
    return () => {
      // Cleaning up global preferences update listener
      window.removeEventListener('preferencesUpdated', handlePreferencesUpdate as unknown as EventListener);
    };
  }, []); // Empty dependency array - listener is created once and never recreated


  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      // Clear CSRF token before signing out
      csrfUtils.clear();
      await supabase.auth.signOut();
    } catch (error) {
      // Error signing out
    }
  };


  // Create the value object
  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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