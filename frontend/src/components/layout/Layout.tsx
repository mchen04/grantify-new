"use client";

import React, { ReactNode, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import KeyboardShortcutsModal from '@/components/features/auth/KeyboardShortcutsModal';
import SkipLink from '@/components/common/SkipLink';
import AriaLiveAnnouncer from '@/components/common/AriaLiveAnnouncer';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '', fullWidth = false }) => {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Handle page visibility changes to prevent issues during tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      try {
        if (document.visibilityState === 'hidden') {
          // Page is now hidden (tab switched away)
          // Cancel any pending operations that might cause errors
          window.dispatchEvent(new CustomEvent('pageHidden'));
        } else if (document.visibilityState === 'visible') {
          // Page is now visible (tab switched back)
          window.dispatchEvent(new CustomEvent('pageVisible'));
        }
      } catch (error) {
        
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <SkipLink />
      <Navbar />
      
      {/* Main content area */}
      <main id="main-content" className={`flex-grow w-full ${className}`}>
        {fullWidth ? (
          // Full-width content without padding constraints
          <>{children}</>
        ) : (
          // Standard content with padding and max-width
          <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4 sm:pb-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <KeyboardShortcutsModal />
      <AriaLiveAnnouncer />
    </div>
  );
};

export default Layout;