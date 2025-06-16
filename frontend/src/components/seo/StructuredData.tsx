export default function StructuredData() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Grantify.ai",
    "url": "https://grantify.ai",
    "logo": "https://grantify.ai/logo.png",
    "description": "AI-powered grant search platform aggregating NIH, NSF, Grants.gov, and 5+ funding sources. Find research grants, nonprofit funding, and federal opportunities.",
    "founder": {
      "@type": "Person",
      "name": "Michael Chen",
      "url": "https://linkedin.com/in/michael-luo-chen"
    },
    "foundingDate": "2024",
    "industry": "Technology",
    "sameAs": [
      "https://linkedin.com/in/michael-luo-chen"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Grantify.ai",
    "url": "https://grantify.ai",
    "description": "Search federal grants from NIH, NSF, Grants.gov, DOE, EPA in one place. AI matches grants to your research profile. Free grant discovery platform.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://grantify.ai/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Grantify.ai"
    }
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Grantify.ai",
    "applicationCategory": "WebApplication",
    "operatingSystem": "Any",
    "url": "https://grantify.ai",
    "description": "Search 5,000+ grants from NIH, NSF, federal agencies, and foundations. AI grant matching finds funding you'd miss. Track deadlines, save searches. 100% free.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    },
    "creator": {
      "@type": "Person",
      "name": "Michael Chen"
    }
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Grantify.ai Grant Database",
    "description": "Database of 5,000+ active grants from NIH, NSF, Grants.gov, DOE, EPA, USDA, foundations. Updated daily with federal funding opportunities and AI matching.",
    "url": "https://grantify.ai/search",
    "creator": {
      "@type": "Organization",
      "name": "Grantify.ai"
    },
    "keywords": [
      "research grants",
      "government funding",
      "NIH grants", 
      "NSF grants",
      "SBIR funding",
      "academic scholarships",
      "nonprofit grants"
    ],
    "temporalCoverage": "2024/..",
    "spatialCoverage": "United States",
    "variableMeasured": [
      "Grant amount",
      "Application deadline",
      "Eligibility criteria",
      "Funding organization",
      "Research area"
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does AI grant matching work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes your research profile to match grants from NIH, NSF, Grants.gov, and 5+ sources. Unlike keyword search, it understands context to find opportunities you'd miss manually."
        }
      },
      {
        "@type": "Question", 
        "name": "Is it legal to use AI for grant applications?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, using AI for grant discovery and research is completely legal. Our platform helps you find relevant opportunities - you still write and submit your own applications according to each funder's requirements."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate is AI grant matching?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI finds 3x more relevant grants than manual search. It understands research context beyond keywords, searching all federal agencies and foundations simultaneously."
        }
      },
      {
        "@type": "Question",
        "name": "What types of grants are in your database?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We cover NIH, NSF, DOE, USDA, EPA, and other federal agencies, plus private foundations, state grants, and international funding opportunities across all research disciplines."
        }
      },
      {
        "@type": "Question",
        "name": "How to find research grants using AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Enter your research area and our AI searches NIH, NSF, Grants.gov, and 5+ sources simultaneously. Get personalized matches based on your profile, not just keywords."
        }
      },
      {
        "@type": "Question",
        "name": "Best AI tool for grant discovery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Grantify aggregates all federal grants (NIH, NSF, DOE, EPA) plus foundations in one AI-powered search. Find grants you'd miss on individual sites. 100% free, updated daily."
        }
      }
    ]
  };

  // AI Service Schema for better AI search visibility
  const aiServiceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "AI Grant Discovery Service",
    "description": "Artificial intelligence-powered grant search and matching service for researchers, academics, and organizations",
    "provider": {
      "@type": "Organization",
      "name": "Grantify.ai"
    },
    "serviceType": "AI Research Tool",
    "audience": {
      "@type": "Audience",
      "audienceType": "Researchers, Academics, Nonprofits, Startups"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Grant Discovery Features",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "AI Grant Matching",
            "description": "Intelligent matching of research profiles to relevant funding opportunities"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "Service",
            "name": "Real-time Grant Database",
            "description": "Access to 5,000+ grants from federal agencies and foundations, updated daily"
          }
        }
      ]
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(datasetSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(aiServiceSchema).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}