import React from 'react';
import { GrantFilter } from '@/types/grant';


interface ActiveFiltersProps {
  filter: GrantFilter;
}

/**
 * Component to display active filters as badges with clear functionality
 */
const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filter }) => {
  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return "$10M+";
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 0)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format deadline display
  const formatDeadlineText = (days: number) => {
    if (days >= 365) {
      return "1 year+";
    } else if (days === 0) {
      return "Today";
    } else if (days === 1) {
      return "1 day";
    } else if (days === 7) {
      return "1 week";
    } else if (days === 14) {
      return "2 weeks";
    } else if (days === 30) {
      return "1 month";
    } else if (days === 60) {
      return "2 months";
    } else if (days === 90) {
      return "3 months";
    } else if (days === 180) {
      return "6 months";
    } else {
      return `${days} days`;
    }
  };

  // Always show active filters - show the current state rather than just non-defaults
  const hasActiveFilters = () => {
    return true; // Always show current filter state
  };

  if (!hasActiveFilters()) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {/* Search Term */}
        {filter.searchTerm && filter.searchTerm.trim() && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
            "{filter.searchTerm}"
          </span>
        )}


        {/* Organizations */}
        {filter.organizations && filter.organizations.length > 0 && (
          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
            {filter.organizations.join(', ')}
          </span>
        )}
        
        {/* Funding Filters - Show actual selected values */}
        {filter.onlyNoFunding ? (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
            No Funding Specified Only
          </span>
        ) : (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
            {formatCurrency(filter.fundingMin || 0)} - {formatCurrency(filter.fundingMax || 100000000)}
            {filter.includeFundingNull === true ? ' + Unspecified' : filter.includeFundingNull === false ? ' (Exclude Unspecified)' : ''}
          </span>
        )}
        
        {/* Deadline Filters - Show actual selected values */}
        {filter.onlyNoDeadline ? (
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-3 py-1 rounded-full">
            No Deadline Only
          </span>
        ) : filter.showOverdue ? (
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-3 py-1 rounded-full">
            All Deadlines (Including Past)
            {filter.includeNoDeadline === true ? ' + Unspecified' : filter.includeNoDeadline === false ? ' (Exclude Unspecified)' : ''}
          </span>
        ) : (
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-3 py-1 rounded-full">
            {filter.deadlineMinDays !== undefined && filter.deadlineMinDays !== null ? 
              formatDeadlineText(filter.deadlineMinDays) : 'Today'} - {filter.deadlineMaxDays !== undefined && filter.deadlineMaxDays !== null ? 
              formatDeadlineText(filter.deadlineMaxDays) : '1 year+'}
            {filter.includeNoDeadline === true ? ' + Unspecified' : filter.includeNoDeadline === false ? ' (Exclude Unspecified)' : ''}
          </span>
        )}

        {/* Requirements */}
        {filter.costSharingRequired !== null && filter.costSharingRequired !== undefined && (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
            Cost Sharing: {filter.costSharingRequired ? 'Required' : 'Not Required'}
          </span>
        )}

        {/* Note: clinicalTrialAllowed property doesn't exist in GrantFilter type */}
        {/* {filter.clinicalTrialAllowed !== null && filter.clinicalTrialAllowed !== undefined && (
          <span className="bg-pink-100 text-pink-800 text-xs font-medium px-3 py-1 rounded-full">
            Clinical Trials: {filter.clinicalTrialAllowed ? 'Allowed' : 'Not Allowed'}
          </span>
        )} */}

        {/* Applicant Types */}
        {filter.eligible_applicant_types && filter.eligible_applicant_types.length > 0 && (
          <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-3 py-1 rounded-full">
            {filter.eligible_applicant_types.join(', ')}
          </span>
        )}
        
        {/* Sort - Always show current sort */}
        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-3 py-1 rounded-full">
          Sort: {filter.sortBy === 'relevance' ? 'Relevance' :
                    filter.sortBy === 'recent' ? 'Recently Added' :
                    filter.sortBy === 'deadline' ? 'Deadline (Soonest)' :
                    filter.sortBy === 'deadline_latest' ? 'Deadline (Latest)' :
                    filter.sortBy === 'amount' ? 'Funding Amount (Highest)' :
                    filter.sortBy === 'amount_asc' ? 'Lowest Funding' :
                    filter.sortBy === 'title_asc' ? 'Title (A-Z)' :
                    filter.sortBy === 'title_desc' ? 'Title (Z-A)' :
                    filter.sortBy || 'Relevance'}
        </span>
      </div>
    </div>
  );
};

export default ActiveFilters;