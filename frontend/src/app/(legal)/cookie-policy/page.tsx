"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';
import { cookieManager } from '@/utils/cookieManager';

// Icon components
const CookieIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m6-6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function CookiePolicy() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showCookieManager, setShowCookieManager] = useState(false);

  const sections = [
    { id: 'overview', title: 'Cookie Overview', icon: <CookieIcon /> },
    { id: 'types', title: 'Types of Cookies', icon: <SettingsIcon /> },
    { id: 'management', title: 'Managing Cookies', icon: <SettingsIcon /> },
    { id: 'contact', title: 'Contact Us', icon: <ShieldIcon /> }
  ];

  // Scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout fullWidth>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="container mx-auto px-4 pt-2 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="gray" className="mb-4">Legal</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
            <p className="text-xl text-gray-600">Last updated: January 6, 2025</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1 mb-8 lg:mb-0">
              <nav className="sticky top-24 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Navigation</h3>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      const element = document.getElementById(section.id);
                      if (element) {
                        const offsetTop = element.offsetTop - 80;
                        window.scrollTo({
                          top: offsetTop,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-gray-400">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="prose prose-lg max-w-none">
                  {/* Cookie Overview */}
                  <section id="overview" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <CookieIcon />
                      What Are Cookies?
                    </h2>
                    <div className="space-y-4 text-gray-600">
                      <p>
                        Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how you use our service.
                      </p>
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="font-semibold text-gray-900 mb-2">California Cookie Law Compliance</h3>
                        <p className="text-blue-700">
                          Under California law, we must inform you about cookies and obtain your consent for non-essential cookies. You have the right to accept or reject cookies.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Types of Cookies */}
                  <section id="types" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <SettingsIcon />
                      Types of Cookies We Use
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          Essential Cookies (Always Active)
                        </h3>
                        <p className="text-gray-700 mb-3">Required for basic website functionality:</p>
                        <ul className="space-y-1 text-gray-600 text-sm">
                          <li>• Authentication and security cookies</li>
                          <li>• Session management cookies</li>
                          <li>• Load balancing cookies</li>
                          <li>• Cookie consent preferences</li>
                        </ul>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-gray-600">×</span>
                          Analytics Cookies (Not Used)
                        </h3>
                        <p className="text-gray-600 mb-3">We do not currently use analytics cookies:</p>
                        <ul className="space-y-1 text-gray-500 text-sm">
                          <li>• No Google Analytics implementation</li>
                          <li>• No detailed page view tracking</li>
                          <li>• No user behavior analysis cookies</li>
                          <li>• No third-party analytics services</li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Status:</strong> Not implemented - we keep tracking minimal
                        </p>
                      </div>

                      <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-yellow-600">$</span>
                          Advertising Cookies (Optional)
                        </h3>
                        <p className="text-gray-700 mb-3">Enable relevant ads to support our free service:</p>
                        <ul className="space-y-1 text-gray-600 text-sm">
                          <li>• Google AdSense cookies</li>
                          <li>• Ad performance tracking</li>
                          <li>• Personalized advertising preferences</li>
                          <li>• Frequency capping</li>
                        </ul>
                        <p className="text-sm text-yellow-700 mt-2">
                          <strong>Purpose:</strong> Display relevant ads and support free access to Grantify.ai
                        </p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-purple-600">⚙</span>
                          Preference Cookies (Optional)
                        </h3>
                        <p className="text-gray-700 mb-3">Remember your settings and preferences:</p>
                        <ul className="space-y-1 text-gray-600 text-sm">
                          <li>• User interface preferences</li>
                          <li>• Filter settings</li>
                          <li>• Search preferences</li>
                          <li>• Accessibility settings</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Managing Cookies */}
                  <section id="management" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <SettingsIcon />
                      Managing Your Cookie Preferences
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Cookie Consent Management</h3>
                        <p className="text-gray-700 mb-4">
                          You can manage your cookie preferences through our cookie consent banner or by updating your browser settings.
                        </p>
                        <button 
                          onClick={() => setShowCookieManager(true)}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Update Cookie Preferences
                        </button>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Browser Settings</h3>
                        <p className="text-gray-700 mb-3">You can also control cookies through your browser:</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Chrome</h4>
                            <p className="text-sm text-gray-600">Settings → Privacy and Security → Cookies and other site data</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Firefox</h4>
                            <p className="text-sm text-gray-600">Settings → Privacy & Security → Cookies and Site Data</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Safari</h4>
                            <p className="text-sm text-gray-600">Preferences → Privacy → Manage Website Data</p>
                          </div>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Edge</h4>
                            <p className="text-sm text-gray-600">Settings → Cookies and site permissions → Cookies and site data</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Third-Party Opt-Outs</h3>
                        <p className="text-gray-700 mb-3">You can opt out of third-party advertising cookies:</p>
                        <ul className="space-y-2 text-gray-700">
                          <li>• <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary-600 hover:text-primary-700 underline">Google Analytics Opt-out</a></li>
                          <li>• <a href="https://www.google.com/settings/ads" className="text-primary-600 hover:text-primary-700 underline">Google Ad Settings</a></li>
                          <li>• <a href="http://optout.aboutads.info/" className="text-primary-600 hover:text-primary-700 underline">Digital Advertising Alliance Opt-out</a></li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ShieldIcon />
                      Questions About Cookies?
                    </h2>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                      <p className="text-gray-600 mb-4">
                        If you have any questions about our use of cookies, please contact us:
                      </p>
                      <div className="space-y-2">
                        <p className="text-gray-700">
                          <strong>Email:</strong> privacy@grantify.ai
                        </p>
                        <p className="text-gray-700">
                          <strong>Subject Line:</strong> Cookie Policy Inquiry
                        </p>
                        <p className="text-gray-700">
                          <strong>Response Time:</strong> Within 2 business days
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Cookie Manager Modal */}
      {showCookieManager && <CookieManager onClose={() => setShowCookieManager(false)} />}
    </Layout>
  );
}

// Cookie Manager Modal Component
const CookieManager = ({ onClose }: { onClose: () => void }) => {
  const [preferences, setPreferences] = useState(cookieManager.getPreferences());

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'essential') return; // Can't toggle essential cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const savePreferences = () => {
    cookieManager.updatePreferences(preferences);
    onClose();
  };

  const resetToDefaults = () => {
    cookieManager.resetPreferences();
    setPreferences(cookieManager.getPreferences());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Cookie Preferences</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2">Current Settings</h3>
            <p className="text-sm text-gray-600">
              Last updated: {cookieManager.hasConsent() ? 
                new Date(localStorage.getItem('grantify_cookie_consent_date') || '').toLocaleDateString() : 
                'Never'
              }
            </p>
          </div>

          {/* Cookie Categories */}
          <div className="space-y-4 mb-6">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">Essential Cookies</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Always Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Required for authentication, security, session management, and cookie consent preferences.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Authentication and security cookies</li>
                  <li>• Session management cookies</li>
                  <li>• Load balancing cookies</li>
                  <li>• Cookie consent preferences</li>
                </ul>
              </div>
              <input 
                type="checkbox" 
                checked={true} 
                disabled 
                className="mt-1 rounded border-gray-300 text-green-600 cursor-not-allowed"
              />
            </div>

            {/* Advertising Cookies */}
            <div className="flex items-start justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">Advertising Cookies</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Google AdSense cookies for relevant ads and frequency capping. Supports our free service.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Google AdSense cookies</li>
                  <li>• Ad performance tracking</li>
                  <li>• Personalized advertising preferences</li>
                  <li>• Frequency capping</li>
                </ul>
              </div>
              <input 
                type="checkbox" 
                checked={preferences.advertising}
                onChange={() => togglePreference('advertising')}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>

            {/* Preference Cookies */}
            <div className="flex items-start justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">Preference Cookies</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Remember your UI settings, filter preferences, search preferences, and accessibility settings.
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• User interface preferences</li>
                  <li>• Filter settings</li>
                  <li>• Search preferences</li>
                  <li>• Accessibility settings</li>
                </ul>
              </div>
              <input 
                type="checkbox" 
                checked={preferences.preferences}
                onChange={() => togglePreference('preferences')}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </div>

            {/* Analytics Cookies - Disabled */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">Analytics Cookies</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    Not Used
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  We don't currently use analytics cookies to keep tracking minimal per our privacy policy.
                </p>
              </div>
              <input 
                type="checkbox" 
                checked={false}
                disabled
                className="mt-1 rounded border-gray-300 cursor-not-allowed opacity-50"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={savePreferences}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Save Preferences
            </button>
            <button
              onClick={resetToDefaults}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};