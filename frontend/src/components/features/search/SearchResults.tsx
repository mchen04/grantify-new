"use client";

import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import GrantCard from '@/components/features/grants/GrantCard';
import { Grant } from '@/types/grant';
import { InteractionStatus } from '@/types/interaction';

interface SearchResultsProps {
  grants: Grant[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
  grantsPerPage: number;
  goToPage: (page: number) => void;
  onApply: (grantId: string, status: InteractionStatus | 'pending' | null) => Promise<void>;
  onSave: (grantId: string, status: InteractionStatus | null) => Promise<void>;
  onShare: (grantId: string) => Promise<void>;
  onIgnore: (grantId: string, status: InteractionStatus | null) => Promise<void>;
  onConfirmApply?: (grantId: string) => Promise<void>;
  getInteractionStatus: (grantId: string) => InteractionStatus | undefined;
}

// Define the ref type
export interface SearchResultsRef {
  fadeAndRemoveCard: (grantId: string) => Promise<void>;
}

/**
 * Component to display search results with pagination
 */
const SearchResults = forwardRef<SearchResultsRef, SearchResultsProps>(({
  grants,
  loading,
  error,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  grantsPerPage = 6,
  goToPage,
  onApply,
  onSave,
  onShare,
  onIgnore,
  onConfirmApply,
  getInteractionStatus
}, ref) => {
  // Ensure numeric values are valid (Number.isFinite checks for NaN, Infinity, and undefined)
  const safePage = (Number.isFinite(page) && page > 0) ? page : 1;
  const safeTotalPages = (Number.isFinite(totalPages) && totalPages > 0) ? totalPages : 1;
  const safeTotalCount = (Number.isFinite(totalCount) && totalCount >= 0) ? totalCount : 0;
  const safeGrantsPerPage = (Number.isFinite(grantsPerPage) && grantsPerPage > 0) ? grantsPerPage : 6;

  /**
   * Handle interactions that should immediately fade the card (save, ignore)
   */
  const handleInteraction = async (grantId: string, action: (grantId: string, status: InteractionStatus | null) => Promise<void>, status: InteractionStatus | null) => {
    // Just call the action directly - the parent handles instant removal
    await action(grantId, status);
  };

  /**
   * Special handler for apply button that doesn't fade the card immediately
   */
  const handleApplyClick = (grantId: string, status: InteractionStatus | 'pending' | null) => {
    // Just call the onApply callback without fading the card
    onApply(grantId, status);
  };

  /**
   * Function to remove a card after user confirmation
   */
  const fadeAndRemoveCard = async (grantId: string) => {
    // Call the onConfirmApply callback if provided
    if (onConfirmApply) {
      await onConfirmApply(grantId);
    }
  };

  // Expose the fadeAndRemoveCard function to parent components
  useImperativeHandle(
    ref,
    () => ({
      fadeAndRemoveCard
    }),
    [fadeAndRemoveCard]
  );

  /**
   * Render pagination controls
   */
  const renderPagination = () => {
    if (loading || grants.length === 0 || safeTotalCount === 0) return null;

    // Use safe values directly
    const validPage = safePage;
    const validTotalPages = safeTotalPages;

    return (
      <div className="mt-8 flex justify-center">
        <nav className="flex items-center space-x-1">
          <button 
            className={`p-2 rounded-md ${
              validPage === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-primary-600'
            }`}
            onClick={() => goToPage(Math.max(1, validPage - 1))}
            disabled={validPage === 1}
            aria-label="Previous page"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          {renderPageNumbers()}
          
          <button 
            className={`p-2 rounded-md ${
              validPage === validTotalPages 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-primary-600'
            }`}
            onClick={() => goToPage(Math.min(validTotalPages, validPage + 1))}
            disabled={validPage === validTotalPages}
            aria-label="Next page"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    );
  };

  /**
   * Calculate and render page number buttons
   */
  const renderPageNumbers = useCallback(() => {
    // Already validated safe values
    const currentPage = safePage;
    const maxPages = safeTotalPages;
    
    // Calculate which pages to display
    const pageNumbers: number[] = [];
    
    if (maxPages <= 5) {
      // Show all pages if 5 or fewer
      for (let i = 1; i <= maxPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Show 5 pages with current page in the middle when possible
      let startPage: number;
      
      if (currentPage <= 3) {
        // Near the beginning
        startPage = 1;
      } else if (currentPage >= maxPages - 2) {
        // Near the end
        startPage = maxPages - 4;
      } else {
        // In the middle
        startPage = currentPage - 2;
      }
      
      // Ensure startPage is at least 1
      startPage = Math.max(1, startPage);
      
      // Add 5 consecutive page numbers
      for (let i = 0; i < 5; i++) {
        const pageNum = startPage + i;
        if (pageNum <= maxPages) {
          pageNumbers.push(pageNum);
        }
      }
    }
    
    // Render the page buttons
    return pageNumbers.map((pageNum, index) => {
      return (
        <button
          key={`page-${pageNum}`}
          className={`px-3 py-1.5 text-sm rounded-md ${
            currentPage === pageNum
              ? 'bg-primary-50 text-primary-600 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => goToPage(pageNum)}
          aria-label={`Go to page ${pageNum}`}
          aria-current={currentPage === pageNum ? 'page' : undefined}
        >
          {pageNum}
        </button>
      );
    });
  }, [safePage, safeTotalPages, goToPage]);

  /**
   * Render skeleton loading cards
   */
  const renderSkeletonCards = () => {
    return (
      <div className="space-y-6">
        {Array.from({ length: safeGrantsPerPage }).map((_, index) => (
          <div 
            key={index} 
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm relative overflow-hidden"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent opacity-60"></div>
            {/* Header skeleton */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              </div>
              <div className="flex gap-2 ml-4">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-3 mb-4">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
            </div>
            
            {/* Tags skeleton */}
            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded-full w-14 animate-pulse"></div>
            </div>
            
            {/* Footer skeleton */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render the appropriate content based on loading/error/empty states
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {/* Loading header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Searching for grants...</span>
          </div>
          
          {/* Skeleton cards */}
          {renderSkeletonCards()}
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      );
    }
    
    if (grants.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">No grants found matching your criteria.</p>
          <p className="text-sm text-gray-500">
            {totalCount > 0 
              ? "You've interacted with all available grants. Try adjusting your search terms or filters to see more."
              : "Try adjusting your search terms or filters."}
          </p>
        </div>
      );
    }
    
    // Filter out grants with duplicate IDs before mapping
    const uniqueGrants = grants.filter((grant, index, self) =>
      index === self.findIndex((g) => g.id === grant.id)
    );
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr">
        {uniqueGrants.map((grant, index) => (
          <div
            key={grant.id}
            className="h-full animate-fade-in-up transition-all duration-300 ease-out"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <GrantCard
              id={grant.id}
              title={grant.title}
              agency={grant.funding_organization_name}
              closeDate={grant.application_deadline}
              fundingAmount={grant.funding_amount_max}
              description={grant.summary}
              categories={grant.activity_categories || []}
              sourceUrl={grant.source_url}
              opportunityId={grant.source_identifier}
              onApply={(status) => handleApplyClick(grant.id, status)}
              onSave={(status) => handleInteraction(grant.id, onSave, status)}
              onShare={() => onShare(grant.id)}
              onIgnore={(status) => handleInteraction(grant.id, onIgnore, status)}
              isApplied={getInteractionStatus(grant.id) === 'applied'}
              isIgnored={getInteractionStatus(grant.id) === 'ignored'}
              isSaved={getInteractionStatus(grant.id) === 'saved'}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>

      {/* Results header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Matched Grants</h2>
          {!loading && grants.length > 0 && safeTotalCount > 0 && (
            <span className="text-sm text-gray-500">
              Showing {(() => {
                const start = (safePage - 1) * safeGrantsPerPage + 1;
                // Use actual number of grants displayed for the end value
                const end = start + grants.length - 1;
                return `${start}-${end} of ${safeTotalCount}`;
              })()} results
            </span>
          )}
        </div>
      </div>
      
      {/* Main content */}
      {renderContent()}
      
      {/* Pagination */}
      {renderPagination()}
    </div>
  );
});

// Add display name for debugging
SearchResults.displayName = 'SearchResults';

export default SearchResults;