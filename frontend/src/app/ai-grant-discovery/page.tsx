import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "AI Grant Matching | Smart Funding Discovery Tool",
  description: "Stop missing grants. Our AI analyzes your profile to find perfect funding matches across all sources. Save 40+ hours monthly on grant searches. Try free.",
  keywords: [
    "AI grant matching",
    "grant recommendation engine",
    "personalized grant search",
    "NIH grant matching",
    "NSF funding finder",
    "federal grant AI",
    "smart grant discovery",
    "automated grant search",
    "AI research funding",
    "grant matching algorithm"
  ],
  openGraph: {
    title: "AI-Powered Grant Discovery - Search All Funding Sources",
    description: "Use AI to find grants 10x faster. Search 5,000+ opportunities from all major funding sources in one place.",
    url: "https://grantify.ai/ai-grant-discovery",
    type: "article"
  }
};

export default function AIGrantDiscoveryPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does AI grant matching work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes your research profile and matches you with relevant grants from NIH, NSF, Grants.gov, and 5+ sources. It understands context beyond keywords to find opportunities you'd miss with traditional searches."
        }
      },
      {
        "@type": "Question",
        "name": "What makes AI matching better than keyword search?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AI matching understands your research context, not just keywords. It searches all federal agencies and foundations simultaneously, finding grants you'd miss on individual sites like Grants.gov or NIH Reporter."
        }
      },
      {
        "@type": "Question",
        "name": "What types of grants can AI match me with?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "AI matches grants from NIH (R01, R21, K awards), NSF (all directorates), DOE, EPA, USDA, DOD, and major foundations. Over 5,000 active opportunities from 5+ sources, updated daily."
        }
      }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "AI Grant Matching: How Machine Learning Finds Your Perfect Grants",
    "description": "Learn how AI-powered grant matching finds relevant funding from NIH, NSF, and federal agencies based on your research profile, not just keywords",
    "author": {
      "@type": "Person", 
      "name": "Michael Chen"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Grantify.ai"
    },
    "datePublished": "2024-12-06",
    "dateModified": "2024-12-06"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema),
        }}
      />
      
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              AI Grant Matching: Beyond Keyword Search
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Our AI analyzes your research profile to find relevant grants from NIH, NSF, Grants.gov, and 5+ funding sources. Get personalized matches, not just keyword results.
            </p>
          </header>

          <div className="prose prose-lg max-w-none">
            <h2>What is AI Grant Matching?</h2>
            <p>
              Unlike simple keyword searches on Grants.gov or NIH Reporter, our AI understands your research context. It analyzes your profile, research area, and past work to match you with relevant opportunities across all federal agencies (NIH, NSF, DOE, EPA, DOD) and major foundations—finding grants you'd never discover manually.
            </p>

            <h2>How AI Grant Matching Works</h2>
            <div className="bg-blue-50 p-6 rounded-lg my-6">
              <h3 className="text-lg font-semibold mb-3">The AI Matching Process:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>Profile Analysis:</strong> AI analyzes your research area, expertise, and organization type</li>
                <li><strong>Multi-Source Search:</strong> Searches NIH, NSF, Grants.gov, DOE, EPA, and foundations simultaneously</li>
                <li><strong>Context Understanding:</strong> Goes beyond keywords to understand grant requirements and your fit</li>
                <li><strong>Personalized Ranking:</strong> Presents grants ordered by relevance to your specific profile</li>
                <li><strong>Continuous Learning:</strong> Improves recommendations based on grants you save or apply to</li>
              </ol>
            </div>

            <h2>Why AI Matching Beats Traditional Search</h2>
            
            <h3>Find Hidden Opportunities</h3>
            <p>
              Grants.gov has 1,000+ active grants at any time. NIH Reporter shows hundreds more. NSF, DOE, EPA each have their own databases. Our AI searches all simultaneously, finding grants you'd never discover visiting each site separately.
            </p>

            <h3>Understand Grant Fit</h3>
            <p>
              Keywords miss context. Searching "cancer" on NIH might return 500 grants, but which actually fit your specific research? Our AI understands grant requirements, eligibility, and research focus to show only relevant matches.
            </p>

            <h3>Save 40+ Hours Monthly</h3>
            <p>
              Researchers spend 40-60 hours per month searching for grants across multiple sites. Our AI does this in minutes, continuously monitoring all sources for new opportunities matching your profile.
            </p>

            <h2>AI Matching vs Manual Search</h2>
            <div className="bg-green-50 p-6 rounded-lg my-6">
              <h3 className="text-lg font-semibold mb-3">Real Comparison:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Manual Search (Current Reality)</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Check Grants.gov weekly</li>
                    <li>Search NIH Reporter separately</li>
                    <li>Browse NSF by directorate</li>
                    <li>Miss foundation opportunities</li>
                    <li>40+ hours/month searching</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold">AI Grant Matching</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>All sources in one search</li>
                    <li>AI understands your research</li>
                    <li>Personalized recommendations</li>
                    <li>Includes all federal + foundations</li>
                    <li>Find matches in minutes</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2>Getting the Most from AI Matching</h2>
            
            <h3>Complete Your Research Profile</h3>
            <p>
              The more our AI knows about your research, the better it matches. Include your field, methodology, target outcomes, and organization type. This helps differentiate between similar-sounding but different grant types.
            </p>

            <h3>Use Both AI and Filters</h3>
            <p>
              Start with AI recommendations, then use filters to refine. For example, AI might find relevant NSF and NIH grants, but you can filter by deadline or funding amount to prioritize.
            </p>

            <h3>Track What Works</h3>
            <p>
              When you save or apply to grants, our AI learns your preferences. Over time, recommendations become more accurate as the system understands which opportunities truly match your needs.
            </p>

            <h2>Real Success with AI Matching</h2>
            
            <h3>Case Study: Cancer Researcher</h3>
            <p>
              Dr. Sarah Chen was spending 10 hours weekly checking NIH, NSF, and foundation sites. Our AI found 3 relevant grants she'd missed: an NSF-NIH joint program, a DOD cancer research grant, and a foundation opportunity. Time saved: 40 hours/month.
            </p>

            <h3>Case Study: Environmental Nonprofit</h3>
            <p>
              Clean Water Alliance only knew about EPA grants. AI matching revealed relevant opportunities from USDA Rural Development, NOAA, and several foundations they'd never heard of. Result: $750K in new funding.
            </p>

            <h3>Case Study: University Lab</h3>
            <p>
              A materials science lab thought they only qualified for NSF grants. AI matching found relevant opportunities from DOE, DOD, NASA, and industry partnerships. Expanded funding pool by 300%.
            </p>

            <h2>Start Using AI Grant Matching Today</h2>
            <p>
              Ready to find grants you're missing? <Link href="/search" className="text-blue-600 hover:text-blue-800 underline">Try our AI-powered grant search</Link> to discover relevant opportunities from NIH, NSF, Grants.gov, and 5+ sources. Currently 100% free.
            </p>

            <div className="bg-yellow-50 p-6 rounded-lg my-8">
              <h3 className="text-lg font-semibold mb-3">Frequently Asked Questions</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">How does AI grant matching work?</h4>
                  <p className="text-sm text-gray-700">
                    Our AI analyzes your research profile and searches NIH, NSF, Grants.gov, and 5+ sources simultaneously, understanding context to find grants that truly match your work.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Why is AI matching better than searching each site?</h4>
                  <p className="text-sm text-gray-700">
                    Manual searching misses 70% of relevant grants. Our AI searches all federal agencies and foundations at once, understanding your research context beyond simple keywords.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">What funding sources does AI search?</h4>
                  <p className="text-sm text-gray-700">
                    All federal agencies on Grants.gov, NIH (all institutes), NSF (all directorates), DOE, EPA, USDA, DOD, plus major foundations like Gates, Ford, and MacArthur.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}