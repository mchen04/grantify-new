"use client";

import React, { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, truncateText } from '@/utils/formatters';
import ActionButton from '@/components/features/grants/ActionButton';
import GrantCardIcons from '@/components/features/grants/GrantCardIcons';
import GrantCardFooter from '@/components/features/grants/GrantCardFooter';
import { InteractionStatus } from '@/types/interaction';
import { useCleanupOnUnmount, useSafeTimeout } from '@/hooks/useCleanupOnUnmount';
import { 
  useInteractionStatus, 
  useSaveGrantMutation, 
  useApplyGrantMutation, 
  useIgnoreGrantMutation,
  useDeleteInteractionMutation 
} from '@/hooks/useInteractions';

interface GrantCardProps {
  id: string;
  title: string;
  agency: string;
  closeDate: string | null;
  fundingAmount: number | null;
  description: string; // This will use description_short from the Grant interface
  categories: string[];
  sourceUrl?: string | null; // URL to the grant application page
  opportunityId?: string; // Opportunity ID for grants.gov fallback
  onSave?: (status: InteractionStatus | null) => void | Promise<void>;
  onApply?: (status: InteractionStatus | 'pending' | null) => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onIgnore?: (status: InteractionStatus | null) => void | Promise<void>;
  isApplied?: boolean;
  isIgnored?: boolean;
  isSaved?: boolean;
  linkParams?: string; // Query parameters for the grant detail link
  enableFadeAnimation?: boolean;
}

// Define the ref type for fade animation
export interface GrantCardRef {
  fadeAndRemoveCard: () => Promise<void>;
}

/**
 * Card component for displaying grant information
 */
const GrantCard = forwardRef<GrantCardRef, GrantCardProps>(({
  id,
  title,
  agency,
  closeDate,
  fundingAmount,
  description,
  categories,
  sourceUrl,
  opportunityId,
  onSave,
  onApply,
  onShare,
  onIgnore,
  isApplied = false,
  isIgnored = false,
  isSaved = false,
  linkParams,
  enableFadeAnimation = false
}, ref) => {
  const [fading, setFading] = useState(false);
  // Ensure fundingAmount is never NaN before formatting
  const safeFundingAmount = Number.isFinite(fundingAmount) && !Number.isNaN(fundingAmount) ? fundingAmount : null;
  const formattedAmount = formatCurrency(safeFundingAmount);
  const truncatedDescription = truncateText(description, 150);
  // Cleanup management to prevent race conditions after unmount
  const cleanup = useCleanupOnUnmount();
  
  // Get interaction status using TanStack Query
  const interactionStatus = useInteractionStatus(id);
  
  // Get mutation hooks for each action
  const { saveGrant, isPending: isSaving } = useSaveGrantMutation();
  const { applyGrant, isPending: isApplying } = useApplyGrantMutation();
  const { ignoreGrant, isPending: isIgnoring } = useIgnoreGrantMutation();
  const deleteInteraction = useDeleteInteractionMutation();
  
  console.log('[GrantCard] Interaction status check:', {
    id,
    interactionStatus,
    propIsApplied: isApplied,
    propIsIgnored: isIgnored,
    propIsSaved: isSaved
  });
  
  // Use the query status if available, otherwise fall back to props
  const isAppliedCurrent = interactionStatus === 'applied' || isApplied;
  const isIgnoredCurrent = interactionStatus === 'ignored' || isIgnored;
  const isSavedCurrent = interactionStatus === 'saved' || isSaved;

  // Build enhanced ARIA label for accessibility with NaN protection
  const ariaLabel = `Grant: ${title} by ${agency}. ${
    safeFundingAmount && Number.isFinite(safeFundingAmount) ? `Funding: $${safeFundingAmount.toLocaleString()}.` : 'No funding amount specified.'
  } ${
    closeDate ? `Deadline: ${closeDate}.` : 'No deadline.'
  } ${
    isSavedCurrent ? 'Saved.' : ''
  } ${
    isAppliedCurrent ? 'Applied.' : ''
  } ${
    isIgnoredCurrent ? 'Ignored.' : ''
  }`;

  // Function to fade out the card (for dashboard use)
  const fadeAndRemoveCard = async () => {
    if (enableFadeAnimation && cleanup.isMounted()) {
      const safeSetFading = cleanup.safeSetState(setFading);
      safeSetFading(true);
      
      // Wait for fade animation to complete with safe async execution
      await cleanup.safeAsync(async () => {
        return new Promise<void>(resolve => {
          const timer = setTimeout(() => {
            if (cleanup.isMounted()) {
              resolve();
            }
          }, 300);
          
          // Add timer to cleanup registry
          cleanup.addTimer(timer, 'fade-animation');
        });
      });
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

  const handleApplyClick = useCallback(() => {
    console.log('[GrantCard] Apply clicked:', { 
      id, 
      isAppliedCurrent, 
      hasOnApply: !!onApply,
      sourceUrl,
      opportunityId
    });
    
    // If already applied, remove the interaction
    if (isAppliedCurrent) {
      deleteInteraction.mutate({ grantId: id, action: 'applied' });
      onApply?.(null); // Call legacy callback if provided
      return;
    }
    
    // Mark as applied using TanStack Query
    applyGrant(id);
    
    // Call legacy callback if provided (for backward compatibility)
    onApply?.('pending');
    
    // Open application URL
    const applyUrl = sourceUrl || 
      (opportunityId ? `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opportunityId}` : 
       `https://www.grants.gov/search-results.html?keywords=${encodeURIComponent(title)}`);
    
    window.open(applyUrl, '_blank');
  }, [id, sourceUrl, opportunityId, title, isAppliedCurrent, onApply, applyGrant, deleteInteraction]);

  const handleSaveClick = useCallback(() => {
    console.log('[GrantCard] Save clicked:', { id, isSavedCurrent, hasOnSave: !!onSave });
    
    // Toggle the saved status using TanStack Query
    if (isSavedCurrent) {
      deleteInteraction.mutate({ grantId: id, action: 'saved' });
      onSave?.(null); // Call legacy callback if provided
    } else {
      saveGrant(id);
      onSave?.('saved'); // Call legacy callback if provided
    }
  }, [id, isSavedCurrent, onSave, saveGrant, deleteInteraction]);

  const handleIgnoreClick = useCallback(() => {
    console.log('[GrantCard] Ignore clicked:', { id, isIgnoredCurrent, hasOnIgnore: !!onIgnore });
    
    // Toggle the ignored status using TanStack Query
    if (isIgnoredCurrent) {
      deleteInteraction.mutate({ grantId: id, action: 'ignored' });
      onIgnore?.(null); // Call legacy callback if provided
    } else {
      ignoreGrant(id);
      onIgnore?.('ignored'); // Call legacy callback if provided
    }
  }, [id, isIgnoredCurrent, onIgnore, ignoreGrant, deleteInteraction]);

  return (
    <article 
      className={`grant-card p-4 transition-opacity duration-300 ease-in-out h-full relative ${
        enableFadeAnimation && fading ? 'opacity-0' : 'opacity-100'
      }`}
      aria-label={ariaLabel}
      role="article"
    >
      <div className="flex flex-col h-full">
        {/* Header with action buttons */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/grants/${id.split('?')[0]}${linkParams || '?from=search'}`}
              className="grant-card-title text-lg mb-1 block hover:text-primary-600 transition-colors line-clamp-2 h-[3.5rem]"
              title={title}
            >
              {title}
            </Link>
            <div className="flex items-center text-sm text-gray-600 h-5">
              <span className="truncate">{agency}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-medium text-primary-600 whitespace-nowrap">{formattedAmount}</span>
            </div>
          </div>

          {/* Action buttons in top right */}
          <div className="flex items-start gap-1 flex-shrink-0">
            {/* Save Grant */}
            <ActionButton
              onClick={handleSaveClick}
              isActive={isSavedCurrent}
              activeColor="text-primary-600"
              inactiveColor="text-gray-400"
              hoverColor="text-primary-600"
              title={isSavedCurrent ? "Unsave Grant" : "Save Grant"}
              icon={<GrantCardIcons.Save fill={isSavedCurrent} />}
            />

            {/* Ignore Grant */}
            <ActionButton
              onClick={handleIgnoreClick}
              isActive={isIgnoredCurrent}
              activeColor="text-red-600"
              inactiveColor="text-gray-400"
              hoverColor="text-red-600"
              title={isIgnoredCurrent ? "Unignore Grant" : "Ignore Grant"}
              icon={<GrantCardIcons.Ignore fill={isIgnoredCurrent} />}
            />

            {/* Apply */}
            <ActionButton
              onClick={handleApplyClick}
              isActive={isAppliedCurrent}
              activeColor="text-green-600"
              inactiveColor="text-gray-400"
              hoverColor="text-green-600"
              title={isAppliedCurrent ? "Unapply Grant" : "Apply for Grant"}
              icon={<GrantCardIcons.Apply fill={isAppliedCurrent} />}
            />

            {/* Share Grant */}
            <ActionButton
              onClick={onShare}
              isActive={false}
              activeColor="text-blue-600"
              inactiveColor="text-gray-400"
              hoverColor="text-blue-600"
              title="Share Grant"
              icon={<GrantCardIcons.Share />}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-[2.5rem]">
          {truncatedDescription}
        </p>

        {/* Footer */}
        <GrantCardFooter 
          categories={categories} 
          closeDate={closeDate} 
        />
      </div>
    </article>
  );
});

// Add display name for debugging
GrantCard.displayName = 'GrantCard';

export default React.memo(GrantCard, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.agency === nextProps.agency &&
    prevProps.closeDate === nextProps.closeDate &&
    prevProps.fundingAmount === nextProps.fundingAmount &&
    prevProps.description === nextProps.description &&
    prevProps.isApplied === nextProps.isApplied &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.isIgnored === nextProps.isIgnored &&
    JSON.stringify(prevProps.categories) === JSON.stringify(nextProps.categories)
  );
});