"use client";

import React, { useEffect, useState } from 'react';

export default function AriaLiveAnnouncer() {
  const [announcement, setAnnouncement] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent) => {
      setAnnouncement(event.detail.message);
      setPoliteness(event.detail.politeness || 'polite');
      
      // Clear announcement after 100ms to allow for repeated announcements
      setTimeout(() => setAnnouncement(''), 100);
    };

    window.addEventListener('announce', handleAnnouncement as any);
    return () => window.removeEventListener('announce', handleAnnouncement as any);
  }, []);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeness === 'polite' && announcement}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {politeness === 'assertive' && announcement}
      </div>
    </>
  );
}

// Helper function to announce messages
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const event = new CustomEvent('announce', {
    detail: { message, politeness }
  });
  window.dispatchEvent(event);
}