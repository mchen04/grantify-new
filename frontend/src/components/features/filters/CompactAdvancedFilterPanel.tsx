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
    
    // Organization filters
    if (pendingFilters.agencies?.length) count++;
    if (pendingFilters.data_sources?.length) count++;
    
    // Type and category filters  
    if (pendingFilters.eligible_applicant_types?.length) count++;
    
    // Boolean filters
    if (pendingFilters.costSharing !== null && pendingFilters.costSharing !== undefined) count++;
    if (pendingFilters.clinicalTrialAllowed !== null && pendingFilters.clinicalTrialAllowed !== undefined) count++;
    
    return count;
  };

  const filterCount = activeFilterCount();

  return (
    <div className={`relative px-6 py-6 bg-white transition-all duration-300 shadow-sm border-b border-gray-100 ${isApplying ? 'bg-blue-50' : ''}`}>
      {/* Loading overlay */}
      {isApplying && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow-lg border">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
            <span className="text-sm font-medium text-gray-700">Applying filters...</span>
          </div>
        </div>
      )}
      
      <div className="max-w-5xl mx-auto">
        {/* Sort By Section */}
        <div className="mb-6">
          <div className="card">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Sort Results</h3>
              <select
                value={pendingFilters.sortBy || 'relevance'}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="form-select w-full"
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
          </div>
        </div>

        {/* Main Filter Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Financial & Timing */}
          <div className="space-y-4">
            {/* Funding Range */}
            <div className="card">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Funding Amount</h3>
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
            </div>

            {/* Deadline */}
            <div className="card">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Application Deadline</h3>
                <DeadlineFilter
                  deadlineMinDays={pendingFilters.deadlineMinDays}
                  deadlineMaxDays={pendingFilters.deadlineMaxDays}
                  includeNoDeadline={pendingFilters.includeNoDeadline}
                  onlyNoDeadline={pendingFilters.onlyNoDeadline}
                  showOverdue={pendingFilters.showOverdue}
                  onChange={(deadline) => handleFilterChange(deadline)}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Filter Options */}
          <div className="space-y-4">

            {/* Boolean Options */}
            <div className="card">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
              
                <div className="space-y-4">
                  {/* Clinical Trials */}
                  <div className="form-group">
                    <label className="form-label text-sm">Clinical Trials</label>
                    <div className="flex gap-2">
                      {[
                        { value: null, label: 'Both' },
                        { value: true, label: 'Yes' },
                        { value: false, label: 'No' }
                      ].map((option) => (
                        <button
                          key={String(option.value)}
                          onClick={() => handleFilterChange({ clinicalTrialAllowed: option.value })}
                          className={`px-3 py-2 text-sm rounded-lg transition-all border font-medium ${
                            pendingFilters.clinicalTrialAllowed === option.value
                              ? 'bg-primary-100 text-primary-700 border-primary-300'
                              : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cost Sharing */}
                  <div className="form-group">
                    <label className="form-label text-sm">Cost Sharing</label>
                    <div className="flex gap-2">
                      {[
                        { value: null, label: 'Both' },
                        { value: true, label: 'Yes' },
                        { value: false, label: 'No' }
                      ].map((option) => (
                        <button
                          key={String(option.value)}
                          onClick={() => handleFilterChange({ costSharing: option.value })}
                          className={`px-3 py-2 text-sm rounded-lg transition-all border font-medium ${
                            pendingFilters.costSharing === option.value
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
                    <div className="form-group">
                      <label className="form-label text-sm">Applicant Types</label>
                      <select
                        value={pendingFilters.eligible_applicant_types?.[0] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleFilterChange({ 
                            eligible_applicant_types: value ? [value] : [] 
                          });
                        }}
                        className="form-select w-full"
                      >
                        <option value="">All Applicant Types</option>
                        {availableOptions.applicantTypes.slice(0, 10).map((type) => (
                          <option key={type} value={type}>
                            {type.length > 25 ? type.substring(0, 25) + '...' : type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="card">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {filterCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {filterCount} filter{filterCount !== 1 ? 's' : ''} active
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={resetAllFilters}
                  className="btn-secondary btn-sm"
                >
                  Reset All
                </button>
                <button
                  onClick={handleApply}
                  disabled={isApplying || isLoading}
                  className={`btn-sm transition-all duration-200 flex items-center gap-2 ${
                    justApplied
                      ? 'btn-success'
                      : isApplying || isLoading
                      ? 'btn-primary opacity-75 cursor-not-allowed'
                      : 'btn-primary hover:shadow-md active:scale-95'
                  }`}
                >
                  {justApplied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Applied!
                    </>
                  ) : isApplying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Applying...
                    </>
                  ) : isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Apply Filters
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}