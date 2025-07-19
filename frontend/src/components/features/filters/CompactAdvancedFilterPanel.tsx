"use client";

import React, { useState, useEffect } from 'react';
import { GrantFilter } from '@/shared/types/grant';
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
    const resetState = {
      ...DEFAULT_FILTER_STATE,
      searchTerm: pendingFilters.searchTerm, // Keep the search term
      page: pendingFilters.page // Keep the current page
    } as GrantFilter;
    setPendingFilters(resetState);
    // Apply the reset immediately
    onFilterChange(resetState);
  };

  const handleApply = async () => {
    // Prevent multiple rapid clicks
    if (isApplying) return;
    
    setIsApplying(true);
    setJustApplied(false);
    try {
      // Apply all pending changes
      onFilterChange(pendingFilters);
      await onApply();
      setJustApplied(true);
      
      // Show success state briefly then reset
      setTimeout(() => {
        setJustApplied(false);
      }, 1500);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      // Reset applying state immediately for better UX
      setIsApplying(false);
    }
  };

  // Count active filters in pending state
  const activeFilterCount = () => {
    let count = 0;
    // Funding filters - only count if different from default (undefined means no filter)
    if (pendingFilters.fundingMin !== undefined && pendingFilters.fundingMin > 0) count++;
    if (pendingFilters.fundingMax !== undefined && pendingFilters.fundingMax < 100000000) count++;
    if (pendingFilters.onlyNoFunding) count++;
    
    // Deadline filters - only count if different from default (undefined means no filter)
    if (pendingFilters.deadlineMinDays !== undefined) count++;
    if (pendingFilters.deadlineMaxDays !== undefined) count++;
    if (pendingFilters.onlyNoDeadline) count++;
    
    // Status filters - count if different from default
    const defaultStatuses = ['active', 'forecasted'];
    if (pendingFilters.statuses?.length && 
        (pendingFilters.statuses.length !== defaultStatuses.length || 
         !pendingFilters.statuses.every(s => defaultStatuses.includes(s)))) {
      count++;
    }
    
    // Organization filters
    if (pendingFilters.organizations?.length) count++;
    if (pendingFilters.data_source_ids !== undefined && pendingFilters.data_source_ids.length > 0) count++;
    
    // Type and category filters  
    if (pendingFilters.eligible_applicant_types !== undefined && pendingFilters.eligible_applicant_types.length > 0) count++;
    
    // Boolean filters - costSharingRequired REMOVED (all grants same value)
    
    // Geographic filters
    if (pendingFilters.geographic_scope) count++;
    if (pendingFilters.includeNoGeographicScope === false) count++; // Only count if explicitly excluding
    
    // Currency filters - count if not all are selected (undefined means all)
    const allAvailableCurrencies = ['USD', 'EUR'];
    if (pendingFilters.currencies !== undefined && pendingFilters.currencies.length !== allAvailableCurrencies.length) count++;
    if (pendingFilters.includeNoCurrency === false) count++; // Only count if explicitly excluding
    
    // Special filters
    if (pendingFilters.onlyFeatured) count++;
    
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

        {/* Main Filter Grid - Optimized for 5 effective filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
          {/* Funding Range - WITH MISSING DATA OPTION */}
          <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">💰 Funding Amount</h4>
            <div className="text-xs text-amber-600 mb-2 bg-amber-100 p-2 rounded">
              ⚠️ Only 8% of grants (308/3,874) have funding amount data
            </div>
            <FundingRangeFilter
              fundingMin={pendingFilters.fundingMin}
              fundingMax={pendingFilters.fundingMax}
              includeFundingNull={pendingFilters.includeFundingNull ?? true}
              setFundingMin={(value) => handleFilterChange({ fundingMin: value })}
              setFundingMax={(value) => handleFilterChange({ fundingMax: value })}
              handleFundingOptionChange={(option, checked) => {
                handleFilterChange({ includeFundingNull: checked });
              }}
            />
            <div className="text-xs text-gray-500 mt-1">
              {pendingFilters.includeFundingNull !== false ? "Including grants without funding data (3,566 grants)" : "Funding-specific grants only (308 grants)"}
            </div>
          </div>

          {/* Deadline - WITH MISSING DATA OPTION */}
          <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">📅 Application Deadline</h4>
            <div className="text-xs text-amber-600 mb-2 bg-amber-100 p-2 rounded">
              ⚠️ 46% coverage (1,777/3,874 grants have deadline data)
            </div>
            <DeadlineFilter
              deadlineMinDays={pendingFilters.deadlineMinDays}
              deadlineMaxDays={pendingFilters.deadlineMaxDays}
              includeNoDeadline={pendingFilters.includeNoDeadline ?? true}
              showOverdue={pendingFilters.showOverdue}
              onChange={(deadline) => handleFilterChange(deadline)}
            />
            <div className="text-xs text-gray-500 mt-1">
              {pendingFilters.includeNoDeadline !== false ? "Including grants without deadlines (2,097 grants)" : "Deadline-specific grants only (1,777 grants)"}
            </div>
          </div>

          {/* Grant Status - SIMPLIFIED */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Grant Status</h4>
            <div className="space-y-1">
              {[
                { value: 'active', label: 'Active (2,067)', count: 2067 },
                { value: 'forecasted', label: 'Forecasted (1,161)', count: 1161 },
                { value: 'open', label: 'Open (180)', count: 180 },
                { value: 'closed', label: 'Closed (466)', count: 466 }
              ].map((status) => (
                <label key={status.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pendingFilters.statuses?.includes(status.value) ?? (['active', 'forecasted'].includes(status.value))}
                    onChange={(e) => {
                      const current = pendingFilters.statuses || ['active', 'forecasted'];
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
            <div className="text-xs text-gray-500 mt-1">Numbers show available grants</div>
          </div>

          {/* Cost Sharing Filter REMOVED - All grants have same value (false) */}

          {/* Data Sources - REMOVED: Poor UX with UUIDs */}

          {/* Geographic Scope - WITH MISSING DATA OPTION */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">🌍 Geographic Scope</h4>
            <select
              value={pendingFilters.geographic_scope || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange({ 
                  geographic_scope: value || undefined 
                });
              }}
              className="form-select w-full text-xs py-1 px-2 mb-2"
            >
              <option value="">All Locations (3,874)</option>
              <option value="United States">United States (2,142)</option>
              <option value="European Union">European Union (1,037)</option>
              <option value="Global">Global (695)</option>
            </select>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={pendingFilters.includeNoGeographicScope ?? true}
                onChange={(e) => handleFilterChange({ includeNoGeographicScope: e.target.checked })}
                className="form-checkbox h-3 w-3 text-primary-600 rounded mr-1.5"
              />
              <span className="text-xs text-gray-700">Include grants without location data (280 grants)</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">
              {pendingFilters.includeNoGeographicScope !== false ? "Showing all 3,874 grants" : "Filtered to located grants only"}
            </div>
          </div>

          {/* Currency Filter - WITH MISSING DATA OPTION */}
          <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">💱 Currency</h4>
            <div className="text-xs text-amber-600 mb-2 bg-amber-100 p-2 rounded">
              ⚠️ Only 26% coverage (1,000/3,874 grants have currency data)
            </div>
            <div className="space-y-1 mb-2">
              {[
                { value: 'USD', label: 'USD ($) - 619 grants' },
                { value: 'EUR', label: 'EUR (€) - 381 grants' }
              ].map((currency) => (
                <label key={currency.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pendingFilters.currencies?.includes(currency.value) ?? true}
                    onChange={(e) => {
                      const allAvailableCurrencies = ['USD', 'EUR']; // Only currencies that exist in database
                      const current = pendingFilters.currencies ?? allAvailableCurrencies;
                      const updated = e.target.checked
                        ? [...new Set([...current, currency.value])]
                        : current.filter(c => c !== currency.value);
                      
                      // If all available currencies are selected, set to undefined (meaning "all")
                      const isAllAvailableSelected = allAvailableCurrencies.every(c => updated.includes(c));
                      handleFilterChange({ currencies: isAllAvailableSelected ? undefined : updated });
                    }}
                    className="form-checkbox h-3 w-3 text-primary-600 rounded"
                  />
                  <span className="ml-1.5 text-xs text-gray-700">{currency.label}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={pendingFilters.includeNoCurrency ?? true}
                onChange={(e) => handleFilterChange({ includeNoCurrency: e.target.checked })}
                className="form-checkbox h-3 w-3 text-primary-600 rounded mr-1.5"
              />
              <span className="text-xs text-gray-700">Include grants without currency data (2,874 grants)</span>
            </label>
            <div className="text-xs text-gray-500 mt-1">
              {pendingFilters.includeNoCurrency !== false ? "Showing all grants" : "Currency-specific grants only"}
            </div>
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