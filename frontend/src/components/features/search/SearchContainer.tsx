"use client";

import React, { useMemo } from 'react';
import SearchResults from '@/components/features/search/SearchResults';
import { Grant } from '@/types/grant';
import { InteractionStatus } from '@/types/interaction';

interface SearchContainerProps {
  grants: Grant[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  totalCount: number;
  query: string;
  onPageChange: (page: number) => void;
  onGrantSave: (grantId: string, status: InteractionStatus | null) => Promise<void>;
  onGrantApply: (grantId: string, status: InteractionStatus | 'pending' | null) => Promise<void>;
  onGrantIgnore: (grantId: string, status: InteractionStatus | null) => Promise<void>;
  onGrantShare: (grantId: string) => Promise<void>;
  showApplyConfirmation: boolean;
  pendingApplyGrant: Grant | null;
  onConfirmApply: () => void;
  onCancelApply: () => void;
  getInteractionStatus: (grantId: string) => InteractionStatus | undefined;
}

const SearchContainer: React.FC<SearchContainerProps> = ({
  grants,
  loading,
  error,
  totalPages,
  currentPage,
  totalCount,
  query,
  onPageChange,
  onGrantSave,
  onGrantApply,
  onGrantIgnore,
  onGrantShare,
  showApplyConfirmation,
  pendingApplyGrant,
  onConfirmApply,
  onCancelApply,
  getInteractionStatus
}) => {
  // Wrapper functions to match Promise expectations
  const handleSave = async (grantId: string, status: InteractionStatus | null) => {
    await onGrantSave(grantId, status);
  };

  const handleApply = async (grantId: string, status: InteractionStatus | 'pending' | null) => {
    await onGrantApply(grantId, status);
  };

  const handleIgnore = async (grantId: string, status: InteractionStatus | null) => {
    await onGrantIgnore(grantId, status);
  };

  const handleShare = async (grantId: string) => {
    await onGrantShare(grantId);
  };

  // Memoize search parameters for performance
  const searchParams = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, []);

  const linkParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (currentPage > 1) params.set('page', currentPage.toString());
    return params.toString() ? `?${params.toString()}` : '';
  }, [query, currentPage]);

  return (
    <div className="space-y-6">
      <SearchResults
        grants={grants}
        loading={loading}
        error={error}
        page={currentPage || 1}
        totalPages={totalPages || 1}
        totalCount={totalCount || 0}
        grantsPerPage={6}
        goToPage={onPageChange}
        onSave={handleSave}
        onApply={handleApply}
        onIgnore={handleIgnore}
        onShare={handleShare}
        getInteractionStatus={getInteractionStatus}
      />
      
      {/* Apply Confirmation Popup - Lazy loaded via dynamic import in parent */}
      {showApplyConfirmation && pendingApplyGrant && (
        <div>
          {/* This will be handled by the parent component's dynamic import */}
        </div>
      )}
    </div>
  );
};

export default React.memo(SearchContainer);