import React from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// Icon components
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

export default function AboutPage() {
  return (
    <Layout fullWidth>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-blue-50 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-20 animate-pulse-slow" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-20 animate-pulse-slow" />
        </div>
        
        <div className="container mx-auto px-4 pt-2 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="primary" className="mb-4">About Us</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Democratizing Access to
              <span className="text-primary-600"> Grant Funding</span>
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Grantify.ai leverages advanced AI and machine learning to instantly match researchers with relevant grants from 2,000+ opportunities, eliminating weeks of manual searching.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
                <div className="space-y-4 text-gray-600">
                  <p className="text-lg leading-relaxed">
                    After seeing researchers waste 6+ weeks per year manually searching grant databases and missing 73% of relevant opportunities, I knew there had to be a better way. Traditional grant searching is broken—it's time-consuming, inefficient, and frustrating.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Grantify.ai was born from the conviction that AI could transform grant discovery. By combining machine learning, natural language processing, and semantic matching, we've created a platform that finds relevant grants in 30 seconds instead of 6 weeks.
                  </p>
                  <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded-r-lg">
                    <p className="font-semibold text-primary-900">
                      Our mission is simple: democratize access to funding by making grant discovery as easy as a Google search.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-100 to-blue-100 rounded-2xl p-8 shadow-xl">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="text-success-500 mt-1">
                        <CheckIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">2,000+ Active Grants</h3>
                        <p className="text-gray-600">Real-time sync with multiple databases</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-success-500 mt-1">
                        <CheckIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">30 Second Matching</h3>
                        <p className="text-gray-600">AI finds relevant grants in seconds, not weeks</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-success-500 mt-1">
                        <CheckIcon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">85% Match Accuracy</h3>
                        <p className="text-gray-600">Semantic analysis ensures relevant results</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What Makes Us Different</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Cutting-edge AI technology meets user-centered design to create the most effective grant discovery platform
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="card-feature group">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <SparklesIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-Powered Matching</h3>
                <p className="text-gray-600 leading-relaxed">
                  Advanced AI with custom embeddings analyzes your research description and semantically matches it to 2,000+ grants using cutting-edge NLP techniques.
                </p>
              </div>
              
              <div className="card-feature group">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheckIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Automated Data Pipeline</h3>
                <p className="text-gray-600 leading-relaxed">
                  Robust Node.js scraping system with deduplication, HTML sanitization, and batch scheduling ensures clean, reliable grant data from multiple sources.
                </p>
              </div>
              
              <div className="card-feature group">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <DatabaseIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Enterprise-Grade Security</h3>
                <p className="text-gray-600 leading-relaxed">
                  Production-ready platform with JWT authentication, RLS, CSRF protection, rate limiting, and real-time capabilities powered by Supabase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">Meet the Founder</h2>
            
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-xl overflow-hidden">
              <div className="md:flex">
                <div className="md:w-2/5 bg-gradient-to-br from-primary-600 to-primary-700 p-8 text-white flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-primary-600 text-4xl font-bold mb-4 shadow-lg">
                    MC
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Michael Chen</h3>
                  <p className="text-primary-100 text-center mb-1">Computer Science, B.S.</p>
                  <p className="text-primary-100 text-center mb-1">Entrepreneurship & Strategy Minor</p>
                  <p className="text-primary-100 text-center mb-4">UC Riverside '26 • GPA: 3.70</p>
                  <Badge variant="warning" className="bg-white text-primary-700">
                    AMD AI Contest Winner
                  </Badge>
                </div>
                
                <div className="md:w-3/5 p-8">
                  <div className="space-y-6">
                    <p className="text-gray-700 text-lg leading-relaxed">
                      I created Grantify.ai to solve the grant discovery problem after experiencing firsthand how inefficient traditional searching methods are. With expertise in AI, machine learning, and full-stack development, I built this platform to democratize access to funding opportunities.
                    </p>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                        Background
                      </h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckIcon />
                          <span>Part-Time Software Engineer at MobiVolt LLC (June 2023 - Present)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckIcon />
                          <span>Founder & President of AI at UCR (AIR) - 50+ members</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckIcon />
                          <span>Stanford AI Certifications: ML, Advanced Algorithms, Reinforcement Learning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckIcon />
                          <span>Expert in Python, TypeScript, React, Node.js, PostgreSQL, AI/ML</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                        Achievements
                      </h4>
                      <div className="space-y-3 text-gray-600">
                        <p>
                          <strong>AMD University Program Award (2024):</strong> PHiLIP (Personalized Human in Loop Image Production) - AI-powered image generation with 71 styles and user-guided adjustments, showcased at AMD Advancing AI Event in San Francisco.
                        </p>
                        <p>
                          <strong>Current Grantify.ai Impact:</strong> Built production-ready platform serving 2,000+ grants with 85% match accuracy, featuring enterprise security, real-time updates, and intelligent caching.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">Connect With Me</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="card p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h3>
                <p className="text-gray-600 mb-6">
                  Have questions, feedback, or suggestions? I'd love to hear from you!
                </p>
                
                <div className="space-y-4">
                  <a href="mailto:michaelluochen1@gmail.com" className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <MailIcon />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">michaelluochen1@gmail.com</p>
                    </div>
                  </a>
                  
                  <a href="https://www.linkedin.com/in/michael-luo-chen" target="_blank" rel="noopener noreferrer" 
                     className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <LinkedInIcon />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">LinkedIn</p>
                      <p className="font-medium text-gray-900">linkedin.com/in/michael-luo-chen</p>
                    </div>
                  </a>
                </div>
              </div>
              
              <div className="card p-8 bg-gradient-to-br from-primary-50 to-white border-primary-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Career Opportunities</h3>
                <p className="text-gray-700 mb-4">
                  Currently seeking full-time opportunities (Summer 2026 graduation) in:
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Badge variant="primary" className="justify-center py-2">Software Engineering</Badge>
                  <Badge variant="primary" className="justify-center py-2">AI/ML Engineering</Badge>
                  <Badge variant="primary" className="justify-center py-2">Full-Stack Development</Badge>
                  <Badge variant="primary" className="justify-center py-2">Product Engineering</Badge>
                </div>
                <Button href="/" size="lg" className="w-full">
                  Back to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}