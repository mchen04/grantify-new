import React, { useState, useEffect, useCallback } from 'react';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSubmit: (e: React.FormEvent, searchValue?: string) => void;
  isSearching?: boolean;
}

// Popular search terms - moved outside component to avoid recreation
const popularSearchTerms = ["Research grants", "Healthcare funding", "Education grants", "Nonprofit funding", "SBIR grants", "Community grants", "Environmental grants", "Technology funding"];

const SearchBar: React.FC<SearchBarProps> = React.memo(({
  searchTerm,
  setSearchTerm,
  onSubmit,
  isSearching = false
}) => {
  // Local state for immediate UI updates
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Update localSearchTerm when searchTerm prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Memoize popular search handler
  const handlePopularSearch = useCallback((term: string) => {
    const value = term.toLowerCase();
    setLocalSearchTerm(value);
    setSearchTerm(value); // Immediate update for popular search
    // Trigger form submit to execute search with the value
    onSubmit(null as any, value);
  }, [setSearchTerm, onSubmit]);

  return (
    <div className="pt-8 pb-4 px-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
          Search Grants & Foundation Funding
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Comprehensive search across multiple funding sources
        </p>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        // Use the ref value as primary source, fallback to local state
        const currentValue = inputRef.current?.value ?? localSearchTerm;
        // Small timeout to ensure all state updates are processed
        setTimeout(() => {
          try {
            onSubmit(e, currentValue);
          } catch (error) {
            if (error instanceof Event) {
              
            } else {
              
            }
          }
        }, 0);
      }} className="max-w-2xl mx-auto">
        <div className="relative flex items-center">
          {/* Search icon */}
          <div className="absolute left-4 text-gray-400">
            {isSearching ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )}
          </div>

          {/* Search input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search grants: e.g., cancer research, nonprofit, SBIR, education..."
            className="w-full py-3 pl-12 pr-20 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={localSearchTerm}
            onChange={(e) => {
              const value = e.target.value;
              setLocalSearchTerm(value); // Update local state immediately
              setSearchTerm(value); // Update parent state immediately (no search triggered)
            }}
          />

          {/* Search button */}
          <button
            type="submit"
            disabled={isSearching}
            className={`absolute right-1.5 text-white font-medium py-2 px-4 rounded-full transition-colors flex items-center gap-2 ${
              isSearching 
                ? 'bg-primary-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSearching && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Popular searches */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
          <span>Popular searches:</span>
          {popularSearchTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => handlePopularSearch(term)}
              className="hover:text-primary-600 hover:underline transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;