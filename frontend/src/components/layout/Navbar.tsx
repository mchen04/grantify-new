"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import NavSearchBar from '@/components/layout/navbar/NavSearchBar';

// Menu icon component
const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// Close icon component
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// User icon component
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isHomePage = pathname === '/';

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Listen for close all modals event
  useEffect(() => {
    const handleCloseAll = () => {
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    };

    window.addEventListener('closeAllModals', handleCloseAll);
    return () => window.removeEventListener('closeAllModals', handleCloseAll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Search Grants', path: '/search' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'About', path: '/about' },
  ];

  // Dynamic navbar classes based on homepage and scroll position
  const navbarClasses = isHomePage
    ? scrolled
      ? "bg-white/95 backdrop-blur-md shadow-lg transition-all duration-300 fixed w-full top-0 z-50"
      : "bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm transition-all duration-300 absolute w-full top-0 z-50"
    : "bg-white border-b border-gray-200 sticky top-0 z-50";

  // Dynamic text color for links based on homepage and scroll position
  const textColorClass = (isActive: boolean) => {
    if (isHomePage && !scrolled) {
      return isActive 
        ? 'text-primary-600 font-semibold bg-primary-50 px-3 py-1 rounded-lg' 
        : 'text-gray-900 hover:text-primary-600 hover:bg-gray-50 px-3 py-1 rounded-lg transition-all';
    }
    return isActive 
      ? 'text-primary-600 font-semibold bg-primary-50 px-3 py-1 rounded-lg' 
      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50 px-3 py-1 rounded-lg transition-all';
  };

  // Dynamic logo color based on homepage and scroll position
  const logoClass = isHomePage && !scrolled
    ? "text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent hover:from-primary-700 hover:to-primary-800 transition-all"
    : "text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent hover:from-primary-700 hover:to-primary-800 transition-all";

  // Mobile menu background
  const mobileMenuClass = isHomePage && !scrolled
    ? "bg-primary-700/95 backdrop-blur-md"
    : "bg-white";

  return (
    <>
      <nav className={navbarClasses}>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side: Logo and Navigation */}
            <div className="flex items-center">
              {/* Logo */}
              <Link
                href="/"
                className="flex items-center space-x-2"
              >
                <span className={logoClass}>
                  Grantify.ai
                </span>
              </Link>

              {/* Desktop navigation */}
              <div className="hidden md:flex items-center ml-8">
                <nav className="flex items-center space-x-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`text-sm font-medium ${textColorClass(pathname === item.path)}`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Right side: Search Bar and Auth section */}
            <div className="hidden md:flex items-center gap-6">
              {/* Search Bar with minimum width to prevent shrinking too much */}
              <div className="min-w-[192px]">
                <NavSearchBar isHomePage={isHomePage} scrolled={scrolled} />
              </div>
              
              {mounted && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isHomePage && !scrolled
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <UserIcon />
                    <span className="text-sm font-medium">
                      {user.email?.split('@')[0] || 'Account'}
                    </span>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">Signed in as</p>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/preferences"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Preferences
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => {
                            signOut();
                            setDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-error-50 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : mounted ? (
                <>
                  <Link
                    href="/login"
                    className={isHomePage && !scrolled
                      ? "px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
                      : "text-gray-600 hover:text-primary-600 text-sm font-medium transition-colors"
                    }
                  >
                    Log in
                  </Link>
                  <Button href="/login" size="sm">
                    Get Started
                  </Button>
                </>
              ) : (
                // Loading state for auth
                <div className="animate-pulse">
                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  isHomePage && !scrolled
                    ? "text-white hover:bg-white/10"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${
            isHomePage && !scrolled ? "border-white/20" : "border-gray-200"
          }`}>
            <div className={`px-4 py-4 space-y-2 ${mobileMenuClass}`}>
              {/* Mobile Search Bar */}
              <div className="pb-4 border-b border-gray-200/20">
                <NavSearchBar isHomePage={isHomePage} scrolled={scrolled} />
              </div>
              
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                    pathname === item.path
                      ? isHomePage && !scrolled
                        ? "bg-white/20 text-white"
                        : "bg-primary-50 text-primary-600"
                      : isHomePage && !scrolled
                        ? "text-white/90 hover:bg-white/10"
                        : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="pt-4 border-t border-gray-200/20 space-y-2">
                {mounted && user ? (
                  <>
                    <div className={`px-4 py-2 text-sm ${
                      isHomePage && !scrolled ? "text-white/70" : "text-gray-500"
                    }`}>
                      {user.email}
                    </div>
                    <Link
                      href="/profile"
                      className={`block px-4 py-2 rounded-lg text-sm ${
                        isHomePage && !scrolled
                          ? "text-white/90 hover:bg-white/10"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Profile & Settings
                    </Link>
                    <button
                      onClick={signOut}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm ${
                        isHomePage && !scrolled
                          ? "text-white/90 hover:bg-white/10"
                          : "text-error-600 hover:bg-error-50"
                      }`}
                    >
                      Sign Out
                    </button>
                  </>
                ) : mounted ? (
                  <>
                    <Link
                      href="/login"
                      className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                        isHomePage && !scrolled
                          ? "text-white/90 hover:bg-white/10"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/login"
                      className={`block px-4 py-2 rounded-lg text-sm font-medium text-center ${
                        isHomePage && !scrolled
                          ? "bg-white text-primary-600 hover:bg-gray-100"
                          : "bg-primary-600 text-white hover:bg-primary-700"
                      }`}
                    >
                      Get Started
                    </Link>
                  </>
                ) : (
                  // Loading state
                  <div className="px-4 py-2">
                    <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;