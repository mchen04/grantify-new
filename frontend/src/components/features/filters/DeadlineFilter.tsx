import React, { useRef, useEffect, useState, useMemo } from 'react';
import { debounce } from '@/utils/debounce';
import { MIN_DEADLINE_DAYS, MAX_DEADLINE_DAYS } from '@/utils/constants';

interface DeadlineFilterProps {
  deadlineMinDays?: number;
  deadlineMaxDays?: number;
  includeNoDeadline?: boolean;
  onlyNoDeadline?: boolean;
  showOverdue?: boolean;
  onChange: (changes: any) => void;
}

/**
 * Simplified deadline filter component
 */
const DeadlineFilter: React.FC<DeadlineFilterProps> = React.memo(({
  deadlineMinDays = MIN_DEADLINE_DAYS,
  deadlineMaxDays = MAX_DEADLINE_DAYS,
  includeNoDeadline = false,
  onlyNoDeadline = false,
  showOverdue = false,
  onChange
}) => {
  const rangeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [localDeadlineMinDays, setLocalDeadlineMinDays] = useState(deadlineMinDays);
  const [localDeadlineMaxDays, setLocalDeadlineMaxDays] = useState(deadlineMaxDays);
  
  // Create debounced versions of the setters
  const debouncedSetDeadlineMinDays = useMemo(
    () => debounce(((value: number) => {
      onChange({ deadlineMinDays: value });
    }) as (...args: unknown[]) => unknown, 300),
    [onChange]
  );
  
  const debouncedSetDeadlineMaxDays = useMemo(
    () => debounce(((value: number) => {
      onChange({ deadlineMaxDays: value });
    }) as (...args: unknown[]) => unknown, 300),
    [onChange]
  );
  
  // Update local state when props change (e.g., from preset buttons)
  useEffect(() => {
    setLocalDeadlineMinDays(deadlineMinDays);
  }, [deadlineMinDays]);
  
  useEffect(() => {
    setLocalDeadlineMaxDays(deadlineMaxDays);
  }, [deadlineMaxDays]);

  // Format the deadline display text
  const formatDeadlineText = (days: number) => {
    if (days === MAX_DEADLINE_DAYS) {
      return "1 year+";
    } else if (days === MIN_DEADLINE_DAYS) {
      return "90+ days overdue";
    } else if (days === 0) {
      return "Today";
    } else if (days < 0) {
      const overdueDays = Math.abs(days);
      if (overdueDays <= 7) {
        return `${overdueDays} days overdue`;
      } else if (overdueDays <= 30) {
        return `${Math.ceil(overdueDays / 7)} weeks overdue`;
      } else {
        return `${Math.ceil(overdueDays / 30)} months overdue`;
      }
    } else if (days === 1) {
      return "1 day";
    } else if (days === 7) {
      return "1 week";
    } else if (days === 30) {
      return "1 month";
    } else if (days === 90) {
      return "3 months";
    } else if (days === 180) {
      return "6 months";
    } else if (days <= 7) {
      return `${days} days`;
    } else if (days <= 60) {
      return `${Math.ceil(days / 7)} weeks`;
    } else {
      return `${Math.ceil(days / 30)} months`;
    }
  };

  // Calculate percentage for positioning handles
  const minPercentage = ((localDeadlineMinDays - MIN_DEADLINE_DAYS) / (MAX_DEADLINE_DAYS - MIN_DEADLINE_DAYS)) * 100;
  const maxPercentage = ((localDeadlineMaxDays - MIN_DEADLINE_DAYS) / (MAX_DEADLINE_DAYS - MIN_DEADLINE_DAYS)) * 100;

  // Handle mouse/touch events for slider interaction
  useEffect(() => {
    if (!isDragging || !rangeRef.current) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!rangeRef.current) return;
      
      const rect = rangeRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const offsetX = clientX - rect.left;
      const percentage = Math.min(Math.max(0, offsetX / rect.width), 1);
      const value = Math.round(MIN_DEADLINE_DAYS + percentage * (MAX_DEADLINE_DAYS - MIN_DEADLINE_DAYS));
      
      if (isDragging === 'min') {
        const newMinValue = Math.min(value, localDeadlineMaxDays);
        setLocalDeadlineMinDays(newMinValue);
        debouncedSetDeadlineMinDays(newMinValue);
      } else if (isDragging === 'max') {
        const newMaxValue = Math.max(value, localDeadlineMinDays);
        setLocalDeadlineMaxDays(newMaxValue);
        debouncedSetDeadlineMaxDays(newMaxValue);
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
  }, [isDragging, localDeadlineMinDays, localDeadlineMaxDays, debouncedSetDeadlineMinDays, debouncedSetDeadlineMaxDays]);

  // Predefined deadline ranges for quick selection - consistent with global presets
  const deadlinePresets = [
    { label: "Any", min: MIN_DEADLINE_DAYS, max: MAX_DEADLINE_DAYS },
    { label: "Overdue", min: MIN_DEADLINE_DAYS, max: -1 },
    { label: "Next 7 days", min: 0, max: 7 },
    { label: "Next 30 days", min: 0, max: 30 },
    { label: "Next 3 months", min: 0, max: 90 },
    { label: "Next 6 months", min: 0, max: 180 },
    { label: "This year", min: 0, max: 365 },
  ];

  return (
    <div>
      <label className="form-label">
        Deadline Range: {formatDeadlineText(localDeadlineMinDays)} - {formatDeadlineText(localDeadlineMaxDays)}
      </label>
      
      {/* Quick deadline range selection */}
      <div className="flex flex-wrap gap-2 mb-4">
        {deadlinePresets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              if (preset.label === "Any") {
                // For "Any", set to full range but with no actual date filters
                setLocalDeadlineMinDays(preset.min);
                setLocalDeadlineMaxDays(preset.max);
                onChange({ 
                  includeNoDeadline: true,
                  onlyNoDeadline: false,
                  showOverdue: true, // "Any" should include overdue grants
                  // Don't set deadline date filters for "Any" - let backend include all
                  deadlineMinDays: undefined,
                  deadlineMaxDays: undefined
                });
              } else {
                // Update both local and parent state immediately for preset buttons
                setLocalDeadlineMinDays(preset.min);
                setLocalDeadlineMaxDays(preset.max);
                onChange({ 
                  deadlineMinDays: preset.min,
                  deadlineMaxDays: preset.max
                });
              }
            }}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              localDeadlineMinDays === preset.min && localDeadlineMaxDays === preset.max
                ? 'bg-primary-100 text-primary-800 font-medium'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            disabled={onlyNoDeadline}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Slider */}
      <div className={`mt-2 px-2 ${onlyNoDeadline ? 'opacity-50' : ''}`}>
        <div
          ref={rangeRef}
          className="relative w-full h-2 bg-gray-200 rounded-lg"
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
            className={`absolute w-4 h-4 bg-white border-2 border-primary-500 rounded-full -mt-1 -ml-2 cursor-pointer shadow-md ${onlyNoDeadline ? 'cursor-not-allowed' : ''}`}
            style={{ left: `${minPercentage}%` }}
            onMouseDown={() => !onlyNoDeadline && setIsDragging('min')}
            onTouchStart={() => !onlyNoDeadline && setIsDragging('min')}
            role="slider"
            aria-valuemin={MIN_DEADLINE_DAYS}
            aria-valuemax={MAX_DEADLINE_DAYS}
            aria-valuenow={localDeadlineMinDays}
            aria-label="Minimum deadline days"
            tabIndex={0}
          />
          
          {/* Maximum handle */}
          <div
            className={`absolute w-4 h-4 bg-white border-2 border-primary-500 rounded-full -mt-1 -ml-2 cursor-pointer shadow-md ${onlyNoDeadline ? 'cursor-not-allowed' : ''}`}
            style={{ left: `${maxPercentage}%` }}
            onMouseDown={() => !onlyNoDeadline && setIsDragging('max')}
            onTouchStart={() => !onlyNoDeadline && setIsDragging('max')}
            role="slider"
            aria-valuemin={MIN_DEADLINE_DAYS}
            aria-valuemax={MAX_DEADLINE_DAYS}
            aria-valuenow={localDeadlineMaxDays}
            aria-label="Maximum deadline days"
            tabIndex={0}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>90d overdue</span>
          <span>1 year</span>
        </div>
      </div>
      
      {/* Checkboxes */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="include-no-deadline"
            checked={includeNoDeadline}
            onChange={(e) => onChange({ includeNoDeadline: e.target.checked })}
            disabled={onlyNoDeadline}
            className="form-checkbox"
          />
          <label htmlFor="include-no-deadline" className="ml-2 block text-sm text-gray-700">
            Include grants with unspecified deadline
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="only-no-deadline"
            checked={onlyNoDeadline}
            onChange={(e) => onChange({ onlyNoDeadline: e.target.checked })}
            className="form-checkbox"
          />
          <label htmlFor="only-no-deadline" className="ml-2 block text-sm text-gray-700">
            Only show grants with unspecified deadline
          </label>
        </div>
      </div>
    </div>
  );
});

DeadlineFilter.displayName = 'DeadlineFilter';

export default DeadlineFilter;