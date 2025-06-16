'use client';

import { useEffect, useState } from 'react';
import { cookieManager } from '@/utils/cookieManager';

interface GoogleAdSenseProps {
  /**
   * Your Google AdSense publisher ID (e.g., "ca-pub-1234567890123456")
   */
  publisherId: string;
  /**
   * The ad slot ID for this specific ad unit
   */
  adSlot: string;
  /**
   * Ad format (e.g., "auto", "rectangle", "vertical", "horizontal")
   */
  adFormat?: string;
  /**
   * Whether the ad should be responsive
   */
  responsive?: boolean;
  /**
   * Custom style for the ad container
   */
  style?: React.CSSProperties;
  /**
   * Custom CSS class for the ad container
   */
  className?: string;
  /**
   * Test mode for development
   */
  testMode?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdSense({
  publisherId,
  adSlot,
  adFormat = 'auto',
  responsive = true,
  style = {},
  className = '',
  testMode = false
}: GoogleAdSenseProps) {
  const [allowAdvertising, setAllowAdvertising] = useState(false);

  useEffect(() => {
    // Check if advertising cookies are allowed
    const isAllowed = cookieManager.isAllowed('advertising');
    setAllowAdvertising(isAllowed);

    // Listen for cookie preference changes
    const handlePreferenceChange = () => {
      setAllowAdvertising(cookieManager.isAllowed('advertising'));
    };

    window.addEventListener('cookiePreferencesChanged', handlePreferenceChange);
    
    return () => {
      window.removeEventListener('cookiePreferencesChanged', handlePreferenceChange);
    };
  }, []);

  useEffect(() => {
    // Only initialize ads if advertising cookies are allowed
    if (!allowAdvertising) return;

    try {
      // Initialize adsbygoogle array if it doesn't exist
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        
        // Push the ad configuration
        if (!testMode) {
          window.adsbygoogle.push({});
        }
      }
    } catch (error) {
      // Error initializing Google AdSense
    }
  }, [testMode, allowAdvertising]);

  // If advertising cookies are not allowed, show a privacy-friendly message
  if (!allowAdvertising && !testMode) {
    return (
      <div 
        className={`bg-blue-50 border border-blue-200 rounded flex items-center justify-center p-4 ${className}`}
        style={{
          minHeight: '200px',
          ...style
        }}
      >
        <div className="text-center text-blue-700">
          <div className="text-sm font-medium mb-2">Ads Help Keep Grantify Free</div>
          <div className="text-xs mb-3">
            You've chosen not to allow advertising cookies. 
            <br />
            Consider enabling them to support our free service.
          </div>
          <button
            onClick={() => {
              // Reset cookie preferences to show the consent dialog again
              cookieManager.resetPreferences();
              window.location.reload();
            }}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Update Cookie Preferences
          </button>
        </div>
      </div>
    );
  }

  // In test mode, show a placeholder
  if (testMode) {
    return (
      <div 
        className={`bg-gray-100 border border-gray-300 rounded flex items-center justify-center ${className}`}
        style={{
          minHeight: '250px',
          ...style
        }}
      >
        <div className="text-center text-gray-500">
          <div className="text-sm font-medium mb-1">Google AdSense</div>
          <div className="text-xs">Test Mode</div>
          <div className="text-xs opacity-75">Slot: {adSlot}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...style
        }}
        data-ad-client={publisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  );
}