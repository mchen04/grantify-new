"use client";

import React from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';

// Icon components
const SpeakerIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export default function ScreenReaderGuide() {
  const screenReaders = [
    {
      name: "NVDA (Windows)",
      version: "2024.1+",
      shortcuts: [
        { keys: "NVDA + Space", action: "Toggle browse/focus mode" },
        { keys: "H", action: "Navigate between headings" },
        { keys: "D", action: "Navigate between landmarks" },
        { keys: "K", action: "Navigate between links" },
        { keys: "Tab", action: "Navigate interactive elements" }
      ],
      tips: [
        "Enable automatic focus mode for better form interaction",
        "Use NVDA + F7 to see a list of all elements on the page",
        "Press NVDA + Ctrl + F to find text on the page"
      ]
    },
    {
      name: "JAWS (Windows)",
      version: "2024+",
      shortcuts: [
        { keys: "Insert + Z", action: "Toggle virtual cursor" },
        { keys: "H", action: "Navigate between headings" },
        { keys: "R", action: "Navigate between regions" },
        { keys: "Tab", action: "Navigate form controls" },
        { keys: "Insert + F7", action: "Show links list" }
      ],
      tips: [
        "Use Quick Keys (H, B, F) for faster navigation",
        "Press Insert + F1 for context-sensitive help",
        "Enable Smart Navigation for complex forms"
      ]
    },
    {
      name: "VoiceOver (macOS)",
      version: "macOS 12+",
      shortcuts: [
        { keys: "VO + A", action: "Read from current position" },
        { keys: "VO + ←/→", action: "Navigate elements" },
        { keys: "VO + U", action: "Open rotor for navigation" },
        { keys: "Tab", action: "Navigate interactive elements" },
        { keys: "VO + Space", action: "Activate buttons/links" }
      ],
      tips: [
        "Use the Web Rotor (VO + U) for quick navigation",
        "Enable mouse tracking for exploring layouts",
        "Customize verbosity in VoiceOver Utility"
      ]
    }
  ];

  const bestPractices = [
    {
      title: "Navigation Tips",
      icon: <InfoIcon />,
      items: [
        "Use heading navigation (H key) to quickly scan page structure",
        "Landmarks help you jump between main sections",
        "Form labels are announced - listen for field descriptions",
        "Tables include row and column headers for context"
      ]
    },
    {
      title: "Grant Discovery",
      icon: <CheckIcon />,
      items: [
        "Each grant card is marked as an article for easy navigation",
        "Grant status (saved, dismissed) is announced",
        "Use list navigation to browse through grant results",
        "Filter changes are announced immediately"
      ]
    },
    {
      title: "Keyboard Navigation",
      icon: <KeyboardIcon />,
      items: [
        "All features are keyboard accessible",
        "Skip links help you bypass repetitive content",
        "Focus indicators show your current position",
        "Modal dialogs trap focus appropriately"
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
              <SpeakerIcon />
            </div>
            <Badge variant="primary" className="mb-4">Accessibility Guide</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Screen Reader Guide
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Learn how to use Grantify.ai effectively with popular screen readers. Our platform is designed with accessibility in mind.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Quick Start */}
            <div className="bg-success-50 border-l-4 border-success-500 p-6 rounded-r-lg mb-12">
              <h2 className="text-xl font-bold text-success-900 mb-2">Quick Start</h2>
              <p className="text-success-800">
                Grantify.ai is fully compatible with screen readers. We follow WCAG 2.1 AA standards and test regularly with NVDA, JAWS, and VoiceOver. Enable your screen reader and navigate normally - all features are accessible.
              </p>
            </div>

            {/* Screen Reader Specific Guides */}
            <div className="space-y-12 mb-16">
              {screenReaders.map((reader, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{reader.name}</h2>
                  <p className="text-gray-600 mb-6">Compatible with version {reader.version}</p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Commands</h3>
                      <div className="space-y-3">
                        {reader.shortcuts.map((shortcut, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2">
                            <kbd className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm">
                              {shortcut.keys}
                            </kbd>
                            <span className="text-gray-600 text-sm">{shortcut.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips for {reader.name}</h3>
                      <ul className="space-y-2">
                        {reader.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary-600 mt-1">•</span>
                            <span className="text-gray-600 text-sm">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Best Practices */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Best Practices for Grantify.ai</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {bestPractices.map((practice, index) => (
                  <div key={index} className="bg-primary-50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-primary-600">
                        {practice.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{practice.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {practice.items.map((item, idx) => (
                        <li key={idx} className="text-gray-700 text-sm">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Section */}
            <div className="mt-16 bg-gray-100 rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-gray-600 mb-6">
                If you encounter any accessibility issues or have suggestions for improvement, we want to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:accessibility@grantify.ai" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Email Accessibility Team
                </a>
                <a 
                  href="/accessibility" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary-600 font-medium rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors"
                >
                  View Accessibility Statement
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}