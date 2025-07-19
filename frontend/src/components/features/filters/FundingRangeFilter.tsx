import React, { useRef, useEffect, useState, useMemo } from 'react';
import { debounce } from '@/utils/debounce';
import { MAX_FUNDING } from '@/shared/constants/app';

interface FundingRangeFilterProps {
  fundingMin?: number;
  fundingMax?: number;
  includeFundingNull: boolean;
  setFundingMin: (value: number | undefined) => void;
  setFundingMax: (value: number | undefined) => void;
  handleFundingOptionChange: (option: 'include', checked: boolean) => void;
}

/**
 * Simplified funding range filter component
 */
const FundingRangeFilter: React.FC<FundingRangeFilterProps> = React.memo(({
  fundingMin,
  fundingMax,
  includeFundingNull,
  setFundingMin,
  setFundingMax,
  handleFundingOptionChange
}) => {
  // Use default values for display when undefined (means no filter applied)
  const displayFundingMin = fundingMin ?? 0;
  const displayFundingMax = fundingMax ?? MAX_FUNDING;
  const rangeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [localFundingMin, setLocalFundingMin] = useState(displayFundingMin);
  const [localFundingMax, setLocalFundingMax] = useState(displayFundingMax);
  
  // Create debounced versions of the setters
  const debouncedSetFundingMin = useMemo(
    () => debounce(((value: number) => {
      setFundingMin(value);
    }) as (...args: unknown[]) => unknown, 300),
    [setFundingMin]
  );
  
  const debouncedSetFundingMax = useMemo(
    () => debounce(((value: number) => {
      setFundingMax(value);
    }) as (...args: unknown[]) => unknown, 300),
    [setFundingMax]
  );
  
  // Update local state when props change (e.g., from preset buttons)
  useEffect(() => {
    setLocalFundingMin(displayFundingMin);
  }, [displayFundingMin]);
  
  useEffect(() => {
    setLocalFundingMax(displayFundingMax);
  }, [displayFundingMax]);
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount === MAX_FUNDING) {
      return "$100M+";
    }
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(0)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate percentage for positioning handles
  const minPercentage = (localFundingMin / MAX_FUNDING) * 100;
  const maxPercentage = (localFundingMax / MAX_FUNDING) * 100;

  // Handle mouse/touch events for slider interaction
  useEffect(() => {
    if (!isDragging || !rangeRef.current) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!rangeRef.current) return;
      
      const rect = rangeRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const offsetX = clientX - rect.left;
      const percentage = Math.min(Math.max(0, offsetX / rect.width), 1);
      
      // Round to nearest step (1M for amounts over 10M, 100K for amounts under 10M)
      let value = percentage * MAX_FUNDING;
      if (value > 10000000) {
        value = Math.round(value / 1000000) * 1000000;
      } else {
        value = Math.round(value / 100000) * 100000;
      }
      
      if (isDragging === 'min') {
        const newMinValue = Math.min(value, localFundingMax);
        setLocalFundingMin(newMinValue);
        debouncedSetFundingMin(newMinValue);
      } else if (isDragging === 'max') {
        const newMaxValue = Math.max(value, localFundingMin);
        setLocalFundingMax(newMaxValue);
        debouncedSetFundingMax(newMaxValue);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, localFundingMin, localFundingMax, debouncedSetFundingMin, debouncedSetFundingMax]);

  // Predefined funding ranges for quick selection
  const fundingPresets = [
    { label: "Any", min: 0, max: MAX_FUNDING },
    { label: "Under $50K", min: 0, max: 50000 },
    { label: "$50K-$100K", min: 50000, max: 100000 },
    { label: "$100K-$500K", min: 100000, max: 500000 },
    { label: "$500K-$1M", min: 500000, max: 1000000 },
    { label: "$1M-$5M", min: 1000000, max: 5000000 },
    { label: "$5M-$10M", min: 5000000, max: 10000000 },
    { label: "$10M+", min: 10000000, max: MAX_FUNDING }
  ];

  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">
        {fundingMin === undefined && fundingMax === undefined 
          ? 'Any Amount'
          : `$${formatCurrency(localFundingMin)} - $${formatCurrency(localFundingMax)}`
        }
      </div>
      
      {/* Quick funding range selection */}
      <div className="flex flex-wrap gap-1 mb-2">
        {fundingPresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              // Update both local and parent state immediately for preset buttons
              if (preset.label === "Any") {
                // For "Any", clear funding filters entirely
                setLocalFundingMin(preset.min);
                setLocalFundingMax(preset.max);
                setFundingMin(undefined);
                setFundingMax(undefined);
                handleFundingOptionChange('include', true);
              } else {
                // For other presets, set specific values
                setLocalFundingMin(preset.min);
                setLocalFundingMax(preset.max);
                setFundingMin(preset.min);
                setFundingMax(preset.max);
              }
            }}
            className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
              (preset.label === "Any" && fundingMin === undefined && fundingMax === undefined) ||
              (preset.label !== "Any" && localFundingMin === preset.min && localFundingMax === preset.max && fundingMin === preset.min && fundingMax === preset.max)
                ? 'bg-primary-100 text-primary-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Slider */}
      <div>
        <div
          ref={rangeRef}
          className="relative w-full h-1.5 bg-gray-200 rounded-lg"
        >
          {/* Selected range highlight */}
          <div
            className="absolute h-full bg-primary-500 rounded-lg"
            style={{
              left: `${minPercentage}%`,
              width: `${maxPercentage - minPercentage}%`
            }}
          />
          
          {/* Minimum handle */}
          <div
            className="absolute w-3 h-3 bg-white border-2 border-primary-500 rounded-full -mt-0.5 -ml-1.5 cursor-pointer shadow-sm"
            style={{ left: `${minPercentage}%` }}
            onMouseDown={() => setIsDragging('min')}
            onTouchStart={() => setIsDragging('min')}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={MAX_FUNDING}
            aria-valuenow={fundingMin}
            aria-label="Minimum funding amount"
            tabIndex={0}
          />
          
          {/* Maximum handle */}
          <div
            className="absolute w-3 h-3 bg-white border-2 border-primary-500 rounded-full -mt-0.5 -ml-1.5 cursor-pointer shadow-sm"
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={() => setIsDragging('max')}
            onTouchStart={() => setIsDragging('max')}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={MAX_FUNDING}
            aria-valuenow={fundingMax}
            aria-label="Maximum funding amount"
            tabIndex={0}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>$0</span>
          <span>$100M+</span>
        </div>
      </div>
      
      {/* Checkboxes */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="include-no-funding"
            checked={includeFundingNull}
            onChange={(e) => handleFundingOptionChange('include', e.target.checked)}
            className="form-checkbox h-3 w-3"
          />
          <label htmlFor="include-no-funding" className="ml-1.5 text-xs text-gray-700">
            Include unspecified
          </label>
        </div>
      </div>
    </div>
  );
});

FundingRangeFilter.displayName = 'FundingRangeFilter';

export default FundingRangeFilter;