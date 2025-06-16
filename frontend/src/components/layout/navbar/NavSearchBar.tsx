"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Icon components
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface NavSearchBarProps {
  isHomePage?: boolean;
  scrolled?: boolean;
}

export default function NavSearchBar({ isHomePage = false, scrolled = false }: NavSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Navigate to search page even with empty query to show default filtered results
    const searchQuery = query.trim();
    if (searchQuery) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // Navigate to search page with no query to show all grants with default filters
      router.push('/search');
    }
    setQuery('');
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Detect platform on client side
  useEffect(() => {
    setIsMac(navigator.platform?.includes('Mac') || false);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic styling based on homepage and scroll position
  const inputStyles = isHomePage && !scrolled
    ? "w-full pl-10 pr-8 py-2 text-sm bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-500 text-gray-900 shadow-soft"
    : "w-full pl-10 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder-gray-500 text-gray-900";

  const iconColor = isHomePage && !scrolled ? "text-gray-400" : "text-gray-400";

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className={`relative transition-all duration-200 ${
        isFocused ? 'w-56 lg:w-72' : 'w-48 lg:w-64'
      }`}>
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconColor}`}>
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search grants..."
          className={inputStyles}
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
              isHomePage && !scrolled ? 'hover:bg-gray-100' : 'hover:bg-gray-100'
            }`}
          >
            <div className={isHomePage && !scrolled ? 'text-gray-500' : 'text-gray-500'}>
              <XIcon />
            </div>
          </button>
        )}
        {!query && (
          <kbd className={`absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${
            isHomePage && !scrolled ? 'text-gray-500 bg-gray-100 border border-gray-200' : 'text-gray-400 bg-gray-100'
          }`}>
            {isMac ? '⌘' : 'Ctrl'}K
          </kbd>
        )}
      </div>
    </form>
  );
}