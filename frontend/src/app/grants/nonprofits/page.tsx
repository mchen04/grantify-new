import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Nonprofit Grants 2025 | Find Funding Opportunities",
  description: "Nonprofit funding made simple. Search grants from foundations & government, get AI recommendations, track applications. Find your perfect grant match today.",
  keywords: [
    "grants for nonprofits",
    "nonprofit grants",
    "foundation grants",
    "federal grants nonprofits",
    "community development grants",
    "grants for small nonprofits",
    "operational support grants",
    "capacity building grants",
    "USDA rural grants",
    "EPA environmental grants",
    "NEA arts grants",
    "community foundation grants",
    "corporate giving programs",
    "general operating grants",
    "nonprofit startup grants"
  ],
  openGraph: {
    title: "Nonprofit Grants - Foundation & Government Funding Database",
    description: "Comprehensive database of nonprofit grants from foundations, government agencies, and corporate donors.",
    url: "https://grantify.ai/grants/nonprofits",
    type: "website"
  }
};

export default function NonprofitGrantsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What types of nonprofit grants are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nonprofit grants include foundation grants, government funding, corporate donations, capacity building grants, program funding, and general operating support from sources like United Way, Ford Foundation, and federal agencies."
        }
      },
      {
        "@type": "Question",
        "name": "How do nonprofits find foundation grants?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Search foundation databases, research funders aligned with your mission, check local community foundations, and use grant discovery platforms to find relevant opportunities based on your organization's focus area and geographic region."
        }
      },
      {
        "@type": "Question",
        "name": "What are the best grants for small nonprofits?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Small nonprofits should consider local community foundation grants, capacity building funds, volunteer engagement grants, and smaller foundation awards ranging from $1,000-$25,000 that match their organizational capacity."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm mb-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/grants" className="text-blue-600 hover:text-blue-800">Grants</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-500">Nonprofit Grants</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Grants for Nonprofits from Federal Agencies & Foundations
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Search 2,000+ nonprofit grants from federal agencies, private foundations, and corporate funders. Find operational support, program funding, and capacity building grants.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="prose prose-lg max-w-none">
                <h2>Comprehensive Nonprofit Funding Sources</h2>
                <p>
                  Nonprofits can access funding from multiple sources: federal agencies (Grants.gov), private foundations (Gates, Ford, MacArthur), corporate giving programs, and community foundations. We aggregate all these sources for easy searching.
                </p>

                <h3>Federal Grant Programs for Nonprofits</h3>
                
                <h4>Major Federal Funding Sources</h4>
                <div className="bg-blue-50 p-6 rounded-lg my-6">
                  <h5 className="font-semibold mb-3">Top Federal Agencies Funding Nonprofits:</h5>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>HHS/SAMHSA:</strong> Substance abuse, mental health services ($5B annually)</li>
                    <li><strong>USDA Rural Development:</strong> Community facilities, housing ($2.8B annually)</li>
                    <li><strong>EPA:</strong> Environmental justice, education grants ($500M annually)</li>
                    <li><strong>NEA/NEH:</strong> Arts and humanities programs ($300M annually)</li>
                    <li><strong>DOJ:</strong> Victim services, violence prevention ($400M annually)</li>
                    <li><strong>CDC:</strong> Public health, prevention programs ($1B annually)</li>
                  </ul>
                </div>

                <h4>Foundation Grants for Nonprofits</h4>
                <p>
                  Private foundations provide over $75 billion annually to nonprofits. Major funders include national foundations, community foundations, and corporate giving programs with diverse focus areas.
                </p>

                <div className="bg-green-50 p-6 rounded-lg my-6">
                  <h5 className="font-semibold mb-3">Major Foundation Funders:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Bill & Melinda Gates Foundation - Global health, education ($5B+ annually)</li>
                    <li>Ford Foundation - Social justice, inequality ($600M annually)</li>
                    <li>MacArthur Foundation - Criminal justice, climate ($300M annually)</li>
                    <li>Robert Wood Johnson Foundation - Health equity ($400M annually)</li>
                    <li>W.K. Kellogg Foundation - Children, families ($300M annually)</li>
                    <li>Local Community Foundations - Place-based giving (varies by region)</li>
                  </ul>
                </div>

                <h3>Popular Nonprofit Grant Categories</h3>
                
                <h4>Community Development</h4>
                <p>
                  USDA Rural Development, HUD CDBG, and foundation grants support community centers, affordable housing, infrastructure, and economic development in underserved areas.
                </p>

                <h4>Education & Youth Programs</h4>
                <p>
                  Department of Education, NSF, and youth-focused foundations fund STEM education, after-school programs, literacy initiatives, and college access programs.
                </p>

                <h4>Environmental & Conservation</h4>
                <p>
                  EPA, NOAA, and environmental foundations support conservation projects, environmental education, climate action, and community sustainability initiatives.
                </p>

                <h4>Arts & Culture</h4>
                <p>
                  NEA, NEH, state arts councils, and cultural foundations fund arts programming, cultural preservation, creative placemaking, and community arts initiatives.
                </p>

                <h3>Grant Application Best Practices for Nonprofits</h3>
                
                <h4>Organizational Readiness</h4>
                <p>
                  Successful nonprofits maintain current 501(c)(3) status, audited financials, strong boards, and clear missions. Grant readiness includes having evaluation systems and sustainability plans.
                </p>

                <h4>Match Requirements</h4>
                <p>
                  Many federal grants require matching funds (cash or in-kind). Nonprofits should identify match sources early and document volunteer hours, donated goods, and pro bono services.
                </p>

                <h4>Collaborative Applications</h4>
                <p>
                  Funders increasingly favor collaborative approaches. Partner with other nonprofits, government agencies, or businesses to strengthen applications and expand impact.
                </p>

                <h2>Essential Grant Application Components</h2>
                
                <h3>Standard Requirements Across Funders</h3>
                <div className="bg-yellow-50 p-6 rounded-lg my-6">
                  <h4 className="font-semibold mb-3">Common Application Elements:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Statement of need with data and evidence</li>
                    <li>Clear goals, objectives, and outcomes</li>
                    <li>Detailed program implementation plan</li>
                    <li>Evaluation and measurement strategy</li>
                    <li>Organizational capacity and track record</li>
                    <li>Detailed budget with justification</li>
                    <li>Sustainability plan beyond grant period</li>
                  </ul>
                </div>

                <h3>Budget Development</h3>
                <p>
                  Nonprofit budgets must demonstrate fiscal responsibility, cost-effectiveness, and appropriate use of grant funds. Include indirect costs, match requirements, and multi-year sustainability planning.
                </p>

                <h3>Evaluation and Reporting</h3>
                <p>
                  Strong nonprofits implement robust evaluation systems to measure program impact and report results to funders. Data-driven outcomes increase renewal chances and attract new funders.
                </p>

                <h2>Current Funding Priorities Across Sectors</h2>
                
                <h3>Equity and Justice</h3>
                <p>
                  Major funders prioritize racial equity, economic justice, and reducing disparities. Ford, MacArthur, and federal agencies emphasize funding BIPOC-led organizations.
                </p>

                <h3>Climate and Environment</h3>
                <p>
                  Growing funding for climate resilience, environmental justice, and sustainable communities from EPA, foundations, and corporate funders.
                </p>

                <h3>Capacity Building</h3>
                <p>
                  Increased focus on organizational capacity, leadership development, and infrastructure support to strengthen the nonprofit sector.
                </p>

                <h2>Finding the Right Grants for Your Nonprofit</h2>
                <p>
                  Our <Link href="/search" className="text-blue-600 hover:text-blue-800 underline">AI-powered grant search</Link> aggregates opportunities from Grants.gov, foundations, and corporate funders. Filter by mission area, location, and funding amount to find perfect matches.
                </p>

                <div className="bg-indigo-50 p-6 rounded-lg my-6">
                  <h3 className="text-lg font-semibold mb-3">Search Strategy Tips:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Filter by mission area and program focus</li>
                    <li>Set geographic preferences for local funders</li>
                    <li>Use funding amount ranges based on organizational capacity</li>
                    <li>Track application deadlines and requirements</li>
                    <li>Save promising opportunities for future reference</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Popular Nonprofit Categories</h3>
                  <ul className="space-y-2">
                    <li><Link href="/search?category=Community" className="text-blue-600 hover:text-blue-800">Community Health</Link></li>
                    <li><Link href="/search?category=Education" className="text-blue-600 hover:text-blue-800">Health Education</Link></li>
                    <li><Link href="/search?category=Research" className="text-blue-600 hover:text-blue-800">Research Partnerships</Link></li>
                    <li><Link href="/search?category=Clinical" className="text-blue-600 hover:text-blue-800">Clinical Support</Link></li>
                    <li><Link href="/search?category=Prevention" className="text-blue-600 hover:text-blue-800">Prevention Programs</Link></li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Funding Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">2,000+</div>
                      <div className="text-sm text-gray-600">Active nonprofit grants</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">$450B+</div>
                      <div className="text-sm text-gray-600">Annual charitable giving</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">5+</div>
                      <div className="text-sm text-gray-600">Funding sources tracked</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Nonprofit Grant FAQ</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm">What types of nonprofit grants exist?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        Foundation grants, government funding, corporate donations, capacity building grants, and program-specific funding.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm">How do nonprofits find foundation grants?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        Research foundation databases, check local community foundations, and use grant discovery platforms.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm">Best grants for small nonprofits?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        Local community foundation grants, capacity building funds, and smaller foundation awards ($1K-$25K).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}