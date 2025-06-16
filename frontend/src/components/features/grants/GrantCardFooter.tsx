"use client";

import React from 'react';
import { calculateDaysRemaining, getDeadlineColorClass } from '@/utils/formatters';

interface GrantCardFooterProps {
  categories: string[];
  closeDate: string | null;
}

/**
 * Footer component for grant cards showing categories and deadline
 */
const GrantCardFooter: React.FC<GrantCardFooterProps> = ({
  categories,
  closeDate
}) => {
  const daysRemaining = calculateDaysRemaining(closeDate);
  const deadlineColorClass = getDeadlineColorClass(daysRemaining);

  return (
    <div className="mt-auto">
      {/* Categories */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.75rem]">
        {categories?.slice(0, 3).map((category, index) => (
          <span key={index} className="grant-tag text-xs px-2 py-0.5">
            {category}
          </span>
        ))}
        {categories?.length > 3 && (
          <span className="text-xs text-gray-500">
            +{Math.max(0, (categories.length || 0) - 3)} more
          </span>
        )}
      </div>

      {/* Deadline */}
      <div className="flex items-center text-sm h-5">
        <span className="text-gray-500">Deadline:</span>
        <span className={`ml-1.5 ${deadlineColorClass}`}>
          {daysRemaining !== null && Number.isFinite(daysRemaining) && !Number.isNaN(daysRemaining) ? `${daysRemaining} days left` : 'Open-ended'}
        </span>
      </div>
    </div>
  );
};

export default GrantCardFooter;