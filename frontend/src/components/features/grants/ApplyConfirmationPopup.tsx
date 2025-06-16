"use client";

import React, { useEffect } from 'react';

interface ApplyConfirmationPopupProps {
  isOpen: boolean;
  grantTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal popup to confirm grant application
 */
const ApplyConfirmationPopup: React.FC<ApplyConfirmationPopupProps> = ({
  isOpen,
  grantTitle,
  onConfirm,
  onCancel
}) => {
  // Listen for Escape key and closeAllModals event
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    const handleCloseAll = () => {
      onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('closeAllModals', handleCloseAll);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('closeAllModals', handleCloseAll);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirmation-title"
    >
      <div 
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirmation-title" className="text-lg font-semibold mb-2">
          Confirm Application
        </h3>
        <p className="mb-4">
          Did you apply for the grant: <span className="font-medium">{grantTitle}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplyConfirmationPopup;