"use client";

import React, { useState, useEffect } from 'react';
import { GrantFilter } from '@/types/grant';
import FundingRangeFilter from './FundingRangeFilter';
import DeadlineFilter from './DeadlineFilter';
import { DEFAULT_FILTER_STATE, validateFilterState } from '@/utils/filterPresets';


interface CompactAdvancedFilterPanelProps {
  filters: GrantFilter;
  onFilterChange: (filters: Partial<GrantFilter>) => void;
  onApply: () => void | Promise<void>;
  availableOptions: {
    dataSources?: string[];
    agencies?: string[];
    grantTypes?: string[];
    activityCategories?: string[];
    applicantTypes?: string[];
  };
  isLoading?: boolean;
}

// Removed filter presets - using dedicated sort dropdown instead

export default function CompactAdvancedFilterPanel({
  filters,
  onFilterChange,
  onApply,
  availableOptions,
  isLoading = false
}: CompactAdvancedFilterPanelProps) {
  const [pendingFilters, setPendingFilters] = useState<GrantFilter>(filters);
  const [isApplying, setIsApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  // Sync pending filters when filters prop changes
  useEffect(() => {
    setPendingFilters(filters);
  }, [filters]);

  // Update pending filters instead of applying directly
  const handleFilterChange = (changes: Partial<GrantFilter>) => {
    setPendingFilters(prev => ({ ...prev, ...changes }));
  };

  const resetAllFilters = () => {
    setPendingFilters(DEFAULT_FILTER_STATE as GrantFilter);
  };

  const handleApply = async () => {
    setIsApplying(true);
    setJustApplied(false);
    try {
      // Apply all pending changes
      onFilterChange(pendingFilters);
      await onApply();
      setJustApplied(true);
    } finally {
      // Add a small delay to show the applying state
      setTimeout(() => {
        setIsApplying(false);
        setTimeout(() => {
          setJustApplied(false);
        }, 2000); // Show success state for 2 seconds
      }, 500);
    }
  };

  // Count active filters in pending state
  const activeFilterCount = () => {
    let count = 0;
    // Funding filters
    if (pendingFilters.fundingMin && pendingFilters.fundingMin > 0) count++;
    if (pendingFilters.fundingMax && pendingFilters.fundingMax < 10000000) count++;
    if (!pendingFilters.includeFundingNull) count++;
    if (pendingFilters.onlyNoFunding) count++;
    
    // Deadline filters
    if (pendingFilters.deadlineMinDays && pendingFilters.deadlineMinDays > 0) count++;
    if (pendingFilters.deadlineMaxDays && pendingFilters.deadlineMaxDays < 365) count++;
    if (!pendingFilters.includeNoDeadline) count++;
    if (pendingFilters.onlyNoDeadline) count++;
    if (pendingFilters.showOverdue) count++;
    
    // Status filters - count if different from default
    const defaultStatuses = ['active', 'open'];
    if (pendingFilters.statuses?.length && 
        (pendingFilters.statuses.length !== defaultStatuses.length || 
         !pendingFilters.statuses.every(s => defaultStatuses.includes(s)))) {
      count++;
    }
    
    // Organization filters
    if (pendingFilters.organizations?.length) count++;
    if (pendingFilters.data_source_ids?.length) count++;
    
    // Type and category filters  
    if (pendingFilters.eligible_applicant_types?.length) count++;
    
    // Boolean filters
    if (pendingFilters.costSharingRequired !== null && pendingFilters.costSharingRequired !== undefined) count++;
    
    return count;
  };

  const filterCount = activeFilterCount();

  return (
    <div className={`relative px-4 py-3 bg-white transition-all duration-300 shadow-sm border-b border-gray-100 ${isApplying ? 'bg-blue-50' : ''}`}>
      {/* Loading overlay */}
      {isApplying && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
            <span className="text-xs font-medium text-gray-700">Applying filters...</span>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto">
        {/* Inline Sort Section */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
          <select
            value={pendingFilters.sortBy || 'relevance'}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
            className="form-select text-sm py-1 px-2 flex-1 max-w-xs"
          >
            <option value="relevance">Relevance</option>
            <option value="recent">Recently Added</option>
            <option value="deadline">Deadline (Soonest)</option>
            <option value="deadline_latest">Deadline (Latest)</option>
            <option value="amount">Funding Amount (Highest)</option>
            <option value="amount_asc">Funding Amount (Lowest)</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
        </div>

        {/* Main Filter Grid - More columns for dense layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-3">
          {/* Funding Range */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Funding Amount</h4>
            <FundingRangeFilter
              fundingMin={pendingFilters.fundingMin || 0}
              fundingMax={pendingFilters.fundingMax || 10000000}
              includeFundingNull={pendingFilters.includeFundingNull || false}
              onlyNoFunding={pendingFilters.onlyNoFunding || false}
              setFundingMin={(value) => handleFilterChange({ fundingMin: value })}
              setFundingMax={(value) => handleFilterChange({ fundingMax: value })}
              handleFundingOptionChange={(option, checked) => {
                if (option === 'include') {
                  handleFilterChange({ includeFundingNull: checked });
                } else if (option === 'only') {
                  handleFilterChange({ onlyNoFunding: checked });
                }
              }}
            />
          </div>

          {/* Deadline */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Application Deadline</h4>
            <DeadlineFilter
              deadlineMinDays={pendingFilters.deadlineMinDays}
              deadlineMaxDays={pendingFilters.deadlineMaxDays}
              includeNoDeadline={pendingFilters.includeNoDeadline}
              onlyNoDeadline={pendingFilters.onlyNoDeadline}
              showOverdue={pendingFilters.showOverdue}
              onChange={(deadline) => handleFilterChange(deadline)}
            />
          </div>

          {/* Grant Status */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Grant Status</h4>
            <div className="space-y-1">
              {[
                { value: 'active', label: 'Active' },
                { value: 'open', label: 'Open' },
                { value: 'forecasted', label: 'Forecasted' },
                { value: 'closed', label: 'Closed' },
                { value: 'archived', label: 'Archived' }
              ].map((status) => (
                <label key={status.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pendingFilters.statuses?.includes(status.value) || false}
                    onChange={(e) => {
                      const current = pendingFilters.statuses || [];
                      const updated = e.target.checked
                        ? [...current, status.value]
                        : current.filter(s => s !== status.value);
                      handleFilterChange({ statuses: updated });
                    }}
                    className="form-checkbox h-3 w-3 text-primary-600 rounded"
                  />
                  <span className="ml-1.5 text-xs text-gray-700">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h4>
            
            {/* Cost Sharing */}
            <div className="mb-2">
              <label className="text-xs text-gray-600 mb-1 block">Cost Sharing</label>
              <div className="flex gap-1">
                {[
                  { value: null, label: 'Both' },
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' }
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    onClick={() => handleFilterChange({ costSharingRequired: option.value })}
                    className={`px-2 py-1 text-xs rounded transition-all border font-medium ${
                      pendingFilters.costSharingRequired === option.value
                        ? 'bg-primary-100 text-primary-700 border-primary-300'
                        : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Eligibility */}
            {availableOptions.applicantTypes && availableOptions.applicantTypes.length > 0 && (
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Applicant Types</label>
                <select
                  value={pendingFilters.eligible_applicant_types?.[0] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange({ 
                      eligible_applicant_types: value ? [value] : [] 
                    });
                  }}
                  className="form-select w-full text-xs py-1 px-2"
                >
                  <option value="">All Types</option>
                  {availableOptions.applicantTypes.slice(0, 10).map((type) => (
                    <option key={type} value={type}>
                      {type.length > 20 ? type.substring(0, 20) + '...' : type}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Data Sources */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Data Sources</h4>
            <select
              value={pendingFilters.data_source_ids?.[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange({ 
                  data_source_ids: value ? [value] : [] 
                });
              }}
              className="form-select w-full text-xs py-1 px-2"
            >
              <option value="">All Sources</option>
              <option value="NIH">NIH</option>
              <option value="NSF">NSF</option>
              <option value="DOE">DOE</option>
              <option value="USDA">USDA</option>
              <option value="NASA">NASA</option>
            </select>
          </div>
        </div>

        {/* Action Buttons Row - Compact */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {filterCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                {filterCount} filter{filterCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={resetAllFilters}
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Reset all
            </button>
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            disabled={isApplying || isLoading}
            className={`px-4 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 ${
              justApplied
                ? 'bg-green-600 text-white'
                : isApplying || isLoading
                ? 'bg-primary-600 text-white opacity-75 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
            }`}
          >
            {justApplied ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Applied
              </>
            ) : isApplying ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Applying
              </>
            ) : isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Apply Filters
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}