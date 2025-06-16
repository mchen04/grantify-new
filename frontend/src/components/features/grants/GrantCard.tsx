"use client";

import React, { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, truncateText } from '@/utils/formatters';
import ActionButton from '@/components/features/grants/ActionButton';
import GrantCardIcons from '@/components/features/grants/GrantCardIcons';
import GrantCardFooter from '@/components/features/grants/GrantCardFooter';
import { useInteractions } from '@/contexts/InteractionContext';
import { InteractionStatus } from '@/types/interaction';

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
  onSave?: (status: InteractionStatus | null) => void;
  onApply?: (status: InteractionStatus | 'pending' | null) => void;
  onShare?: () => void;
  onIgnore?: (status: InteractionStatus | null) => void;
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
  const { getInteractionStatus } = useInteractions();
  
  // Use the InteractionContext to get the current status
  const interactionStatus = getInteractionStatus(id);
  
  // Use the context status if provided, otherwise fall back to props
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
    if (enableFadeAnimation) {
      setFading(true);
      // Wait for fade animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));
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
    // If already applied, toggle the status
    if (isAppliedCurrent) {
      onApply?.(null);
      return;
    }
    
    // Open the application link in a new tab
    // Use source_url if available, otherwise fall back to grants.gov with opportunity ID
    const applyUrl = sourceUrl || 
      (opportunityId ? `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${opportunityId}` : 
       `https://www.grants.gov/search-results.html?keywords=${encodeURIComponent(title)}`);
    
    window.open(applyUrl, '_blank');
    
    // Signal to parent that apply was clicked but don't mark as applied yet
    // Parent should track this and show confirmation when user returns
    onApply?.('pending');
  }, [sourceUrl, opportunityId, title, isAppliedCurrent, onApply]);

  const handleSaveClick = useCallback(() => {
    // Toggle the saved status
    const newStatus = isSavedCurrent ? null : 'saved';
    onSave?.(newStatus);
  }, [id, isSavedCurrent, onSave]);

  const handleIgnoreClick = useCallback(() => {
    // Toggle the ignored status
    const newStatus = isIgnoredCurrent ? null : 'ignored';
    onIgnore?.(newStatus);
  }, [id, isIgnoredCurrent, onIgnore]);

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