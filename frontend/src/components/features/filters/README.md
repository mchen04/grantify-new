# Filter Components Documentation

This directory contains the optimized grant filtering system components for Grantify.ai.

## Overview

The filter system has been streamlined from 20+ filters to 6 effective filters with inclusive data handling to ensure no grants are excluded due to missing data.

## Components

### CompactAdvancedFilterPanel.tsx
**Main filter container component**

Features:
- Streamlined 6-filter interface
- Inclusive data handling with "Show All" options
- Real-time filter count display
- Data coverage warnings for filters with limited data
- Optimized for mobile and desktop

**Recent Updates (v1.3.0):**
- Fixed currency filter bug (unchecking now works correctly)
- Removed ineffective filters (cost sharing, featured, applicant types)
- Added data coverage indicators
- Simplified UI with cleaner layout

### FundingRangeFilter.tsx
**Funding amount range selector**

Features:
- Interactive dual-range slider
- Preset funding ranges (Any, Under $50K, $50K-$100K, etc.)
- "Include grants without funding data" option
- 8% data coverage (308/3,874 grants have funding data)

**Props:**
```typescript
interface FundingRangeFilterProps {
  fundingMin?: number;
  fundingMax?: number;
  includeFundingNull: boolean;
  setFundingMin: (value: number | undefined) => void;
  setFundingMax: (value: number | undefined) => void;
  handleFundingOptionChange: (option: 'include', checked: boolean) => void;
}
```

### DeadlineFilter.tsx
**Application deadline selector**

Features:
- Interactive dual-range slider for deadline dates
- Preset ranges (Any, Overdue, Next 7 days, Next 30 days, etc.)
- "Include grants without deadlines" option
- 46% data coverage (1,777/3,874 grants have deadlines)

**Props:**
```typescript
interface DeadlineFilterProps {
  deadlineMinDays?: number;
  deadlineMaxDays?: number;
  includeNoDeadline?: boolean;
  showOverdue?: boolean;
  onChange: (changes: any) => void;
}
```

### ActiveFilters.tsx
**Display active filters with clear buttons**

Features:
- Shows currently applied filters
- Individual filter clear buttons
- "Clear all" functionality
- Count of active filters

## Filter Logic

### Inclusive Data Handling
All filters now include options to show grants without data in that field:

- **Geographic Scope**: `includeNoGeographicScope` (default: true)
- **Currency**: `includeNoCurrency` (default: true)  
- **Funding**: `includeFundingNull` (default: true)
- **Deadline**: `includeNoDeadline` (default: true)

### API Mapping
Filters are mapped to API parameters in `filterMapping.ts`:

```typescript
// Geographic filters
if (filter.geographic_scope) {
  apiFilters.geographic_scope = filter.geographic_scope;
}
if (filter.includeNoGeographicScope !== undefined) {
  apiFilters.include_no_geographic_scope = filter.includeNoGeographicScope;
}

// Currency filters
if (filter.currencies !== undefined) {
  if (filter.currencies.length > 0) {
    apiFilters.currency = filter.currencies;
  } else {
    apiFilters.currency = ['NONE'];
  }
}
if (filter.includeNoCurrency !== undefined) {
  apiFilters.include_no_currency = filter.includeNoCurrency;
}
```

### Default Filter State
Optimized defaults ensure users see relevant grants:

```typescript
export const DEFAULT_FILTER_STATE: Partial<GrantFilter> = {
  statuses: ['active', 'forecasted'], // 84% of grants
  currencies: undefined, // Show all currencies
  includeNoCurrency: true, // Include grants without currency
  geographic_scope: undefined, // Show all locations
  includeNoGeographicScope: true, // Include grants without location
  includeFundingNull: true, // Include grants without funding data
  includeNoDeadline: true, // Include grants without deadlines
};
```

## Data Coverage Statistics

Based on real database analysis of 3,874 grants:

| Filter | Coverage | Grants with Data | Grants without Data |
|--------|----------|------------------|-------------------|
| **Funding Amount** | 8% | 308 | 3,566 |
| **Currency** | 26% | 1,000 | 2,874 |
| **Deadline** | 46% | 1,777 | 2,097 |
| **Geographic Scope** | 93% | 3,594 | 280 |
| **Grant Status** | 100% | 3,874 | 0 |
| **Posted Date** | 100% | 3,874 | 0 |

## Usage Examples

### Basic Filter Setup
```typescript
<CompactAdvancedFilterPanel
  filters={filters}
  onFilterChange={handleFilterChange}
  onApply={handleApply}
  availableOptions={availableOptions}
  isLoading={isLoading}
/>
```

### Custom Funding Filter
```typescript
<FundingRangeFilter
  fundingMin={filters.fundingMin}
  fundingMax={filters.fundingMax}
  includeFundingNull={filters.includeFundingNull ?? true}
  setFundingMin={(value) => setFilters({...filters, fundingMin: value})}
  setFundingMax={(value) => setFilters({...filters, fundingMax: value})}
  handleFundingOptionChange={(option, checked) => {
    setFilters({...filters, includeFundingNull: checked});
  }}
/>
```

## Testing

The filter system has been comprehensively tested:
- **96 test scenarios** covering all filter combinations
- **100% pass rate** achieved
- **Edge case handling** for undefined vs empty arrays
- **Data coverage validation** for all filters

## Accessibility

All filter components include:
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader announcements
- High contrast mode support
- Focus management

## Performance

Optimizations include:
- Debounced API calls (300ms delay)
- Memoized filter state
- Optimistic UI updates
- Batch filter application