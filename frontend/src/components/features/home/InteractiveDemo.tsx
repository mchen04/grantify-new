"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Grant } from '@/shared/types/grant';
import supabaseApiClient from '@/lib/supabaseApiClient';

const SearchIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DollarIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function InteractiveDemo() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [typingIndex, setTypingIndex] = useState(0);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const demoQuery = "cancer research";

  // Clear cache and reset state on mount
  useEffect(() => {
    // Reset all state on mount
    setSearchQuery('');
    setIsSearching(false);
    setShowResults(false);
    setTypingIndex(0);
    setGrants([]);
    setSelectedGrant(null);
    setError(null);
    setHasSearched(false);
    
    // Clear browser caches
    if (typeof window !== 'undefined' && 'caches' in window) {
      // Clear API cache to ensure fresh results
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('api') || name.includes('grantify')) {
            caches.delete(name);
            
          }
        });
      });
    }
    
    // Clear sessionStorage and localStorage caches
    if (typeof window !== 'undefined') {
      // Remove any cached API responses
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('grant') || key.includes('api'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
    
    return () => {
      // Cleanup on unmount
      setHasSearched(false);
    };
  }, []);

  // Auto-type effect
  useEffect(() => {
    if (typingIndex < demoQuery.length) {
      const timer = setTimeout(() => {
        setSearchQuery(demoQuery.substring(0, typingIndex + 1));
        setTypingIndex(typingIndex + 1);
      }, 50);
      return () => clearTimeout(timer);
    } else if (typingIndex === demoQuery.length && !showResults && !hasSearched) {
      // Auto-search after typing completes (only once)
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [typingIndex, showResults, hasSearched]);

  const handleSearch = async () => {
    setIsSearching(true);
    setShowResults(false);
    setError(null);
    setGrants([]);
    setHasSearched(true);
    
    try {
      // Search grants using Supabase API
      const { data, error } = await supabaseApiClient.grants.searchGrants(demoQuery, { limit: 10 });
      
      if (error) {
        throw new Error(error);
      }
      
      // Get the first 5 grants for demo
      const finalGrants = (data?.grants || []).slice(0, 5) as Grant[];
      
      // Simulate AI processing time for demo effect
      setTimeout(() => {
        setGrants(finalGrants);
        setIsSearching(false);
        setShowResults(true);
      }, 2000);
    } catch (err) {
      
      
      // Fallback to regular keyword search if semantic search fails
      try {
        
        const fallbackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/grants?search=${encodeURIComponent(demoQuery)}&limit=10&sort_by=relevance&_t=${Date.now()}&_r=${Math.random()}&_nocache=true`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          cache: 'no-store'
        });
        
        const fallbackData = await fallbackResponse.json();
        
        if (!fallbackResponse.ok || fallbackData.error) {
          throw new Error(fallbackData.error || 'Fallback search failed');
        }
        
        const fallbackGrants = (fallbackData.grants || []) as Grant[];
        
        
        // If we still don't have 5 results, try to get more with a broader search
        if (fallbackGrants.length < 5) {
          
          const additionalUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/grants?limit=${10}&sort_by=recent&_t=${Date.now()}&_r=${Math.random()}&_nocache=true`;
          
          const additionalResponse = await fetch(additionalUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
          });
          
          const additionalData = await additionalResponse.json();
          
          if (additionalResponse.ok && additionalData.grants) {
            const additionalGrants = (additionalData.grants || []) as Grant[];
            // Combine grants, avoiding duplicates
            const grantIds = new Set(fallbackGrants.map(g => g.id));
            const uniqueAdditionalGrants = additionalGrants.filter(g => !grantIds.has(g.id));
            fallbackGrants.push(...uniqueAdditionalGrants.slice(0, 5 - fallbackGrants.length));
          }
        }
        
        setTimeout(() => {
          setGrants(fallbackGrants.slice(0, 5)); // Ensure max 5 grants
          setIsSearching(false);
          setShowResults(true);
        }, 2000);
      } catch (fallbackErr) {
        
        setError('Failed to fetch grants. Please try again.');
        setIsSearching(false);
        setShowResults(true);
      }
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setShowResults(false);
    setTypingIndex(0);
    setSelectedGrant(null);
    setGrants([]);
    setError(null);
    setHasSearched(false);
  };
  
  // Helper function to format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'Amount not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Helper function to format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-8 shadow-xl">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            readOnly
            placeholder="Search for grants..."
            className="w-full px-6 py-4 pr-32 text-lg border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {showResults ? (
              <Button
                onClick={handleReset}
                size="sm"
                variant="secondary"
              >
                Try Again
              </Button>
            ) : (
              <Button
                onClick={handleSearch}
                disabled={isSearching || typingIndex < demoQuery.length}
                size="sm"
                className="min-w-[100px]"
              >
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">•</span>
                    Searching...
                  </span>
                ) : (
                  <>
                    <SearchIcon className="w-4 h-4 mr-1" />
                    Search
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Search Progress */}
        {isSearching && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="animate-pulse">•</span> Using AI to search across all grants...
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="animate-pulse">•</span> Finding grants semantically similar to "cancer research"...
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="animate-pulse">•</span> Ranking by AI similarity scores...
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-4 animate-fadeIn">
          {error ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg">
              <p>{error}</p>
              <Button onClick={handleReset} size="sm" variant="secondary" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Found {grants.length} Grants
                </h3>
                {grants.length > 0 && (
                  <Badge variant="success">
                    <CheckIcon className="w-4 h-4 mr-1" />
                    Live Data
                  </Badge>
                )}
              </div>
              
              {grants.length === 0 ? (
                <div className="bg-white rounded-lg p-8 border-2 border-gray-200 text-center">
                  <p className="text-gray-600">No grants found. Try a different search term.</p>
                </div>
              ) : (
                grants.slice(0, 5).map((grant, index) => (
                  <div
                    key={grant.id}
                    className={`bg-white rounded-lg p-6 border-2 transition-all cursor-pointer hover:shadow-lg ${
                      selectedGrant?.id === grant.id ? 'border-primary-500' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedGrant(grant)}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'slideIn 0.5s ease-out forwards',
                      opacity: 0
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                          {grant.title || 'Untitled Grant'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {grant.funding_organization_name || 'Unknown Agency'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 mb-1">
                          <DollarIcon className="w-4 h-4 text-green-600" />
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(grant.funding_amount_max)}
                          </p>
                        </div>
                        {((grant as any).similarity_score || (grant as any).match_score || index < 3) && (
                          <Badge variant="primary" className="text-xs">
                            {(grant as any).similarity_score || (grant as any).match_score 
                              ? `${Math.round(((grant as any).similarity_score || (grant as any).match_score || 0) * 100)}% Match`
                              : 'Related'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {grant.summary || grant.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                        <span className={grant.application_deadline ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatDate(grant.application_deadline)}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        href={`/grants/${grant.id}`}
                      >
                        View Details →
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              <div className="mt-6 p-4 bg-primary-50 rounded-lg text-center">
                <p className="text-primary-900 font-medium">
                  {grants.length > 0 
                    ? 'These are real grants from our database. Try the full search for more!'
                    : 'This is a live demo. Try the full search to find grants!'}
                </p>
                <Button href="/search" size="md" className="mt-3">
                  Try Full Search →
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}