"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';

// Icon components
const TwitterIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Footer: React.FC = () => {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const isLandingPage = pathname === '/';

  return (
    <footer className="bg-gray-50 border-t border-gray-200">

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={isLandingPage ? "py-12 md:py-16" : "py-8 md:py-12"}>
          {/* Main footer content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 xl:gap-8">
            {/* Brand section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  Grantify.ai
                </div>
                {isLandingPage && <Badge variant="primary">AI-Powered</Badge>}
              </div>
              {isLandingPage ? (
                <>
                  <p className="text-gray-600 max-w-md mb-6">
                    The intelligent grant discovery platform that matches researchers, nonprofits, and innovators with their perfect funding opportunities using advanced AI technology.
                  </p>
                </>
              ) : (
                <p className="text-gray-600 max-w-md mb-6">
                  AI-powered grant matching platform.
                </p>
              )}
              <div className="flex items-center gap-4">
                <a 
                  href="https://twitter.com" 
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterIcon />
                </a>
                <a 
                  href="https://linkedin.com" 
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                  aria-label="LinkedIn"
                >
                  <LinkedInIcon />
                </a>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                Platform
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/search" className="text-gray-600 hover:text-primary-600 transition-colors">
                    Search Grants
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-600 hover:text-primary-600 transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/preferences" className="text-gray-600 hover:text-primary-600 transition-colors">
                    Preferences
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-primary-600 transition-colors">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support & Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:support@grantify.ai" className="text-gray-600 hover:text-primary-600 transition-colors">
                    support@grantify.ai
                  </a>
                </li>
                <li className="text-gray-600">
                  Mon-Fri, 9AM-6PM PST
                </li>
              </ul>
              
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Office
                </h3>
                <p className="text-gray-600">
                  San Francisco, CA<br />
                  United States
                </p>
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-600">
                <p>&copy; {currentYear} Grantify.ai. All rights reserved.</p>
                <span className="hidden sm:inline text-gray-400">•</span>
                <p>A product built with ❤️ for researchers</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link href="/privacy-policy" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/cookie-policy" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Cookie Policy
                </Link>
                <Link href="/terms-of-service" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Terms of Service
                </Link>
                <Link href="/accessibility" className="text-gray-600 hover:text-primary-600 transition-colors">
                  Accessibility
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;