import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Find Similar Grants - Discover Related NIH Opportunities",
  description: "When you find a relevant NIH grant, our similar grants feature helps you discover related opportunities. Expand your funding options with smart recommendations.",
  keywords: [
    "smart grant matching",
    "AI funding recommendations", 
    "intelligent grant search",
    "personalized grant discovery",
    "automated grant matching",
    "grant recommendation engine",
    "AI grant finder"
  ],
  openGraph: {
    title: "Similar Grants - Find Related NIH Funding",
    description: "Discover similar NIH grants based on the opportunities you're viewing. Find related funding options easily.",
    url: "https://grantify.ai/smart-grant-matching",
    type: "article"
  }
};

export default function SmartGrantMatchingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does similar grant discovery work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Similar grant discovery analyzes the characteristics of grants you're viewing - including research area, funding amount, and eligibility criteria - to find related opportunities from the same or adjacent fields."
        }
      },
      {
        "@type": "Question",
        "name": "When should I use similar grants feature?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Use similar grants when you find a relevant opportunity to discover more like it, when a grant deadline has passed, or when you want to build a comprehensive funding pipeline with multiple options."
        }
      },
      {
        "@type": "Question",
        "name": "What types of similar grants will I find?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You'll find grants from the same NIH institute or related ones, grants with similar funding amounts, opportunities in adjacent research areas, and grants with compatible eligibility requirements."
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
        <div className="max-w-4xl mx-auto px-4 py-12">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Similar Grants: Discover Related Opportunities
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              When you find a grant that matches your research, our similar grants feature helps you discover related opportunities you might have missed.
            </p>
          </header>

          <div className="prose prose-lg max-w-none">
            <h2>What is Similar Grant Discovery?</h2>
            <p>
              Similar grant discovery helps you find related funding opportunities based on grants you're already interested in. Using advanced similarity algorithms, we identify grants with comparable research areas, funding amounts, and eligibility criteria.
            </p>

            <div className="bg-indigo-50 p-6 rounded-lg my-6">
              <h3 className="text-lg font-semibold mb-3">Key Features:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Related Opportunities:</strong> Find grants in similar research areas</li>
                <li><strong>Comparable Funding:</strong> See grants with similar award amounts</li>
                <li><strong>Timeline Matching:</strong> Discover grants with compatible deadlines</li>
                <li><strong>Agency Exploration:</strong> Find opportunities from the same NIH institutes</li>
                <li><strong>Expand Your Pipeline:</strong> Build a comprehensive list of potential grants</li>
              </ul>
            </div>

            <h2>How Similar Grant Discovery Works</h2>
            
            <h3>Find Related Research Areas</h3>
            <p>
              When viewing a grant, our system analyzes its research focus and keywords to identify other grants in related fields. This helps you discover interdisciplinary opportunities and adjacent funding sources.
            </p>

            <h3>Match Funding Levels</h3>
            <p>
              Similar grants feature shows opportunities with comparable award amounts, helping you target grants appropriate for your project scale and institutional capacity.
            </p>

            <h3>Compatible Deadlines</h3>
            <p>
              Discover grants with similar application timelines, allowing you to prepare multiple applications efficiently and maximize your funding chances.
            </p>

            <h2>Benefits of Using Similar Grants</h2>
            
            <h3>Comprehensive Coverage</h3>
            <div className="bg-green-50 p-6 rounded-lg my-6">
              <h4 className="font-semibold mb-3">Expand your funding search by finding:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold">Related Opportunities</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Grants in adjacent research areas</li>
                    <li>Interdisciplinary funding options</li>
                    <li>Alternative NIH institutes</li>
                    <li>Different grant mechanisms</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold">Strategic Options</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Backup funding sources</li>
                    <li>Complementary grants</li>
                    <li>Future opportunities</li>
                    <li>Collaborative possibilities</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3>Save Research Time</h3>
            <p>
              Instead of starting new searches from scratch, use similar grants to quickly explore related opportunities. This targeted approach helps you build a comprehensive funding pipeline efficiently.
            </p>

            <h3>Discover Hidden Opportunities</h3>
            <p>
              Many relevant grants use different terminology or fall under unexpected categories. Similar grants feature helps you find these hidden opportunities you might miss with keyword searches alone.
            </p>

            <h2>When to Use Similar Grants</h2>
            
            <div className="overflow-x-auto my-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Scenario</th>
                    <th className="border border-gray-300 p-3 text-left">How Similar Grants Help</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">Found a perfect grant</td>
                    <td className="border border-gray-300 p-3">Discover more opportunities like it</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">Grant deadline passed</td>
                    <td className="border border-gray-300 p-3">Find similar grants with open deadlines</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">Need backup options</td>
                    <td className="border border-gray-300 p-3">Build a pipeline of related opportunities</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold">Exploring new areas</td>
                    <td className="border border-gray-300 p-3">Find grants in adjacent research fields</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>How to Use Similar Grants Effectively</h2>
            
            <h3>Start with a Strong Match</h3>
            <p>
              Begin by finding a grant that closely matches your research interests. The better the initial match, the more relevant the similar grant suggestions will be.
            </p>

            <h3>Explore Different Angles</h3>
            <p>
              Use similar grants to explore different funding mechanisms (R01 vs R21), different NIH institutes, or grants with varying funding levels to find the best fit.
            </p>

            <h3>Build Your Pipeline</h3>
            <p>
              Save interesting similar grants to create a comprehensive funding pipeline. Having multiple options increases your chances of securing funding.
            </p>

            <h2>Real-World Example</h2>
            
            <div className="bg-blue-50 p-6 rounded-lg my-6">
              <h3 className="text-lg font-semibold mb-3">Finding Related NIH Grants</h3>
              <p className="mb-2">
                A researcher interested in an R01 grant for cancer immunotherapy uses the similar grants feature to discover:
              </p>
              <ul className="list-disc list-inside mb-2 space-y-1">
                <li>Related R21 exploratory grants with faster timelines</li>
                <li>K awards for career development in the same field</li>
                <li>Program project grants for collaborative research</li>
                <li>Grants from different NCI divisions they hadn't considered</li>
              </ul>
              <p>
                <strong>Result:</strong> Built a comprehensive funding strategy with multiple opportunities at different funding levels.
              </p>
            </div>

            <h2>Tips for Finding the Best Similar Grants</h2>
            
            <h3>Look Beyond the Obvious</h3>
            <p>
              Similar grants might come from different NIH institutes or use different grant mechanisms. Be open to exploring opportunities you hadn't initially considered.
            </p>

            <h3>Compare Deadlines</h3>
            <p>
              Use similar grants to find opportunities with staggered deadlines, allowing you to submit multiple applications throughout the year.
            </p>

            <h3>Consider Funding Levels</h3>
            <p>
              Similar grants with different funding amounts can help you find opportunities that better match your project scope and institutional resources.
            </p>

            <h2>Start Finding Similar Grants</h2>
            <p>
              Expand your funding opportunities with our similar grants feature. <Link href="/search" className="text-blue-600 hover:text-blue-800 underline">Search for grants</Link> and discover related opportunities to build your funding pipeline.
            </p>

            <div className="bg-yellow-50 p-6 rounded-lg my-8">
              <h3 className="text-lg font-semibold mb-3">Similar Grants FAQ</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">How does similar grant discovery work?</h4>
                  <p className="text-sm text-gray-700">
                    Our system analyzes grant characteristics including research area, funding amount, and eligibility to find related opportunities that match your interests.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">When should I use similar grants?</h4>
                  <p className="text-sm text-gray-700">
                    Use it when you find a relevant grant to discover more opportunities, when a deadline has passed, or when building a comprehensive funding pipeline.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold">What types of similar grants will I see?</h4>
                  <p className="text-sm text-gray-700">
                    You'll see grants from the same or related NIH institutes, with comparable funding levels, similar research areas, and compatible eligibility requirements.
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