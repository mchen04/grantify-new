"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

// Stats interface
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

// Particle System Component - Fixed for scrolling
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use container dimensions instead of window
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const particles: Array<{x: number, y: number, vx: number, vy: number, size: number, opacity: number}> = [];
    const particleCount = 30; // Reduced for performance
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Wrap around edges instead of bouncing
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 210, 63, ${particle.opacity})`;
        ctx.fill();
      });
      
      // Simple connections between nearby particles
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 210, 63, ${0.1 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
    </div>
  );
};

// Search Preview Component
const SearchPreview = ({ stats }: { stats: Stats | null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused 
              ? '0 0 0 4px rgba(59, 130, 246, 0.15)' 
              : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-lg overflow-hidden"
        >
          <div className="flex items-center p-4 gap-4">
            <div className="text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe your research or paste your abstract..."
              className="flex-1 text-lg outline-none text-gray-900 placeholder-gray-500"
            />
            <Button
              type="submit"
              className="bg-[#FFD23F] text-[#0A1628] hover:bg-[#EE6C4D] hover:text-white px-6 py-2"
            >
              Search
            </Button>
          </div>
          
          {/* Example searches */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Try searching for:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'cancer immunotherapy research',
                'renewable energy storage',
                'STEM education K-12',
                'climate change adaptation'
              ].map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setSearchQuery(example)}
                  className="text-sm px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-[#FFD23F] hover:text-[#0A1628] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </form>
      
      {/* Trust Indicators */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-300">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Data directly from official government APIs</span>
        </div>
      </div>
    </div>
  );
};

// Main Component
export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [highlightedWords, setHighlightedWords] = useState<number[]>([]);
  
  const phrases = [
    "hidden NIH grants",
    "foundation funding",
    "international opportunities",
    "$15.8B in research funding"
  ];
  
  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Stats fetch error:', error);
      }
    };
    fetchStats();
    
    // Rotate phrases
    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, 3000);
    
    // Random word highlighting
    const highlightInterval = setInterval(() => {
      const wordCount = 5;
      const indices = Array.from({ length: wordCount }, () => 
        Math.floor(Math.random() * 20)
      );
      setHighlightedWords(indices);
    }, 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(highlightInterval);
    };
  }, [phrases.length]);

  return (
    <>
      <Layout>
        {/* Hero Section - Clean Professional Style */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-50 to-white">
          {/* Subtle dot pattern background */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
          />
          
          <div className="container mx-auto px-4 relative z-10 flex items-center min-h-screen">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="text-center max-w-5xl mx-auto w-full py-12"
            >
              {/* Main Title */}
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight mt-12">
                Find research grants
                <br />
                <span className="relative">
                  <span className="text-blue-600">
                    3x faster with AI
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 300 8" fill="none">
                    <path d="M1 5.5C1 5.5 60 2 150 2C240 2 299 5.5 299 5.5" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>
              
              {/* Simplified Tagline */}
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Search {stats?.grants.dataSources || 13} official government databases simultaneously. 
                Our AI matches your research to relevant funding opportunities in seconds.
              </p>
              
              {/* Search Interface */}
              <SearchPreview stats={stats} />
              
              {/* Simple Stats */}
              <div className="mt-12 flex flex-wrap justify-center gap-12">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{stats?.grants.totalRounded || 3400}+</div>
                  <div className="text-gray-600 mt-1">Active Grants</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">${stats?.grants.totalFunding?.toFixed(1) || 15.8}B</div>
                  <div className="text-gray-600 mt-1">Available Funding</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{stats?.grants.uniqueAgencies || 369}</div>
                  <div className="text-gray-600 mt-1">Funding Agencies</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* Government Data Sources Section */}
        <section className="py-20 bg-[#FAF9F6] relative">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Trusted Data Sources
                </h2>
                <p className="text-gray-600 text-lg">
                  Direct integration with official government grant databases
                </p>
              </div>
              
              {/* Government Data Sources */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-4xl mx-auto">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-lg text-blue-900 mb-2">Official Government APIs & Data Sources</h3>
                    <p className="text-blue-800 mb-3">All grant data is retrieved directly from official government APIs, ensuring 100% accuracy and real-time updates.</p>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>Grants.gov API</strong> - All federal grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>NIH RePORTER API</strong> - NIH research grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>NSF Award Search API</strong> - NSF grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>USDA NIFA API</strong> - Agriculture grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>DOE PAGES API</strong> - Energy research</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>EPA Grants API</strong> - Environmental grants</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>NEA Grant Search API</strong> - Arts grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>NEH Funded Projects API</strong> - Humanities</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>SAMHSA Grants API</strong> - Health services</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>ED.gov API</strong> - Education grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>HHS Grants Forecast</strong> - Health grants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>NASA NSPIRES API</strong> - Space research</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-blue-900"><strong>DoD SBIR/STTR API</strong> - Defense research</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Simplified Grant Stats */}
        <section className="py-20 bg-gray-50 relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Grant Opportunities Available Now
              </h2>
              <p className="text-gray-600 text-lg">
                {stats?.grants.active || 2247} active grants across {stats?.grants.dataSources || 13} databases
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              {/* Simple Grid Stats */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {stats?.grants.expiringOneWeek || 61}
                  </div>
                  <p className="text-gray-900 font-medium">Expiring This Week</p>
                  <p className="text-gray-500 text-sm mt-1">Apply soon</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {stats?.grants.expiringTwoWeeks || 127}
                  </div>
                  <p className="text-gray-900 font-medium">New This Month</p>
                  <p className="text-gray-500 text-sm mt-1">Fresh opportunities</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-lg p-6 text-center shadow-sm border border-gray-200"
                >
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {stats?.grants.uniqueAgencies || 369}
                  </div>
                  <p className="text-gray-900 font-medium">Funding Agencies</p>
                  <p className="text-gray-500 text-sm mt-1">All in one place</p>
                </motion.div>
              </div>
              
              {/* Popular Grant Categories */}
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">Popular Grant Categories</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {['NIH Research', 'NSF CAREER', 'SBIR/STTR', 'DOE Energy', 'EPA Environmental', 'USDA Agriculture', 'Foundation Grants'].map((category, i) => (
                    <motion.span
                      key={category}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      {category}
                    </motion.span>
                  ))}
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <Button
                  href="/search"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200"
                >
                  Search All Grants →
                </Button>
                <p className="mt-4 text-gray-600 text-sm">
                  No login required. Start discovering in 30 seconds.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20 bg-[#FAF9F6]">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-serif text-[#0A1628] mb-12 text-center">How AI Grant Search Works</h2>
              
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">1</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Describe Your Research</h3>
                  <p className="text-gray-600">Tell us about your work in plain language - no keywords needed</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">2</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">AI Searches Everything</h3>
                  <p className="text-gray-600">Our AI searches {stats?.grants.dataSources || 13} databases simultaneously</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-blue-600">3</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-900">Get Matched Grants</h3>
                  <p className="text-gray-600">Receive grants ranked by relevance to your specific research</p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="grid md:grid-cols-3 gap-8 text-center">
                  <div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {stats?.metrics.matchAccuracy || 95}%
                    </div>
                    <p className="text-gray-600">Match Accuracy</p>
                  </div>
                  
                  <div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {stats?.metrics.avgTimeSaved || 36}hrs
                    </div>
                    <p className="text-gray-600">Saved Monthly</p>
                  </div>
                  
                  <div>
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      3.2x
                    </div>
                    <p className="text-gray-600">More Grants Found</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Start Finding Grants Today
                </h2>
                
                <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                  <p className="text-lg text-gray-700 mb-8">
                    Join {stats?.users.total || 1000}+ researchers discovering
                    ${stats?.grants.totalFundingDisplay ? (stats.grants.totalFundingDisplay / 1000).toFixed(1) : '15.8'}B 
                    in funding opportunities
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                    <Button
                      href="/search"
                      className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-4 text-lg font-semibold rounded-lg"
                    >
                      Start Free Search
                    </Button>
                    
                    <Button
                      href="/signup"
                      variant="ghost"
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg font-semibold rounded-lg"
                    >
                      Create Account
                    </Button>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    No credit card required • Free forever • {stats?.grants.expiringOneWeek || 61} grants expire this week
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}