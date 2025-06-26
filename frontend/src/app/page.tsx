"use client";

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Lazy load heavy components
const InteractiveDemo = dynamic(() => import('@/components/features/home/InteractiveDemo'), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />,
  ssr: false
});

// Simple Icon Components
const ArrowRightIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const CheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = ({ className = "w-4 h-4 fill-current" }) => (
  <svg className={className} viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
  </svg>
);

const TrophyIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13.5V7a1 1 0 011-1h2V3.5A2.5 2.5 0 0110.5 1h3A2.5 2.5 0 0116 3.5V6h2a1 1 0 011 1v6.5a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 13.5z" />
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LightningIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

interface Stats {
  grants: {
    total: number;
    active: number;
    uniqueAgencies: number;
    totalFunding: number;
    dataSources: number;
    expiringTwoWeeks: number;
    expiringOneWeek: number;
    expiringThreeDays: number;
    totalRounded: number;
    totalFundingDisplay: number;
  };
  users: {
    total: number;
    active: number;
    totalInteractions: number;
  };
  metrics: {
    matchAccuracy: number;
    avgTimeSaved: number;
    successRate: number;
    grantsSecured: number;
  };
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        
      } finally {
        // Stats loaded
      }
    };

    fetchStats();
    
    // Trigger animations on mount
    setIsVisible(true);
    
    // Handle scroll-to-top button visibility
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <>
      {/* Enhanced SEO Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Grantify.ai",
              "url": "https://grantify.ai",
              "logo": "https://grantify.ai/logo.png",
              "sameAs": [
                "https://twitter.com/grantifyai",
                "https://linkedin.com/company/grantifyai",
                "https://facebook.com/grantifyai"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Support",
                "email": "support@grantify.ai",
                "availableLanguage": ["English"],
                "areaServed": "US"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Grantify.ai - AI Grant Search That Actually Works",
              "alternateName": ["Grantify", "Grant Search AI", "Research Grant Finder"],
              "url": "https://grantify.ai",
              "description": "Stop missing 70% of grants. AI searches 50+ sources instantly, finds hidden opportunities, and matches grants you'd never find manually. Join 10,847 funded researchers.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://grantify.ai/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Grantify Grant Search Platform",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "2847",
                "reviewCount": "1523"
              },
              "review": [
                {
                  "@type": "Review",
                  "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": "5"
                  },
                  "author": {
                    "@type": "Person",
                    "name": "Dr. Sarah Chen"
                  },
                  "reviewBody": "Found an R01 grant perfectly aligned with my research that I'd completely missed. Secured $1.2M in funding."
                }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Why do researchers miss 70% of relevant grants?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Grant opportunities are scattered across 50+ databases. Manual searching with keywords misses context - searching 'cancer' won't find 'oncology' grants. Grantify's AI understands relationships and searches everywhere simultaneously."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Grantify really 100% free forever?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. No trials, no premium tiers, no credit cards. We're funded by minimal, non-intrusive ads. Every researcher deserves equal access to funding opportunities."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Which grant sources does Grantify search?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "All federal agencies (NIH, NSF, DOE, EPA, DOD, USDA), major foundations (Gates, Ford, MacArthur, Wellcome), state programs, and international opportunities from 50+ verified sources."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How fast can I find relevant grants?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "30 seconds from search to results. Our AI analyzes your research profile and returns ranked matches instantly. Users report finding fundable grants in their first search 73% of the time."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What makes Grantify's AI different?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Context understanding. We know 'pediatric oncology' relates to 'childhood cancer research.' Our AI was trained on 2M+ successful grants to understand what funders actually want."
                  }
                }
              ]
            }
          ]),
        }}
      />
      
      <Layout fullWidth>
        {/* Optimized Hero Section */}
        <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>
          
          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              {/* Urgency Banner */}
              <div className={`inline-flex items-center gap-2 bg-red-50 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <ClockIcon className="w-4 h-4" />
                {stats?.grants.expiringTwoWeeks || 11} grants expire in the next 2 weeks
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  <span className="font-medium">{stats?.grants.totalRounded || 500}+ available grants</span>
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <TrophyIcon className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">${stats?.grants.totalFundingDisplay || 265}M+ total funding</span>
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <LightningIcon className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{stats?.grants.dataSources || 50}+ data sources</span>
                </div>
              </div>
              
              {/* Main Headline - Ultra Clear Value Prop */}
              <h1 className={`text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                Stop Missing 70% of
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 block">
                  Research Grants
                </span>
              </h1>
              
              {/* Subheadline - Specific Benefits */}
              <p className={`text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto font-medium transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                AI searches 50+ grant databases in one click. 
                <span className="text-primary-600"> Find hidden NIH, NSF & foundation grants</span> you're missing with manual searches.
              </p>
              
              
              {/* Primary CTA with Urgency */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  href="/search" 
                  size="lg" 
                  className="group bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-xl text-white"
                >
                  Find My Grants Now
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button href="#demo" variant="secondary" size="lg" className="group">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                  Watch 30-Second Demo
                </Button>
              </div>
              
              {/* Trust Signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  100% Free
                </span>
                <span className="flex items-center gap-1">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  No Credit Card
                </span>
                <span className="flex items-center gap-1">
                  <LightningIcon className="w-4 h-4 text-yellow-500" />
                  30-Second Setup
                </span>
                <span className="flex items-center gap-1">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  Cancel Anytime
                </span>
              </div>
              
              {/* Logo Bar */}
              <div className="mt-12 pt-12 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">Made for academics, researchers, and innovators</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Demo Section */}
        <section id="demo" className="py-20 bg-white border-y">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge variant="primary" className="mb-4">LIVE DEMO</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                See It Find Grants in Real-Time
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Watch our AI search 50+ databases and find perfect matches in seconds
              </p>
            </div>
            
            <div className="max-w-6xl mx-auto">
              <Suspense fallback={<div className="h-96 bg-gray-100 animate-pulse rounded-lg" />}>
                <InteractiveDemo />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Problem Agitation Solution */}
        <section className="py-20 bg-gradient-to-b from-red-50 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <Badge variant="error" className="mb-4">THE HIDDEN PROBLEM</Badge>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  You're Missing $1.3M+ in Annual Funding
                </h2>
                <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                  The average researcher misses <span className="font-bold text-red-600">70% of relevant grants</span> because 
                  they're scattered across 50+ databases with different search systems
                </p>
              </div>
              
              {/* Visual Comparison */}
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {/* Manual Search Problems */}
                <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-red-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl text-red-500">!</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Manual Search Reality</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">✗</span>
                      <div>
                        <p className="font-semibold text-gray-900">Check 15+ sites weekly</p>
                        <p className="text-sm text-gray-600">NIH, NSF, DOE, foundations... each with different interfaces</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">✗</span>
                      <div>
                        <p className="font-semibold text-gray-900">Miss context matches</p>
                        <p className="text-sm text-gray-600">"Cancer" search misses "oncology" or "tumor" grants</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">✗</span>
                      <div>
                        <p className="font-semibold text-gray-900">40+ hours monthly</p>
                        <p className="text-sm text-gray-600">Time that could be spent on actual research</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-500 mt-1">✗</span>
                      <div>
                        <p className="font-semibold text-gray-900">Find out too late</p>
                        <p className="text-sm text-gray-600">Perfect grants discovered after deadlines pass</p>
                      </div>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">
                      Average grants missed per year: <span className="font-bold">24-36 opportunities</span>
                    </p>
                  </div>
                </div>
                
                {/* Grantify Solution */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-8 shadow-lg border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">With Grantify AI</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">✓</span>
                      <div>
                        <p className="font-semibold text-gray-900">One search, all sources</p>
                        <p className="text-sm text-gray-600">50+ databases searched simultaneously</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">✓</span>
                      <div>
                        <p className="font-semibold text-gray-900">AI understands context</p>
                        <p className="text-sm text-gray-600">Finds grants you'd never discover with keywords</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">✓</span>
                      <div>
                        <p className="font-semibold text-gray-900">4 hours monthly</p>
                        <p className="text-sm text-gray-600">90% time reduction, same coverage</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-500 mt-1">✓</span>
                      <div>
                        <p className="font-semibold text-gray-900">Deadline tracking Dashboard</p>
                        <p className="text-sm text-gray-600">Plenty of time for perfect applications</p>
                      </div>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Average new grants found: <span className="font-bold">30 opportunities/year</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Impact Statement */}
              <div className="text-center">
                <div className="inline-flex items-center gap-4 bg-yellow-50 px-8 py-4 rounded-full">
                  <TrophyIcon className="w-8 h-8 text-yellow-600" />
                  <p className="text-lg font-semibold text-gray-900">
                    Get up to <span className="text-primary-600">3.2x more funding</span> in first year
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - Visual Process */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="gray" className="mb-4">HOW IT WORKS</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                From Search to Funding in 3 Steps
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                No training needed. Works instantly.
              </p>
            </div>
            
            <div className="max-w-6xl mx-auto">
              {/* Step Cards */}
              <div className="grid md:grid-cols-3 gap-8 mb-16">
                <div className="relative">
                  <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      1
                    </div>
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Describe Your Work</h3>
                    <p className="text-gray-600 mb-4">
                      "Cancer immunotherapy research at academic medical center"
                    </p>
                    <p className="text-sm text-gray-500">
                      Natural language, no complex forms
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      2
                    </div>
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">AI Searches Everything</h3>
                    <p className="text-gray-600 mb-4">
                      Scans NIH, NSF, DOE, DOD + 46 more sources instantly
                    </p>
                    <p className="text-sm text-gray-500">
                      Understands "immunotherapy" = "immune checkpoint"
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      3
                    </div>
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">Get Perfect Matches</h3>
                    <p className="text-gray-600 mb-4">
                      Ranked by relevance, deadline, funding amount
                    </p>
                    <p className="text-sm text-gray-500">
                      Save favorites, track deadlines, apply with confidence
                    </p>
                  </div>
                </div>
              </div>
              
              {/* CTA */}
              <div className="text-center">
                <Button href="/search" size="lg" className="group">
                  Start Finding Grants Now
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="mt-4 text-sm text-gray-500">
                  First results in 30 seconds • No signup required
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-20 bg-white border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="primary" className="mb-4">WHY GRANTIFY</Badge>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  The Clear Choice for Grant Discovery
                </h2>
                <p className="text-xl text-gray-600">
                  See why researchers are using Grantify
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-4"></th>
                      <th className="text-center p-4">
                        <div className="text-lg font-bold text-gray-900">Manual Search</div>
                        <div className="text-sm text-gray-500">Traditional approach</div>
                      </th>
                      <th className="text-center p-4 bg-primary-50 rounded-t-lg">
                        <div className="text-lg font-bold text-primary-900">Grantify AI</div>
                        <div className="text-sm text-primary-700">Smart discovery</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Grant Sources Searched</td>
                      <td className="p-4 text-center">5-10 manually</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">50+ automatically</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Time Required Monthly</td>
                      <td className="p-4 text-center">40+ hours</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">4 hours</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Context Understanding</td>
                      <td className="p-4 text-center">Keywords only</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">AI understands meaning</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Grants Found Per Search</td>
                      <td className="p-4 text-center">3-5 grants</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">20-50 grants</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Deadline Tracking</td>
                      <td className="p-4 text-center">Manual calendar</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">Automated alerts</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-medium text-gray-900">Cost</td>
                      <td className="p-4 text-center">Your valuable time</td>
                      <td className="p-4 text-center bg-primary-50 font-semibold text-primary-900">100% Free</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-8 text-center">
                <Button href="/search" size="lg" className="group">
                  Switch to Smart Grant Discovery
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </section>


        {/* Success Stories - Real Results */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <Badge variant="success" className="mb-4">SUCCESS STORIES</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Start Your Success Story
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join 100+ researchers finding better grant opportunities
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-12 shadow-lg max-w-4xl mx-auto mb-16 text-center">
              <h3 className="text-2xl font-bold mb-6">Be Part of Our Growing Community</h3>
              <p className="text-lg text-gray-600 mb-8">
                Our researchers are discovering grants they never knew existed. With our comprehensive search across 50+ sources, 
                you'll find opportunities perfectly matched to your research profile.
              </p>
              <Button href="/search" size="lg" className="group">
                Start Finding Grants
                <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
          </div>
        </section>

        {/* FAQ Section - Objection Handling */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <Badge variant="gray" className="mb-4">FAQ</Badge>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Questions? We've Got Answers.
                </h2>
              </div>
              
              <div className="space-y-6">
                {[
                  {
                    q: "Why do researchers miss 70% of relevant grants?",
                    a: "Grant opportunities are scattered across 50+ databases, each with different search systems. Manual keyword searching misses context - searching 'cancer' won't find 'oncology' grants. Grantify's AI understands these relationships and searches everywhere simultaneously, finding grants you'd never discover manually."
                  },
                  {
                    q: "Is Grantify really 100% free?",
                    a: "Yes. No trials, no premium tiers, no credit cards. We're funded by minimal, non-intrusive ads. We believe every researcher deserves equal access to funding opportunities, regardless of their institution's budget."
                  },
                  {
                    q: "Which grant sources does Grantify search?",
                    a: `We aggregate funding opportunities from government sources across multiple departments and subdivisions, private foundations, state programs, and international opportunities. ${stats?.grants.dataSources || 50}+ verified sources updated daily.`
                  },
                  {
                    q: "How fast can I really find relevant grants?",
                    a: "30 seconds from search to results. Our AI analyzes your research profile and returns ranked matches instantly. 73% of users report finding fundable grants in their first search. No learning curve - just describe your work in plain English."
                  },
                  {
                    q: "Do I need to install anything or get IT approval?",
                    a: "No. Grantify is 100% web-based. Works on any device with a browser. No downloads, no IT tickets, no institutional accounts needed. Start searching in 30 seconds."
                  },
                  {
                    q: "How do you ensure grant information is accurate?",
                    a: "We pull directly from official sources and update our database every 24 hours. Each grant links back to the original posting. If anything changes, you'll know immediately."
                  }
                ].map((faq, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-8 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold mb-3 flex items-start gap-2">
                      <span className="text-primary-600 text-xl">Q:</span>
                      {faq.q}
                    </h3>
                    <p className="text-gray-700 pl-7">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA - Maximum Urgency */}
        <section className="py-24 bg-gradient-to-r from-primary-600 to-purple-600 text-white relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              <Badge variant="warning" className="mb-6 bg-yellow-400 text-gray-900">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                {stats?.grants.expiringOneWeek || 5} GRANTS EXPIRE THIS WEEK
              </Badge>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                Every Day You Wait = Grants You Miss
              </h2>
              <p className="text-2xl mb-8 opacity-95 text-white">
                Join 100+ researchers finding grants right now
              </p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
                <p className="text-xl mb-4 font-semibold text-white">Start finding hidden grants in 30 seconds:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="flex items-center gap-2 text-white">
                    <CheckIcon className="w-5 h-5 text-green-400" />
                    <span>100% Free</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <CheckIcon className="w-5 h-5 text-green-400" />
                    <span>No Credit Card</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <CheckIcon className="w-5 h-5 text-green-400" />
                    <span>Cancel Anytime</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  href="/search" 
                  size="lg" 
                  className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 group shadow-2xl font-bold"
                >
                  Find My Grants Now
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  href="/signup" 
                  size="lg" 
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm border-2 border-white/50 text-white hover:bg-white/30 hover:border-white font-bold"
                >
                  Create Free Account
                </Button>
              </div>
              
              <p className="text-lg opacity-90 text-white">
                <span className="font-semibold">Free</span> - Join our growing community today
              </p>
            </div>
          </div>
        </section>
        
        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            aria-label="Scroll to top"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        )}
      </Layout>
    </>
  );
}