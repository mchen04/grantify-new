"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';

// Icon components
const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ScaleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const UserCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function TermsOfService() {
  const [activeSection, setActiveSection] = useState('agreement');

  const sections = [
    { id: 'agreement', title: 'Agreement to Terms', icon: <DocumentIcon /> },
    { id: 'eligibility', title: 'Eligibility', icon: <UserCheckIcon /> },
    { id: 'service', title: 'Service Description', icon: <ShieldIcon /> },
    { id: 'conduct', title: 'User Conduct', icon: <ScaleIcon /> },
    { id: 'liability', title: 'Limitation of Liability', icon: <ShieldIcon /> },
    { id: 'contact', title: 'Contact Us', icon: <DocumentIcon /> }
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
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
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
                        <strong>Legal Disclaimer:</strong> These Terms are for informational purposes only. Consult legal professionals for specific requirements.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="prose prose-lg max-w-none">
                  {/* Agreement to Terms */}
                  <section id="agreement" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <DocumentIcon />
                      Agreement to Terms
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <p className="text-gray-700">
                        By accessing or using Grantify.ai, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you do not have permission to access the Service.
                      </p>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                        <ShieldIcon />
                        <p className="text-gray-600">
                          I reserve the right to update these terms at any time. Continued use constitutes acceptance of new terms.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Eligibility */}
                  <section id="eligibility" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <UserCheckIcon />
                      Eligibility Requirements
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Age Requirement</h3>
                        <p className="text-gray-600">You must be at least 18 years old to use our Service</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Legal Capacity</h3>
                        <p className="text-gray-600">You must have the legal capacity to enter binding agreements</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Compliance</h3>
                        <p className="text-gray-600">Your use must comply with all applicable laws</p>
                      </div>
                      <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Authority</h3>
                        <p className="text-gray-600">If using for an organization, you must have authority to bind them</p>
                      </div>
                    </div>
                  </section>

                  {/* Service Description */}
                  <section id="service" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ShieldIcon />
                      Service Description
                    </h2>
                    <div className="space-y-4">
                      <p className="text-gray-700">
                        Grantify.ai is an AI-powered grant discovery platform that helps users:
                      </p>
                      <div className="grid gap-3">
                        {[
                          'Discover relevant grant opportunities using AI matching',
                          'Search and filter grants by various criteria',
                          'Save grants for future reference',
                          'Track grant application status (applied/ignored)'
                        ].map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <UserCheckIcon />
                            <span className="text-gray-700">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-gray-700">
                            <strong>Service Features:</strong> Currently free with ad support, OAuth authentication for security, and AI-powered grant matching based on your preferences.
                          </p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-gray-700">
                            <strong>Important Disclaimer:</strong> I strive for accuracy but do not guarantee the completeness, reliability, or current status of grant information. Always verify details directly with the funding agency before applying.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* User Conduct */}
                  <section id="conduct" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ScaleIcon />
                      User Conduct
                    </h2>
                    <div className="bg-error-50 rounded-lg p-6 border border-error-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Prohibited Activities</h3>
                      <p className="text-gray-700 mb-3">You agree NOT to:</p>
                      <ul className="space-y-2">
                        {[
                          'Violate any federal, state, or local laws or regulations',
                          'Infringe on intellectual property rights',
                          'Submit false or misleading information',
                          'Impersonate others or misrepresent affiliations',
                          'Interfere with or disrupt the Service',
                          'Attempt unauthorized access or hacking',
                          'Use automated systems to scrape or abuse the service',
                          'Abuse the ad-supported model or attempt to circumvent ads',
                          'Violate California consumer privacy rights or data protection laws',
                          'Use the service for unlawful discrimination based on protected characteristics'
                        ].map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-error-500 mt-1">✕</span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-3">California-Specific Provisions</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• <strong>Unruh Civil Rights Act:</strong> We provide equal access regardless of disability status</li>
                        <li>• <strong>CCPA Compliance:</strong> California residents have enhanced privacy rights</li>
                        <li>• <strong>ADA Compliance:</strong> Our website meets accessibility standards</li>
                        <li>• <strong>Governing Law:</strong> These terms are governed by California state law</li>
                      </ul>
                    </div>
                  </section>

                  {/* Limitation of Liability */}
                  <section id="liability" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <ShieldIcon />
                      Limitation of Liability
                    </h2>
                    <div className="bg-gray-900 text-white rounded-lg p-6">
                      <p className="font-bold mb-4 text-lg">IMPORTANT LEGAL NOTICE</p>
                      <p className="mb-4">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRANTIFY.AI SHALL NOT BE LIABLE FOR:
                      </p>
                      <ul className="space-y-2 mb-4">
                        <li>• Any indirect, incidental, or consequential damages</li>
                        <li>• Loss of profits, data, or goodwill</li>
                        <li>• Errors or inaccuracies in grant information from external sources</li>
                        <li>• Missed grant opportunities or application deadlines</li>
                        <li>• Decisions made based on information from our Service</li>
                        <li>• Service interruptions, downtime, or technical issues</li>
                        <li>• Issues with third-party OAuth providers (Google, GitHub)</li>
                      </ul>
                      <p className="text-sm text-gray-300">
                        Some jurisdictions do not allow these limitations, so they may not apply to you.
                      </p>
                    </div>
                  </section>

                  {/* Contact */}
                  <section id="contact" className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <DocumentIcon />
                      Contact Us
                    </h2>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <p className="text-gray-600 mb-4">
                        If you have any questions about these Terms of Service, please contact me:
                      </p>
                      <div className="space-y-2">
                        <p className="text-gray-700">
                          <strong>Email:</strong> legal@grantify.ai
                        </p>
                        <p className="text-gray-700">
                          <strong>Business Address:</strong> 123 Business Center Dr, Suite 100, Riverside, CA 92507
                        </p>
                        <p className="text-gray-700">
                          <strong>Registered Agent:</strong> Available upon request
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