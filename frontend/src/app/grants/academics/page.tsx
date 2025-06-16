import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Academic Research Grants 2025 | Find University Funding",
  description: "Find academic research grants tailored to your field. AI matches faculty, postdocs, and students with the best funding opportunities. Join 5,000+ researchers.",
  keywords: [
    "academic research grants",
    "NIH grants for universities",
    "NSF research funding",
    "R01 grants",
    "postdoc fellowships",
    "graduate student grants",
    "faculty research grants",
    "K99 R00 pathway awards",
    "F32 postdoctoral fellowship",
    "university grants",
    "research project grants",
    "career development awards",
    "training grants T32",
    "SBIR STTR academic",
    "DOE university grants",
    "EPA academic research"
  ],
  openGraph: {
    title: "Academic Research Grants - University Funding Database",
    description: "Comprehensive database of academic grants for universities, researchers, and students. Find relevant funding faster.",
    url: "https://grantify.ai/grants/academics",
    type: "website"
  }
};

export default function AcademicGrantsPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What types of academic grants are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NIH academic grants include R01 research project grants, R21 exploratory grants, K-series career development awards, F-series fellowships, and T-series training grants for universities and academic medical centers."
        }
      },
      {
        "@type": "Question",
        "name": "How do I find grants for postdoc positions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Search for NIH postdoc grants by research area and institute. Key opportunities include F32 postdoctoral fellowships, K99/R00 pathway to independence awards, and T32 institutional training grants."
        }
      },
      {
        "@type": "Question",
        "name": "What are the best grants for early career faculty?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Early career faculty should consider NIH K-series career development awards (K08, K23), R21 exploratory grants, R15 academic research enhancement awards, and R01 research project grants for establishing independent research programs."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://grantify.ai/"
      },
      {
        "@type": "ListItem", 
        "position": 2,
        "name": "Grants",
        "item": "https://grantify.ai/grants"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Academic Grants",
        "item": "https://grantify.ai/grants/academics"
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <nav className="text-sm mb-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/grants" className="text-blue-600 hover:text-blue-800">Grants</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-500">Academic Grants</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Academic Research Grants from Federal Agencies
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Search 1,000+ academic grants for universities, faculty, postdocs, and students. Find R01s, fellowships, career awards, and training grants with AI matching.
            </p>
          </header>

          {/* Featured Snippet - How to Apply */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">How to apply for academic research grants:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Check eligibility requirements for your career stage</li>
              <li>Register your institution in grants.gov and eRA Commons</li>
              <li>Find matching opportunities using filters or AI search</li>
              <li>Prepare application following funder guidelines</li>
              <li>Submit before deadline through official portal</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="prose prose-lg max-w-none">
                <h2>Federal Academic Research Funding Sources</h2>
                <p>
                  Federal agencies provide over $40 billion annually in academic research funding. We aggregate grants from NIH ($32B), NSF ($8B), DOE ($7B), DOD ($2B), USDA ($1.5B), and other agencies - all searchable in one place.
                </p>

                <h3>Major Federal Funding Sources</h3>
                <div className="bg-blue-50 p-6 rounded-lg my-6">
                  <h4 className="font-semibold mb-3">Top Federal Agencies for Academic Research:</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>NIH</strong> - 27 institutes funding biomedical research ($32B annually)</li>
                    <li><strong>NSF</strong> - All sciences, engineering, education ($8.5B annually)</li>
                    <li><strong>DOE</strong> - Energy, physics, climate research ($7B annually)</li>
                    <li><strong>DOD</strong> - Defense-related research, DARPA ($2B annually)</li>
                    <li><strong>USDA</strong> - Agriculture, food science ($1.5B annually)</li>
                    <li><strong>EPA</strong> - Environmental research ($500M annually)</li>
                  </ul>
                </div>

                <h3>Grant Types by Career Stage</h3>
                
                <h4>Graduate Students & Postdocs</h4>
                <p>
                  Early career researchers have access to fellowship programs designed to support training and career development. These competitive awards provide salary support and research funding while building independent research skills.
                </p>

                <div className="bg-green-50 p-6 rounded-lg my-6">
                  <h5 className="font-semibold mb-3">Top Postdoc Funding from Federal Agencies:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>NIH F32 Individual Postdoctoral Fellowship ($50-70K/year)</li>
                    <li>NIH K99/R00 Pathway to Independence ($249K + $249K)</li>
                    <li>NSF Postdoctoral Research Fellowships ($54-72K/year)</li>
                    <li>DOE Computational Science Graduate Fellowship</li>
                    <li>NASA Postdoctoral Program ($60-80K/year)</li>
                  </ul>
                </div>

                <h4>Early Career Faculty</h4>
                <p>
                  Assistant professors need startup funding to establish independent research programs. Early career awards provide substantial funding (typically $400K-$2M) over 3-5 years with flexible research directions.
                </p>

                <div className="bg-yellow-50 p-6 rounded-lg my-6">
                  <h5 className="font-semibold mb-3">Early Career Awards Across Agencies:</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>NIH R21 Exploratory Grants ($275K over 2 years)</li>
                    <li>NIH K Awards (K08, K23, K99/R00) ($75-250K/year)</li>
                    <li>NSF CAREER Award ($400-500K over 5 years)</li>
                    <li>DOE Early Career Research Program ($150K/year x 5)</li>
                    <li>DOD Young Investigator Program ($120K/year x 3)</li>
                  </ul>
                </div>

                <h4>Established Faculty</h4>
                <p>
                  Senior researchers pursue larger collaborative grants, center awards, and international partnerships. These programs support major research initiatives, equipment acquisition, and team science approaches.
                </p>

                <h3>Current Federal Research Priorities</h3>
                
                <h4>Cross-Agency Priority Areas</h4>
                <p>
                  Federal agencies align funding with national priorities including climate change, pandemic preparedness, AI/machine learning, quantum computing, and health equity. These areas receive enhanced funding across NIH, NSF, DOE, and DOD.
                </p>

                <h4>Interdisciplinary Research</h4>
                <p>
                  Agencies increasingly fund collaborative grants crossing traditional boundaries. NIH's Common Fund, NSF's Convergence Accelerator, and DOE's Energy Frontier Research Centers exemplify this approach.
                </p>

                <h4>Technology Development</h4>
                <p>
                  Strong emphasis on developing new research tools, methods, and technologies. NIBIB, NSF Engineering, and DARPA lead funding for instrumentation, computational tools, and breakthrough technologies.
                </p>

                <h2>Academic Grant Application Strategies</h2>
                
                <h3>Institutional Support</h3>
                <p>
                  Universities provide grant writing support through research offices, including proposal review, budget development, and compliance assistance. Many institutions offer internal funding to strengthen external applications.
                </p>

                <h3>Collaboration and Partnerships</h3>
                <p>
                  Academic grants increasingly emphasize collaboration between institutions, disciplines, and sectors. Building partnerships with industry, government labs, and international institutions strengthens applications.
                </p>

                <h3>Diversity and Inclusion</h3>
                <p>
                  Funding agencies prioritize diversity in research teams and topics. Programs like NSF's ADVANCE and NIH's diversity supplements provide additional funding to increase participation of underrepresented groups.
                </p>

                <h2>Finding Academic Grants Across All Federal Agencies</h2>
                <p>
                  With over 1,000 academic funding opportunities from NIH, NSF, DOE, and other agencies, finding relevant grants is challenging. Our AI-powered <Link href="/search" className="text-blue-600 hover:text-blue-800 underline">grant search</Link> aggregates all sources and matches opportunities to your research profile.
                </p>

                <div className="bg-indigo-50 p-6 rounded-lg my-6">
                  <h3 className="text-lg font-semibold mb-3">Quick Search Tips:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Filter by career stage (graduate student, postdoc, faculty)</li>
                    <li>Search by research area and methodology</li>
                    <li>Set funding amount ranges based on project needs</li>
                    <li>Track deadlines for timely application submission</li>
                    <li>Save relevant opportunities for future reference</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Popular Academic Grant Categories</h3>
                  <ul className="space-y-2">
                    <li><Link href="/search?category=Fellowship" className="text-blue-600 hover:text-blue-800">NIH Fellowships</Link></li>
                    <li><Link href="/search?category=Training" className="text-blue-600 hover:text-blue-800">Training Grants</Link></li>
                    <li><Link href="/search?category=Research" className="text-blue-600 hover:text-blue-800">Research Project Grants</Link></li>
                    <li><Link href="/search?category=Career" className="text-blue-600 hover:text-blue-800">Career Development</Link></li>
                    <li><Link href="/search?category=Small" className="text-blue-600 hover:text-blue-800">Small Grants</Link></li>
                  </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold mb-4">Funding Statistics</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">1,000+</div>
                      <div className="text-sm text-gray-600">Federal academic grants available</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">$40B+</div>
                      <div className="text-sm text-gray-600">Annual federal research funding</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">5+</div>
                      <div className="text-sm text-gray-600">Federal funding agencies</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Academic Grant FAQ</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm">What types of academic grants are available?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        NIH offers R01s, R21s, K-series career awards, F-series fellowships, and T-series training grants for academic researchers.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm">How do I find postdoc grants?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        Search by research area and NIH institute. Key opportunities include F32 fellowships and K99/R00 pathway awards.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm">Best grants for early career faculty?</h4>
                      <p className="text-xs text-gray-700 mt-1">
                        NIH K-series awards (K08, K23), R21 exploratory grants, and R15 academic research enhancement awards.
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