"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';

// Icon components
const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', title: 'Introduction', icon: <ShieldIcon /> },
    { id: 'information-collected', title: 'Information We Collect', icon: <DatabaseIcon /> },
    { id: 'how-we-use', title: 'How We Use Your Information', icon: <UserIcon /> },
    { id: 'data-security', title: 'Data Security', icon: <LockIcon /> },
    { id: 'your-rights', title: 'Your Rights', icon: <UserIcon /> },
    { id: 'contact', title: 'Contact Us', icon: <ShieldIcon /> }
  ];

  // Scroll spy effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for navbar
      
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
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout fullWidth>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <div className="container mx-auto px-4 pt-2 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="gray" className="mb-4">Legal</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
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
                        const offsetTop = element.offsetTop - 80; // Offset for navbar
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
                {/* Legal Disclaimer */}
                <div className="bg-warning-50 border-l-4 border-warning-400 p-4 mb-8">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-warning-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-warning-700">
                        <strong>Legal Disclaimer:</strong> This Privacy Policy is for informational purposes only. Consult legal professionals for specific compliance requirements.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="prose prose-lg max-w-none">
                  {/* Introduction */}
                  <section id="introduction" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ShieldIcon />
                      Introduction
                    </h2>
                    <div className="space-y-4 text-gray-600">
                      <p>
                        Welcome to Grantify.ai. I am committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how I collect, use, and safeguard your data.
                      </p>
                      <p>
                        By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with these policies, please do not use the Service.
                      </p>
                    </div>
                  </section>

                  {/* Information We Collect */}
                  <section id="information-collected" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <DatabaseIcon />
                      Information We Collect
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          We Do NOT Sell Your Personal Information
                        </h3>
                        <p className="text-green-800 font-medium mb-2">Your Data is Not For Sale</p>
                        <p className="text-green-700">
                          Grantify.ai does NOT sell, trade, or rent your personal information to third parties. We never have and never will. Your data is used solely to provide our grant matching service.
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Information from Social Sign-In</h3>
                        <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium mb-2">We use OAuth with Google - no passwords stored</p>
                          <p className="text-sm text-blue-700">When you sign in with Google, we receive only basic information they provide.</p>
                        </div>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Basic Profile:</strong> Email address and name from your OAuth provider</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Unique Identifier:</strong> OAuth provider's user ID for account linking</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Information You Provide</h3>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Search Preferences:</strong> Project description for AI matching</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Filter Settings:</strong> Funding ranges, deadline preferences, preferred agencies</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Grant Interactions:</strong> Grants you save, mark as applied, or ignore</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Optional Details:</strong> Project duration preferences, eligibility requirements</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Automatically Collected Information</h3>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Usage Data:</strong> Basic page views and feature usage for service improvement</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Technical Data:</strong> Browser type, device type, IP address (for security and performance)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span><strong>Ad Performance:</strong> Anonymous advertising metrics (via Google AdSense only)</span>
                          </li>
                        </ul>
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800">✓ We don't collect sensitive personal data, financial information, or detailed location data</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* How We Use Your Information */}
                  <section id="how-we-use" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <UserIcon />
                      How We Use Your Information
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        'Provide and maintain the Service',
                        'Match you with relevant grants',
                        'Improve user experience',
                        'Detect and prevent fraud',
                        'Comply with legal obligations',
                        'Display relevant advertisements to support currently free access'
                      ].map((use, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
                          <ShieldIcon />
                          <span className="text-gray-700">{use}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Recommendations</h3>
                      <p className="text-gray-600">
                        I use artificial intelligence to analyze your project description and preferences to provide personalized grant recommendations. This includes creating AI embeddings (mathematical representations) of your project description to match similar grants. You can update or delete your preferences anytime in your account settings.
                      </p>
                    </div>

                    <div className="mt-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-gray-900 mb-2">What We Don't Collect</h3>
                      <p className="text-gray-600 mb-3">To protect your privacy, we don't collect:</p>
                      <ul className="space-y-1 text-gray-600 text-sm">
                        <li>• Passwords (OAuth handles authentication securely)</li>
                        <li>• Financial or banking information</li>
                        <li>• Social security numbers or government IDs</li>
                        <li>• Detailed personal demographics</li>
                        <li>• Private documents or attachments</li>
                        <li>• Real-time location tracking</li>
                      </ul>
                    </div>
                  </section>

                  {/* Data Security */}
                  <section id="data-security" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <LockIcon />
                      Data Security
                    </h2>
                    
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-6 border border-primary-200">
                      <p className="text-gray-700 mb-4">
                        I implement industry-standard security measures to protect your information:
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Badge variant="primary" className="justify-center py-2">OAuth Security (Google/GitHub)</Badge>
                        <Badge variant="primary" className="justify-center py-2">Supabase Secure Database</Badge>
                        <Badge variant="primary" className="justify-center py-2">HTTPS Encryption</Badge>
                        <Badge variant="primary" className="justify-center py-2">Minimal Data Collection</Badge>
                      </div>
                      <div className="mt-4 p-4 bg-white rounded-lg border border-primary-300">
                        <p className="text-sm text-gray-700">
                          <strong>Note:</strong> By using OAuth (Google/GitHub login), your password is managed by these trusted providers, not stored on our servers. This significantly reduces security risk.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* California Consumer Privacy Rights */}
                  <section id="california-rights" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <UserIcon />
                      California Consumer Privacy Rights (CCPA/CPRA)
                    </h2>
                    
                    <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
                      <p className="text-blue-800 font-medium mb-2">🏛️ California Residents Have Enhanced Rights</p>
                      <p className="text-blue-700">Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), California residents have specific rights regarding their personal information.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { right: 'Right to Know', desc: 'What personal information we collect, use, disclose, and sell about you' },
                        { right: 'Right to Delete', desc: 'Request deletion of your personal information (subject to certain exceptions)' },
                        { right: 'Right to Opt-Out', desc: 'Opt-out of the sale or sharing of your personal information' },
                        { right: 'Right to Correct', desc: 'Request correction of inaccurate personal information' },
                        { right: 'Right to Non-Discrimination', desc: 'Not be discriminated against for exercising your privacy rights' },
                        { right: 'Right to Limit Use', desc: 'Limit the use and disclosure of sensitive personal information' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                          <div className="text-primary-600 mt-1">
                            <ShieldIcon />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.right}</h4>
                            <p className="text-gray-600 text-sm">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Data Categories We Collect</h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• <strong>Identifiers:</strong> Email addresses, OAuth provider IDs</li>
                        <li>• <strong>Internet Activity:</strong> Search queries, page views, feature usage</li>
                        <li>• <strong>Preferences:</strong> Project descriptions, filter settings, grant interactions</li>
                        <li>• <strong>Usage Data:</strong> Basic usage patterns and device information</li>
                      </ul>
                    </div>

                    <div className="mt-6 p-6 bg-green-50 rounded-lg border border-green-200">
                      <h3 className="font-semibold text-gray-900 mb-3">How to Exercise Your Rights</h3>
                      <p className="text-gray-700 mb-3">To exercise any of these rights, contact us at:</p>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li>• <strong>Email:</strong> privacy@grantify.ai</li>
                        <li>• <strong>Response Time:</strong> We will respond within 45 days</li>
                        <li>• <strong>Verification:</strong> We may request additional information to verify your identity</li>
                      </ul>
                    </div>
                  </section>

                  {/* General Data Protection Rights */}
                  <section id="your-rights" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <UserIcon />
                      General Data Protection Rights
                    </h2>
                    
                    <div className="space-y-4">
                      {[
                        { right: 'Right to Access', desc: 'Request copies of your personal information' },
                        { right: 'Right to Rectification', desc: 'Correct any inaccurate information' },
                        { right: 'Right to Erasure', desc: 'Request deletion of your personal data' },
                        { right: 'Right to Restrict', desc: 'Limit how we process your information' },
                        { right: 'Right to Portability', desc: 'Transfer your data to another service' },
                        { right: 'Right to Object', desc: 'Object to certain processing activities' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                          <div className="text-primary-600 mt-1">
                            <ShieldIcon />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{item.right}</h4>
                            <p className="text-gray-600 text-sm">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ShieldIcon />
                      Contact Us
                    </h2>
                    
                    <div className="bg-gray-50 rounded-lg p-6">
                      <p className="text-gray-600 mb-4">
                        If you have any questions about this Privacy Policy, please contact us:
                      </p>
                      <div className="space-y-2">
                        <p className="text-gray-700">
                          <strong>Email:</strong> privacy@grantify.ai
                        </p>
                        <p className="text-gray-700">
                          <strong>Business Email:</strong> legal@grantify.ai
                        </p>
                        <p className="text-gray-700">
                          <strong>Address:</strong> 123 Business Center Dr, Suite 100, Riverside, CA 92507
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
    </Layout>
  );
}