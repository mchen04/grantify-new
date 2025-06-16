"use client";

import React from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';

// Icon components
const AccessibilityIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ToolIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

export default function AccessibilityStatement() {
  const conformanceItems = [
    { status: 'compliant', item: 'Alternative text for all informative images' },
    { status: 'compliant', item: 'Keyboard navigation for all interactive elements' },
    { status: 'compliant', item: 'Sufficient color contrast (WCAG AA level)' },
    { status: 'compliant', item: 'Proper heading structure and landmarks' },
    { status: 'compliant', item: 'Form labels and error identification' },
    { status: 'compliant', item: 'Focus indicators visible on all elements' },
    { status: 'partial', item: 'Video captions (in progress for tutorial videos)' },
    { status: 'partial', item: 'Complex data visualizations (improving alternatives)' }
  ];

  const roadmapItems = [
    {
      quarter: 'Q1 2025',
      icon: <CheckCircleIcon />,
      status: 'completed',
      items: [
        'WCAG 2.1 AA compliance audit',
        'Screen reader compatibility testing',
        'Keyboard navigation implementation',
        'High contrast mode support'
      ]
    },
    {
      quarter: 'Q2 2025',
      icon: <ClockIcon />,
      status: 'in-progress',
      items: [
        'Video tutorial captions',
        'Enhanced data table accessibility',
        'Voice control integration',
        'Accessibility preference center'
      ]
    },
    {
      quarter: 'Q3 2025',
      icon: <TargetIcon />,
      status: 'planned',
      items: [
        'WCAG 2.2 compliance',
        'Cognitive accessibility improvements',
        'Alternative format exports',
        'Accessibility API for third-party tools'
      ]
    }
  ];

  return (
    <Layout fullWidth>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-blue-50">
        <div className="container mx-auto px-4 pt-2 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
              <AccessibilityIcon />
            </div>
            <Badge variant="primary" className="mb-4">Accessibility</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Accessibility Statement
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Our commitment to making grant funding accessible to everyone, including people with disabilities.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Commitment Statement */}
            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-gray-700 leading-relaxed">
                Grantify.ai is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards to guarantee we provide equal access to all users, in compliance with the Americans with Disabilities Act (ADA) and California's Unruh Civil Rights Act.
              </p>
              <div className="bg-blue-50 rounded-lg p-6 mt-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">🏛️ Legal Compliance</h3>
                <p className="text-blue-700">
                  This accessibility statement demonstrates our commitment to compliance with federal ADA requirements and California's Unruh Civil Rights Act, which prohibits discrimination against people with disabilities in places of public accommodation, including digital spaces.
                </p>
              </div>
            </div>

            {/* Standards */}
            <div className="bg-primary-50 rounded-2xl p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Conformance Standards</h2>
              <p className="text-gray-700 mb-6">
                We aim to conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 level AA</strong>. 
                These guidelines help make web content more accessible to people with disabilities and more user-friendly for everyone.
              </p>
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
                <ul className="space-y-3">
                  {conformanceItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className={`mt-1 ${
                        item.status === 'compliant' ? 'text-success-600' : 'text-warning-600'
                      }`}>
                        {item.status === 'compliant' ? '✓' : '◐'}
                      </span>
                      <span className="text-gray-700">{item.item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical Information */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-primary-600">
                    <ToolIcon />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Technologies</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• HTML5 with semantic markup</li>
                  <li>• ARIA labels and landmarks</li>
                  <li>• CSS with responsive design</li>
                  <li>• JavaScript with progressive enhancement</li>
                  <li>• React with accessibility best practices</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-primary-600">
                    <CheckCircleIcon />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Testing Methods</h3>
                </div>
                <ul className="space-y-2 text-gray-700">
                  <li>• Automated testing with axe DevTools</li>
                  <li>• Manual keyboard navigation testing</li>
                  <li>• Screen reader testing (NVDA, JAWS, VoiceOver)</li>
                  <li>• Color contrast analysis</li>
                  <li>• User testing with people with disabilities</li>
                </ul>
              </div>
            </div>

            {/* Roadmap */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Accessibility Roadmap</h2>
              <div className="space-y-6">
                {roadmapItems.map((period, index) => (
                  <div key={index} className={`border-2 rounded-xl p-6 ${
                    period.status === 'completed' ? 'border-success-200 bg-success-50' :
                    period.status === 'in-progress' ? 'border-primary-200 bg-primary-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">{period.quarter}</h3>
                      <div className={`${
                        period.status === 'completed' ? 'text-success-600' :
                        period.status === 'in-progress' ? 'text-primary-600' :
                        'text-gray-600'
                      }`}>
                        {period.icon}
                      </div>
                    </div>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {period.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-gray-100 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Feedback & Support</h2>
              <p className="text-gray-700 mb-6 max-w-3xl mx-auto">
                We welcome your feedback on the accessibility of Grantify.ai. Please let us know if you encounter accessibility barriers or have suggestions for improvement.
              </p>
              <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="bg-white rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-1">Email</p>
                  <a href="mailto:accessibility@grantify.ai" className="text-primary-600 hover:text-primary-700">
                    accessibility@grantify.ai
                  </a>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-1">Response Time</p>
                  <p className="text-gray-600">Within 2 business days</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-1">Legal Compliance</p>
                  <p className="text-gray-600">ADA & Unruh Act</p>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="mt-8 text-center text-gray-500">
              <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}