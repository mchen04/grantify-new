"use client";

import React, { useState, useEffect } from 'react';
import { debounce } from '@/utils/debounce';
import { SelectOption } from '@/types/grant';
import { preferenceCookieManager, COOKIE_NAMES } from '@/utils/cookieManager';

interface CollapsibleFilterPanelProps {
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOptions: SelectOption[];
  filterOnlyNoDeadline: boolean;
  setFilterOnlyNoDeadline: (value: boolean) => void;
  filterOnlyNoFunding: boolean;
  setFilterOnlyNoFunding: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const CollapsibleFilterPanel: React.FC<CollapsibleFilterPanelProps> = ({
  sortBy,
  setSortBy,
  sortOptions,
  filterOnlyNoDeadline,
  setFilterOnlyNoDeadline,
  filterOnlyNoFunding,
  setFilterOnlyNoFunding,
  searchTerm,
  setSearchTerm
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Create a debounced version of setSearchTerm to reduce frequency of parent state updates
  const debouncedSetSearchTerm = React.useMemo(
    () => debounce(setSearchTerm as (...args: unknown[]) => unknown, 300), // 300ms delay
    [setSearchTerm]
  );

  // Update localSearchTerm when searchTerm prop changes (e.g. from parent clear action)
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Save sort preference when it changes
  useEffect(() => {
    if (sortBy && preferenceCookieManager.isAllowed()) {
      preferenceCookieManager.setPreference(COOKIE_NAMES.DASHBOARD_LAYOUT, {
        sortBy,
        lastUpdated: new Date().toISOString()
      });
    }
  }, [sortBy]);

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Search and basic controls - always visible */}
      <div className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
          {/* Search input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search grants..."
                value={localSearchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setLocalSearchTerm(value); // Update local state immediately for responsive UI
                  debouncedSetSearchTerm(value); // Debounce the update to parent state
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {localSearchTerm && (
                <button
                  onClick={() => {
                    setLocalSearchTerm('');
                    setSearchTerm(''); // Update parent state immediately for clear action
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="w-full md:w-64">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle button for advanced filters */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          <span>{isExpanded ? 'Hide advanced filters' : 'Show advanced filters'}</span>
          <svg
            className={`ml-1 h-5 w-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Advanced filters - collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filter toggles */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Special Filters</h3>
              
              <div className="flex items-center">
                <input
                  id="no-deadline-filter"
                  type="checkbox"
                  checked={filterOnlyNoDeadline}
                  onChange={(e) => setFilterOnlyNoDeadline(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="no-deadline-filter" className="ml-2 block text-sm text-gray-700">
                  Only show grants with no deadline or open-ended deadlines
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="no-funding-filter"
                  type="checkbox"
                  checked={filterOnlyNoFunding}
                  onChange={(e) => setFilterOnlyNoFunding(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="no-funding-filter" className="ml-2 block text-sm text-gray-700">
                  Only show grants with no funding amount specified
                </label>
              </div>
            </div>
            
            {/* Quick filter buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Quick Filters</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => {
                    setFilterOnlyNoDeadline(false);
                    setFilterOnlyNoFunding(false);
                    setSearchTerm('');
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700"
                >
                  Clear all filters
                </button>
                <button 
                  onClick={() => setSortBy('deadline')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    sortBy === 'deadline' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Closest deadline
                </button>
                <button 
                  onClick={() => setSortBy('amount')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    sortBy === 'amount' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Highest funding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleFilterPanel;