"use client";

import React, { useEffect, useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Icon components
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const { shortcuts } = useKeyboardShortcuts();

  useEffect(() => {
    setIsMac(navigator.platform?.includes('Mac') || false);
  }, []);

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true);
    const handleCloseModals = () => setIsOpen(false);

    window.addEventListener('showKeyboardHelp', handleShowHelp);
    window.addEventListener('closeAllModals', handleCloseModals);

    return () => {
      window.removeEventListener('showKeyboardHelp', handleShowHelp);
      window.removeEventListener('closeAllModals', handleCloseModals);
    };
  }, []);

  if (!isOpen) return null;

  const formatKey = (shortcut: any) => {
    const keys = [];
    if (shortcut.ctrl || shortcut.meta) {
      keys.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) {
      keys.push('Shift');
    }
    keys.push(shortcut.key === ' ' ? 'Space' : shortcut.key);
    return keys;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="text-primary-600">
                <KeyboardIcon />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg"
                >
                  <span className="text-gray-700">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {formatKey(shortcut).map((key, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className="text-gray-400 text-sm">+</span>}
                        <kbd className="px-2 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm">
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 rounded-b-xl">
            <p className="text-sm text-gray-600 text-center">
              Press <kbd className="px-2 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">Esc</kbd> to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}