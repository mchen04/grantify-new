import React from 'react';
import { SelectOption } from '@/types/grant';

interface CheckboxGridProps {
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label: string;
  columns?: number;
  maxHeight?: string;
}

const CheckboxGrid: React.FC<CheckboxGridProps> = ({
  options,
  selectedValues,
  onChange,
  label,
  columns = 3,
  maxHeight = '200px'
}) => {
  const safeSelectedValues = selectedValues || [];

  const toggleSelection = (value: string) => {
    const newValues = safeSelectedValues.includes(value)
      ? safeSelectedValues.filter(item => item !== value)
      : [...safeSelectedValues, value];
    onChange(newValues);
  };


  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      </div>
      
      <div 
        className="border border-gray-200 rounded-md p-3 overflow-y-auto"
        style={{ maxHeight }}
      >
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${Math.min(columns, Math.ceil(options.length / 10))}, 1fr)` 
          }}
        >
          {options.map(option => (
            <label 
              key={option.value} 
              className="flex items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={safeSelectedValues.includes(option.value)}
                onChange={() => toggleSelection(option.value)}
                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2 flex-shrink-0"
              />
              <span className="text-gray-700 truncate" title={option.label}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {safeSelectedValues.length > 0 && (
        <div className="text-xs text-gray-500">
          {safeSelectedValues.length} selected
        </div>
      )}
    </div>
  );
};

export default React.memo(CheckboxGrid);