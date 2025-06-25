"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { GrantFilter, SelectOption } from '@/types/grant';

// Import directly without dynamic loading to ensure it renders properly
import CompactAdvancedFilterPanel from '@/components/features/filters/CompactAdvancedFilterPanel';

const ActiveFilters = dynamic(
  () => import('@/components/features/filters/ActiveFilters'),
  { 
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-gray-100 h-8 rounded-md mb-4" />
    )
  }
);

interface SearchFiltersProps {
  filters: GrantFilter;
  agencies: SelectOption[];
  categories: SelectOption[];
  onFiltersChange: (filters: GrantFilter) => void;
  onClearFilters: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  agencies,
  categories,
  onFiltersChange,
  onClearFilters
}) => {
  const handleFilterChange = (partialFilters: Partial<GrantFilter>) => {
    onFiltersChange({ ...filters, ...partialFilters });
  };

  return (
    <div className="space-y-4">
      <ActiveFilters 
        filter={filters}
      />
      
      <CompactAdvancedFilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={() => {}}
        availableOptions={{
          agencies: agencies?.map(a => a.value) || [],
          activityCategories: categories?.map(c => c.value) || []
        }}
      />
    </div>
  );
};

export default React.memo(SearchFilters);