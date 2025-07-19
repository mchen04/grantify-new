"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
// Removed InteractionProvider - now using TanStack Query for interactions
import { SearchProvider } from "@/contexts/SearchContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { QueryProvider } from "@/providers/QueryProvider";

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
      <QueryProvider>
        <AuthProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}