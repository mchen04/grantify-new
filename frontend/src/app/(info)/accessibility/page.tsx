"use client";

import React from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// Icon components
const AccessibilityIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

export default function Accessibility() {
  return (
    <Layout fullWidth>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-blue-50 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-20 animate-pulse-slow" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse-slow" />
        </div>
        
        <div className="container mx-auto px-4 pt-2 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6">
              <AccessibilityIcon />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Accessibility at
              <span className="text-primary-600"> Grantify.ai</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              I'm committed to making grant discovery accessible to everyone, regardless of ability. The platform is designed with inclusivity at its core.
            </p>
          </div>
        </div>
      </section>

      {/* Commitment Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="primary" className="mb-4">Our Commitment</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Building an Inclusive Platform
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                I believe everyone should have equal access to grant opportunities. That's why I continuously work to improve the platform's accessibility.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-8 border border-primary-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">WCAG 2.1 Compliance</h3>
                <p className="text-gray-600 mb-4">
                  I strive to meet Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards, ensuring the platform is perceivable, operable, understandable, and robust.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Level AA Target</Badge>
                  <Badge variant="primary">Regular Audits</Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-success-50 to-white rounded-xl p-8 border border-success-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Continuous Improvement</h3>
                <p className="text-gray-600 mb-4">
                  Accessibility isn't a destination—it's an ongoing journey. I regularly test and update the platform based on user feedback and evolving standards.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">User Testing</Badge>
                  <Badge variant="primary">Regular Updates</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
              Accessibility Features
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <KeyboardIcon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Keyboard Navigation</h3>
                <p className="text-gray-600 mb-3">
                  Navigate the entire platform using only your keyboard. All interactive elements are accessible via Tab key.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Tab navigation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Skip links
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Focus indicators
                  </li>
                </ul>
              </div>

              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <EyeIcon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Accessibility</h3>
                <p className="text-gray-600 mb-3">
                  Designed with visual clarity in mind, supporting various visual needs and preferences.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Scalable fonts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Clear visual hierarchy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Sufficient color contrast
                  </li>
                </ul>
              </div>

              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <VolumeIcon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Screen Reader Support</h3>
                <p className="text-gray-600 mb-3">
                  Full compatibility with popular screen readers for users with visual impairments.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> ARIA labels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Semantic HTML
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Live region announcements
                  </li>
                </ul>
              </div>

              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear Structure</h3>
                <p className="text-gray-600 mb-3">
                  Logical page structure and consistent navigation throughout the platform.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Heading hierarchy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Consistent layout
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Breadcrumbs
                  </li>
                </ul>
              </div>

              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Flexible Timing</h3>
                <p className="text-gray-600 mb-3">
                  No time limits on form completion or content interaction.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> No timeouts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Save progress
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Pause animations
                  </li>
                </ul>
              </div>

              <div className="card p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Accessible Forms</h3>
                <p className="text-gray-600 mb-3">
                  Forms designed with clear labels, helpful error messages, and logical flow.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Clear labels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Error guidance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon /> Field descriptions
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testing & Feedback Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
              Help Us Improve
            </h2>
            
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Report Accessibility Issues</h3>
              <p className="text-gray-600 mb-6">
                Found a barrier? I want to know about it. Your feedback helps me make Grantify.ai better for everyone.
              </p>
              <Button href="mailto:michaelluochen1@gmail.com" size="lg">
                Report Accessibility Issues
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-primary-50 rounded-xl p-6 border border-primary-200">
                <h3 className="font-semibold text-gray-900 mb-2">Regular Testing</h3>
                <p className="text-gray-600">
                  I conduct regular accessibility audits with automated tools and manual testing by users with disabilities.
                </p>
              </div>
              <div className="bg-success-50 rounded-xl p-6 border border-success-200">
                <h3 className="font-semibold text-gray-900 mb-2">User Feedback</h3>
                <p className="text-gray-600">
                  Your experiences and suggestions directly influence accessibility improvements and feature development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Accessibility Resources
            </h2>
            
            <div className="space-y-4">
              <a href="/keyboard-shortcuts" className="block bg-white rounded-lg p-6 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Keyboard Shortcuts Guide</h3>
                    <p className="text-gray-600">Learn all the keyboard shortcuts available on the platform</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
              
              <a href="/screen-reader-guide" className="block bg-white rounded-lg p-6 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Screen Reader Guide</h3>
                    <p className="text-gray-600">Tips for using Grantify.ai with popular screen readers</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
              
              <a href="/accessibility-statement" className="block bg-white rounded-lg p-6 hover:shadow-md transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Accessibility Statement</h3>
                    <p className="text-gray-600">Full accessibility conformance report and roadmap</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}