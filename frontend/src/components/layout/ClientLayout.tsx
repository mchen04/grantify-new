"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { InteractionProvider } from "@/contexts/InteractionContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Temporarily unregister service worker for debugging
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister().then(success => {
            if (success) {
              
            }
          });
        });
      });
      
      // Also clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
            
          });
        });
      }
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InteractionProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </InteractionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}