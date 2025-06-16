"use client";

import React, { useEffect, useState, use, Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useInteractions } from '@/contexts/InteractionContext';
import { fetchSimilarGrants, formatSimilarGrant } from '@/lib/similarGrants';
import { parseTextWithLinks } from '@/utils/formatters';
import { Grant, GrantContact } from '@/types/grant';
import { UserInteraction as Interaction, InteractionStatus } from '@/types/interaction';
import GoogleAdSense from '@/components/ui/GoogleAdSense';
import { ADSENSE_CONFIG } from '@/lib/config';

// Icon components
type IconProps = { className?: string };

const CheckCircle2 = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Calendar = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DollarSign = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const Users = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const Phone = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const Mail = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ExternalLink = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const Bookmark = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const Share2 = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const X = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const AlertCircle = ({ className = "w-12 h-12" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Building2 = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const FileText = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const Award = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const ArrowUpRight = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7m10 0v10" />
  </svg>
);

const ChevronRight = ({ className = "w-4 h-4" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const User = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Similar grant type
interface SimilarGrant {
  id: string;
  title: string;
  agency: string;
  deadline: string;
}

// Contact Card Component
const ContactCard: React.FC<{ contact: GrantContact }> = ({ contact }) => {
  return (
    <div className="space-y-3">
      {/* Contact Type Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
        <h3 className="text-sm font-semibold text-gray-900 capitalize">
          {contact.contact_type.replace(/_/g, ' ')}
        </h3>
      </div>
      
      {/* Contact Details */}
      <div className="space-y-2">
        {contact.contact_name && (
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 text-sm">{contact.contact_name}</p>
              {contact.contact_role && (
                <p className="text-xs text-gray-600 mt-1">{contact.contact_role}</p>
              )}
              {contact.contact_organization && (
                <p className="text-xs text-gray-600 mt-1">{contact.contact_organization}</p>
              )}
            </div>
          </div>
        )}
        
        {contact.email && (
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a 
              href={`mailto:${contact.email}`} 
              className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline"
            >
              {contact.email}
            </a>
          </div>
        )}
        
        {contact.phone && (
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1 min-w-0 flex-1">
              {(() => {
                const phoneText = contact.phone.trim();
                const phoneNumbers = phoneText
                  .split(/[,;|]|\sand\s|\sor\s|\n|\r\n|\r/)
                  .map(phone => phone.trim())
                  .filter(phone => phone.length > 0)
                  .map(phone => phone.replace(/^[-\s]*/, '').replace(/[-\s]*$/, '').trim())
                  .filter(phone => phone.length > 0);
                
                if (phoneNumbers.length > 1) {
                  return (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 font-medium">
                        {phoneNumbers.length} phone numbers:
                      </p>
                      <div className="space-y-1">
                        {phoneNumbers.map((phone, phoneIndex) => (
                          <div key={phoneIndex} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <a 
                              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                              className="text-gray-700 hover:text-primary-600 transition-colors text-sm"
                            >
                              {phone}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <a 
                    href={`tel:${phoneNumbers[0]?.replace(/[^\d+]/g, '') || ''}`}
                    className="text-gray-700 hover:text-primary-600 transition-colors text-sm font-medium"
                  >
                    {phoneNumbers[0] || phoneText}
                  </a>
                );
              })()}
            </div>
          </div>
        )}
        
        {contact.url && (
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a
              href={contact.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline"
            >
              {contact.url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        
        {contact.notes && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-yellow-800 mb-1">Note</p>
                <p className="text-xs text-yellow-700 leading-relaxed">{contact.notes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Page params type for Next.js 15.1.7+
type PageParams = {
  grantId: string;
};

// Dynamically import ApplyConfirmationPopup component
const DynamicApplyConfirmationPopup = dynamic(
  () => import('@/components/features/grants/ApplyConfirmationPopup'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 animate-pulse">Loading...</div>
      </div>
    )
  }
);

export default function GrantDetail({ params }: { params: Promise<PageParams> }) {
  // Properly unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const grantId = unwrappedParams.grantId;
  const { user, session } = useAuth();
  const { getInteractionStatus, updateUserInteraction, lastInteractionTimestamp } = useInteractions();
  const searchParams = useSearchParams();
  const [grant, setGrant] = useState<Grant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interactionState, setInteractionState] = useState<InteractionStatus | null>(null);
  const [similarGrants, setSimilarGrants] = useState<SimilarGrant[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [fromSource, setFromSource] = useState<string | null>(null);
  const [tabSource, setTabSource] = useState<string | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showAllApplicants, setShowAllApplicants] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(false);
  
  // No ads on grant detail pages for better user experience
  const getAdaptiveAdCount = useCallback(() => {
    return 0; // No ads on grant detail pages
  }, []);
  
  // Fetch the grant data
  useEffect(() => {
    const fetchGrant = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the grant by ID using apiClient
        const { data, error } = await apiClient.grants.getGrantById(grantId);
        
        if (error) {
          setError(`Unable to load grant details: ${error}`);
          return;
        }
        
        if (!data) {
          setError('Grant not found');
          return;
        }
        
        setGrant(data.grant as Grant); // Correctly set the nested grant object
        
        // If user is logged in, get the interaction status from the context
        if (user) {
          const status = getInteractionStatus(grantId);
          setInteractionState(status || null);
          setInteractionLoading(false);
        }
        
        // Fetch similar grants
        setLoadingSimilar(true);
        try {
          const similarGrantsData = await fetchSimilarGrants(grantId, (data as any).activity_category, 3);
          if (Array.isArray(similarGrantsData)) {
            setSimilarGrants(similarGrantsData.map(formatSimilarGrant));
          } else {
            setSimilarGrants([]);
          }
        } catch (similarError) {
          // Don't block the UI - we can show the grant without similar grants
          setSimilarGrants([]);
        } finally {
          setLoadingSimilar(false);
        }
      } catch (error: any) {
        setError('Failed to load grant details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    // Get referral parameters from URL
    const from = searchParams.get('from');
    const tab = searchParams.get('tab');
    setFromSource(from);
    setTabSource(tab);
    
    fetchGrant();
  }, [grantId, user?.id]); // Reduced dependencies
  
  // Update the interaction state when the context changes
  useEffect(() => {
    if (user && grantId) {
      const status = getInteractionStatus(grantId);
      setInteractionState(status || null);
    }
  }, [lastInteractionTimestamp, grantId, user, getInteractionStatus]);
  
  // Handle user interactions (save, apply, ignore)
  const handleInteraction = async (action: InteractionStatus) => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }
    
    // Set loading state
    setInteractionLoading(true);
    
    // Determine if we're toggling the current status
    const isCurrentStatus = interactionState === action;
    const newStatus = isCurrentStatus ? null : action;
    
    try {
      // Use the InteractionContext to update the interaction
      await updateUserInteraction(grantId, newStatus);
    } catch (error: any) {
      // Could add toast notification here for user feedback
    } finally {
      setInteractionLoading(false);
    }
  };
  
  // Handle share button click
  const handleShare = async () => {
    if (!grant) return;
    
    const shareUrl = `${window.location.origin}/grants/${grantId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: grant.title,
          text: 'Check out this grant opportunity',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // Could add a toast notification here
      }
    } catch (error: any) {
      // Silently handle AbortError when user cancels share dialog
      if (error.name !== 'AbortError') {
        // Only copy to clipboard if it's not a cancel action
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch (clipboardError) {
        }
      }
    }
  };
  
  // Handle apply button click
  const handleApplyClick = () => {
    if (!user) {
      // Redirect to login
      // You could add this functionality here
      return;
    }
    
    // Open the grant link in a new tab using source_url from database or fallback to grants.gov
    if (grant) {
      const applyUrl = grant.source_url || `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${grant.opportunity_id}`;
      window.open(applyUrl, '_blank');
    }
    
    // Show confirmation popup
    setShowApplyConfirmation(true);
  };
  
  // Handle apply confirmation response
  const handleApplyConfirmation = (didApply: boolean) => {
    // Hide the popup
    setShowApplyConfirmation(false);
    
    // If user confirmed, mark as applied
    if (didApply) {
      // Use the InteractionContext to update the interaction
      updateUserInteraction(grantId, 'applied');
    }
    // If the user clicked "No", we don't need to do anything
  };
  
  // Format dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No deadline specified';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Calculate days remaining
  const getDaysRemaining = (closeDate: string | null | undefined) => {
    if (!closeDate) return null;
    
    const today = new Date();
    const closeDateObj = new Date(closeDate);
    const daysRemaining = Math.ceil((closeDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysRemaining;
  };
  
  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return 'Not specified';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Loading grant details...</p>
        </div>
      </Layout>
    );
  }
  
  // Show error state
  if (error || !grant) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-error-50 text-error-600 p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p>{error || 'Grant not found'}</p>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-error-800">If this problem persists, please try again later or contact support.</p>
              <div className="flex space-x-4 mt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-error-100 text-error-700 hover:bg-error-200 transition-colors"
                >
                  Try Again
                </button>
                <Link href="/search" className="px-4 py-2 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors">
                  Return to Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Calculate days remaining
  const daysRemaining = getDaysRemaining(grant.close_date);
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm mb-6">
          <ol className="list-none p-0 inline-flex items-center flex-wrap">
            {/* Home link - always first */}
            <li className="flex items-center">
              <Link href="/" className="text-gray-500 hover:text-primary-600 transition-colors">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            </li>
            
            {/* Conditional breadcrumb items based on source */}
            {fromSource === 'search' ? (
              <li className="flex items-center">
                <Link href="/search" className="text-gray-500 hover:text-primary-600 transition-colors">
                  Search
                </Link>
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              </li>
            ) : fromSource === 'dashboard' ? (
              <>
                <li className="flex items-center">
                  <Link href="/dashboard" className="text-gray-500 hover:text-primary-600 transition-colors">
                    Dashboard
                  </Link>
                  <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                </li>
                {tabSource && (
                  <li className="flex items-center">
                    <Link
                      href={`/dashboard?tab=${tabSource}`}
                      className="text-gray-500 hover:text-primary-600 transition-colors capitalize"
                    >
                      {tabSource}
                    </Link>
                    <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
                  </li>
                )}
              </>
            ) : (
              <li className="flex items-center">
                <Link href="/search" className="text-gray-500 hover:text-primary-600 transition-colors">
                  Grants
                </Link>
                <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              </li>
            )}
            
            {/* Grant title - always last */}
            <li>
              <span className="text-gray-700 font-medium line-clamp-1">{grant.title}</span>
            </li>
          </ol>
        </nav>
        
        {/* Grant Header - Simplified */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Title and Agency */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{grant.title}</h1>
              
              {/* Agency Info */}
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{grant.data_source || grant.agency_name}</p>
                  {grant.agency_subdivision && (
                    <p className="text-sm text-gray-600">{grant.agency_subdivision}</p>
                  )}
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {grant.activity_category && grant.activity_category.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {category}
                  </span>
                ))}
                {grant.keywords && grant.keywords.map((keyword, index) => (
                  <span
                    key={`keyword-${index}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="lg:w-80">
              <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                {/* Apply Button */}
                <button
                  onClick={handleApplyClick}
                  disabled={interactionLoading}
                  className={`${
                    interactionState === 'applied'
                      ? 'bg-success-50 text-success-700 border border-success-200 hover:bg-success-100'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  } w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    interactionLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {interactionLoading ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-current rounded-full animate-spin" />
                  ) : (
                    <>
                      {interactionState === 'applied' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                      {interactionState === 'applied' ? 'Applied' : 'Apply'}
                    </>
                  )}
                </button>
                
                {/* Save Button */}
                <button
                  onClick={() => handleInteraction('saved')}
                  disabled={interactionLoading}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    interactionState === 'saved'
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  } ${interactionLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Bookmark className={`w-5 h-5 ${interactionState === 'saved' ? 'fill-current' : ''}`} />
                  {interactionState === 'saved' ? 'Saved' : 'Save Grant'}
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    disabled={interactionLoading}
                    className="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  
                  {/* Ignore Button */}
                  <button
                    onClick={() => handleInteraction('ignored')}
                    disabled={interactionLoading}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      interactionState === 'ignored'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Layout with Right Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content area - Left side */}
          <div className="flex-1 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                Description
              </h2>
              <div className="prose max-w-none text-gray-700">
                {showFullDescription ? (
                  <div className="space-y-4 animate-fade-in">
                    {(grant.description_full ?? '').split('\n\n').map((paragraph, index) => (
                      <p key={index} className="text-sm leading-relaxed">{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{grant.description_short}</p>
                )}
              </div>
              {(grant.description_full && grant.description_full !== grant.description_short) && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-primary-600 hover:text-primary-700 font-medium mt-4 inline-flex items-center gap-1 text-sm transition-all duration-200"
                >
                  {showFullDescription ? 'Show Less' : 'Read Full Description'}
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showFullDescription ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
            
            {/* Eligible Applicants */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Eligible Applicants
                </div>
                {grant.eligible_applicants && grant.eligible_applicants.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    {grant.eligible_applicants.length} types
                  </span>
                )}
              </h2>
              {grant.eligible_applicants && grant.eligible_applicants.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {grant.eligible_applicants
                      .slice(0, showAllApplicants ? grant.eligible_applicants.length : 8)
                      .map((applicant, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                          <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 leading-relaxed">{applicant}</span>
                        </div>
                      ))
                    }
                  </div>
                  
                  {grant.eligible_applicants.length > 8 && (
                    <div className="text-center">
                      <button
                        onClick={() => setShowAllApplicants(!showAllApplicants)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors duration-200"
                      >
                        {showAllApplicants ? (
                          <>
                            Show Less
                            <ChevronRight className="w-4 h-4 rotate-90 transition-transform duration-200" />
                          </>
                        ) : (
                          <>
                            Show All {grant.eligible_applicants.length} Types
                            <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No eligibility information available</p>
                </div>
              )}
              {grant.eligibility_pi && (
                <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex items-start gap-2 mb-2">
                    <User className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-primary-900 text-sm">Principal Investigator Requirements</p>
                  </div>
                  <p className="text-sm text-primary-800 ml-6">{grant.eligibility_pi}</p>
                </div>
              )}
            </div>
            
            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary-600" />
                  Contact Information
                </div>
                {grant.contacts && grant.contacts.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    {grant.contacts.length} contact{grant.contacts.length > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              
              {grant.contacts && grant.contacts.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {grant.contacts
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .slice(0, showAllContacts ? grant.contacts.length : 3)
                      .map((contact, index) => (
                        <div key={index} className="p-4 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
                          <ContactCard contact={contact} />
                        </div>
                      ))
                    }
                  </div>
                  
                  {grant.contacts.length > 3 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setShowAllContacts(!showAllContacts)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors duration-200"
                      >
                        {showAllContacts ? (
                          <>
                            Show Less Contacts
                            <ChevronRight className="w-4 h-4 rotate-90 transition-transform duration-200" />
                          </>
                        ) : (
                          <>
                            Show All {grant.contacts.length} Contacts
                            <ChevronRight className="w-4 h-4 transition-transform duration-200" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No contact information available</p>
                </div>
              )}
              
              {grant.source_url && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <a
                    href={grant.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
                  >
                    <Building2 className="w-4 h-4" />
                    Visit Agency Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
            
          </div>
          
          {/* Right Sidebar - Concise Information */}
          <div className="lg:w-80 space-y-6">
            {/* Quick Facts Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Facts</h3>
              
              <div className="space-y-4">
                {/* Deadline */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">Deadline</p>
                  <p className="font-semibold text-gray-900">{formatDate(grant.close_date)}</p>
                  {daysRemaining !== null && (
                    <p className={`text-sm font-medium mt-1 ${
                      daysRemaining < 14 ? 'text-error-600' :
                      daysRemaining < 30 ? 'text-warning-600' :
                      'text-success-600'
                    }`}>
                      {daysRemaining} days remaining
                    </p>
                  )}
                </div>
                
                {/* Award Amount */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">Award Amount</p>
                  <p className="font-semibold text-gray-900">
                    {grant.award_ceiling ? formatCurrency(grant.award_ceiling) : 'Not specified'}
                  </p>
                </div>
                
                {/* Agency */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">Agency</p>
                  <p className="font-semibold text-gray-900">{grant.data_source || grant.agency_name}</p>
                </div>
                
                {/* Opportunity ID */}
                <div className="border-b border-gray-100 pb-3">
                  <p className="text-sm font-medium text-gray-600 mb-1">Opportunity ID</p>
                  <p className="font-mono text-sm text-gray-900">{grant.opportunity_id}</p>
                </div>
                
                {/* Expected Awards */}
                {grant.expected_award_count && (
                  <div className="border-b border-gray-100 pb-3">
                    <p className="text-sm font-medium text-gray-600 mb-1">Expected Awards</p>
                    <p className="font-semibold text-gray-900">{grant.expected_award_count}</p>
                  </div>
                )}
                
                {/* Cost Sharing */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Cost Sharing</p>
                  <p className="font-semibold text-gray-900">
                    {grant.cost_sharing !== undefined ? (
                      grant.cost_sharing ? 'Required' : 'Not Required'
                    ) : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Additional Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
              
              <div className="space-y-3">
                {/* Posted Date */}
                {grant.post_date && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Posted</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(grant.post_date)}</span>
                  </div>
                )}
                
                {/* LOI Due Date */}
                {grant.loi_due_date && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">LOI Due</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(grant.loi_due_date)}</span>
                  </div>
                )}
                
                {/* Grant Type */}
                {grant.grant_type && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="text-sm font-medium text-gray-900">{grant.grant_type}</span>
                  </div>
                )}
                
                {/* Total Funding */}
                {grant.total_funding && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Total Pool</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(grant.total_funding)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Notes Card */}
            {grant.additional_notes && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {grant.additional_notes.split('\n\n').map((paragraph, index) => {
                      const segments = parseTextWithLinks(paragraph);
                      return (
                        <p key={index} className="text-sm leading-relaxed text-yellow-800">
                          {segments.map((segment, segmentIndex) => {
                            if (segment.type === 'link') {
                              return (
                                <button
                                  key={segmentIndex}
                                  onClick={() => window.open(segment.url, '_blank', 'noopener,noreferrer')}
                                  className="inline-flex items-center gap-1 px-1 py-0.5 mx-1 text-xs font-medium text-primary-700 bg-white border border-primary-300 rounded hover:bg-primary-50 hover:border-primary-400 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  title={segment.title}
                                  aria-label={`Open ${segment.content} in new tab`}
                                >
                                  <span>{segment.content}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              );
                            }
                            return <span key={segmentIndex}>{segment.content}</span>;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Advertisement - Large Rectangle for better performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <GoogleAdSense
                publisherId={ADSENSE_CONFIG.PUBLISHER_ID}
                adSlot="3579024684"
                adFormat="rectangle"
                responsive={false}
                style={{ width: '336px', height: '280px', margin: '0 auto' }}
                className="block"
                testMode={ADSENSE_CONFIG.TEST_MODE}
              />
            </div>
          </div>
        </div>
        
        {/* Similar Grants */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              Similar Grants
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              AI-Powered Similarity
            </div>
          </div>
          {loadingSimilar ? (
            <div className="flex flex-col justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600 mb-3"></div>
              <p className="text-sm text-gray-500">Finding similar grants using AI...</p>
            </div>
          ) : similarGrants.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Found <strong>{similarGrants.length}</strong> grants with similar content and objectives
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarGrants.map((similarGrant) => (
                  <Link
                    key={similarGrant.id}
                    href={`/grants/${similarGrant.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 group border border-transparent hover:border-primary-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 flex-1">
                        {similarGrant.title}
                      </h3>
                      {(similarGrant as any).similarity_score && (
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {Math.round((similarGrant as any).similarity_score * 100)}% match
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{similarGrant.agency}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-1" />
                        {similarGrant.deadline}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">No similar grants found at this time.</p>
              <p className="text-sm text-gray-500">This grant may be unique or embeddings may still be processing.</p>
            </div>
          )}
        </div>
        
        {/* Apply Confirmation Popup */}
        {showApplyConfirmation && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 animate-pulse">Loading...</div>
            </div>
          }>
            <DynamicApplyConfirmationPopup
              isOpen={showApplyConfirmation}
              grantTitle={grant?.title || ''}
              onConfirm={() => handleApplyConfirmation(true)}
              onCancel={() => handleApplyConfirmation(false)}
            />
          </Suspense>
        )}
      </div>
    </Layout>
  );
}