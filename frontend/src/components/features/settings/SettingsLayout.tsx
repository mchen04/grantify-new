"use client";

import React, { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import GoogleAdSense from '@/components/ui/GoogleAdSense';
import { ADSENSE_CONFIG } from '@/lib/config';

// Component to handle date display without hydration mismatch
const DateDisplay: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <p className="text-sm text-gray-600">&nbsp;</p>;
  }
  
  return (
    <p className="text-sm text-gray-600">
      {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </p>
  );
};

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

// Calculate adaptive ad count based on specific settings pages
const calculateAdaptiveAdCount = (title: string, pathname: string): number => {
  // Profile page: no ads
  if (pathname === '/profile') {
    return 0;
  }
  
  // Preferences page: 2 ads for extensive content
  if (pathname === '/preferences') {
    return 2;
  }
  
  // Account Settings page: no ads
  if (pathname === '/settings') {
    return 0;
  }
  
  // Default: 1 ad for other settings pages
  return 1;
};

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ 
  children, 
  title,
  description 
}) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const adCount = calculateAdaptiveAdCount(title, pathname);
  
  const navItems = [
    { name: 'Profile', path: '/profile', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    )},
    { name: 'Preferences', path: '/preferences', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
      </svg>
    )},
    { name: 'Account Settings', path: '/settings', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    )}
  ];

  return (
    <Layout fullWidth>
      <div className="container mx-auto px-4 pt-4">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar - Matching dashboard width exactly */}
          <div className="md:w-80 md:pr-8 mb-6 md:mb-0">
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <div className="mb-6">
              <p className="text-lg text-gray-900">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
              </p>
              <DateDisplay />
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="space-y-1 p-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => window.location.href = item.path}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`mr-3 ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                        {item.icon}
                      </span>
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Adaptive Advertisements - Matching dashboard format exactly */}
            {(() => {
              const adSlots = ['2468013579', '2468013580', '2468013581', '2468013582'];
              
              if (adCount === 0) return null;
              
              return (
                <div className="space-y-8">
                  {Array.from({ length: adCount }, (_, index) => (
                    <div key={adSlots[index]} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <GoogleAdSense
                        publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                        adSlot={adSlots[index]}
                        adFormat="rectangle"
                        responsive={false}
                        style={{ width: '300px', height: '600px', margin: '0 auto' }}
                        className="block"
                        testMode={ADSENSE_CONFIG.TEST_MODE}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Main content area - Matching dashboard structure */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              {description && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800">{description}</p>
                </div>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsLayout;