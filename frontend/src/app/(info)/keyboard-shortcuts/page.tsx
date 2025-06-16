"use client";

import React from 'react';
import Layout from '@/components/layout/Layout';
import { Badge } from '@/components/ui/Badge';

// Icon components
const KeyboardIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const CommandIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);


export default function KeyboardShortcuts() {
  const shortcuts = [
    {
      category: "Global Navigation",
      icon: <CommandIcon />,
      shortcuts: [
        { keys: ["⌘/Ctrl", "K"], action: "Open quick search" },
        { keys: ["⌘/Ctrl", "P"], action: "Open user preferences" },
        { keys: ["Esc"], action: "Close modals and dropdowns" },
        { keys: ["?"], action: "Show keyboard shortcuts help" }
      ]
    },
    {
      category: "Search & Discovery",
      icon: <SearchIcon />,
      shortcuts: [
        { keys: ["/"], action: "Focus search bar" },
        { keys: ["Enter"], action: "Submit search" },
        { keys: ["Tab"], action: "Navigate through form elements" }
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
              <KeyboardIcon />
            </div>
            <Badge variant="primary" className="mb-4">Keyboard Shortcuts</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Navigate Faster with Keyboard Shortcuts
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Master these keyboard shortcuts to navigate Grantify.ai more efficiently and streamline your grant discovery workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Platform Detection Note */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-12">
              <p className="text-blue-800">
                <strong>Note:</strong> Keyboard shortcuts adapt to your operating system. Mac users will see ⌘ (Command) while Windows/Linux users will see Ctrl.
              </p>
            </div>

            {/* Shortcuts Grid */}
            <div className="grid gap-8 md:gap-12">
              {shortcuts.map((section, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="text-primary-600">
                      {section.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{section.category}</h2>
                  </div>
                  <div className="space-y-4">
                    {section.shortcuts.map((shortcut, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-700">{shortcut.action}</span>
                        <div className="flex items-center gap-2">
                          {shortcut.keys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              {keyIdx > 0 && <span className="text-gray-400">+</span>}
                              <kbd className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Tips */}
            <div className="mt-12 bg-primary-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pro Tips</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary-600 mt-1">•</span>
                  <span className="text-gray-700">
                    Press <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">?</kbd> at any time to see available shortcuts
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary-600 mt-1">•</span>
                  <span className="text-gray-700">
                    Use <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">/</kbd> for quick search access from anywhere on the site
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary-600 mt-1">•</span>
                  <span className="text-gray-700">
                    Keyboard shortcuts work best when not typing in form fields
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}