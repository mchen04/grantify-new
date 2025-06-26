"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { cookieManager, CookiePreferences } from '@/utils/cookieManager';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(cookieManager.getPreferences());

  useEffect(() => {
    // Check if user has already made a choice
    if (!cookieManager.hasConsent()) {
      setIsVisible(true);
    } else {
      setPreferences(cookieManager.getPreferences());
    }
  }, []);

  const acceptAll = () => {
    cookieManager.acceptAll();
    setIsVisible(false);
  };

  const acceptEssentialOnly = () => {
    cookieManager.acceptEssentialOnly();
    setIsVisible(false);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'essential') return; // Can't toggle essential cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveCustomPreferences = () => {
    cookieManager.updatePreferences(preferences);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                We Use Cookies
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  California Law Compliant
                </span>
              </h3>
              <p className="text-gray-600 text-sm">
                We use cookies to provide you with a better experience. You have the right to accept or reject cookies. 
                <a href="/cookie-policy" className="text-primary-600 hover:text-primary-700 underline ml-1">
                  Learn more about our cookie policy
                </a>
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 ml-4">
              <Button
                onClick={acceptAll}
                variant="primary"
                size="sm"
                className="whitespace-nowrap"
              >
                Accept All
              </Button>
              <Button
                onClick={acceptEssentialOnly}
                variant="secondary"
                size="sm"
                className="whitespace-nowrap"
              >
                Essential Only
              </Button>
            </div>
          </div>

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 self-start"
          >
            <span>{showDetails ? 'Hide' : 'Customize'} cookie preferences</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Detailed Preferences */}
          {showDetails && (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              {/* Essential Cookies */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Essential Cookies</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Always Active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Required for authentication, security, session management, and cookie consent preferences
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={true} 
                  disabled 
                  className="rounded border-gray-300 text-green-600 cursor-not-allowed"
                />
              </div>

              {/* Advertising Cookies */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Advertising Cookies</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Google AdSense cookies for relevant ads and frequency capping. Supports our free service.
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.advertising}
                  onChange={() => togglePreference('advertising')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>

              {/* Preference Cookies */}
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Preference Cookies</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Optional
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Remember your UI settings, filter preferences, search preferences, and accessibility settings
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.preferences}
                  onChange={() => togglePreference('preferences')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>

              {/* Analytics Cookies - Disabled per policy */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">Analytics Cookies</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Not Used
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    We don't currently use analytics cookies to keep tracking minimal per our privacy policy
                  </p>
                </div>
                <input 
                  type="checkbox" 
                  checked={false}
                  disabled
                  className="rounded border-gray-300 cursor-not-allowed opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={saveCustomPreferences}
                  variant="primary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Save My Preferences
                </Button>
                <Button
                  onClick={acceptAll}
                  variant="secondary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Accept All
                </Button>
                <Button
                  onClick={acceptEssentialOnly}
                  variant="secondary"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Essential Only
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;