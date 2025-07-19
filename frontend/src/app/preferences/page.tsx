"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DEADLINE_RANGES } from '@/lib/config';
import supabase from '@/lib/supabaseClient';
import SettingsLayout from '@/components/features/settings/SettingsLayout';
import { Button } from '@/components/ui/Button';
import supabaseApiClient from '@/lib/supabaseApiClient';

export default function Preferences() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // AI Matching - Most important since it captures most use cases
  const [projectDescription, setProjectDescription] = useState<string>('');
  
  // Funding preferences with toggle
  const [fundingMatters, setFundingMatters] = useState<boolean>(true);
  const [fundingMin, setFundingMin] = useState<number>(0);
  const [fundingMax, setFundingMax] = useState<number>(1000000);
  
  // Timing preferences with toggles
  const [deadlineMatters, setDeadlineMatters] = useState<boolean>(true);
  const [deadlineRange, setDeadlineRange] = useState<string>('0');
  const [projectPeriodMatters, setProjectPeriodMatters] = useState<boolean>(false);
  const [projectPeriodMin, setProjectPeriodMin] = useState<number>(1);
  const [projectPeriodMax, setProjectPeriodMax] = useState<number>(5);
  
  // Agency preferences with toggle
  const [agencyMatters, setAgencyMatters] = useState<boolean>(false);
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [availableAgencies, setAvailableAgencies] = useState<string[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);


  // Toggle agency selection
  const toggleAgency = (agency: string) => {
    if (selectedAgencies.includes(agency)) {
      setSelectedAgencies(selectedAgencies.filter(a => a !== agency));
    } else {
      setSelectedAgencies([...selectedAgencies, agency]);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Fetch available agencies from the API
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        setLoadingAgencies(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        
        const agenciesRes = await fetch(`${apiUrl}/grants/agencies/list`);
        
        if (agenciesRes.ok) {
          const agenciesData = await agenciesRes.json();
          setAvailableAgencies(agenciesData.agencies || []);
        }
      } catch (error) {
        
      } finally {
        setLoadingAgencies(false);
      }
    };

    fetchAgencies();
  }, []);

  // Load user preferences from Supabase
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setMessage(null);

        const response = await supabaseApiClient.users.getUserPreferences(user.id);
        const data = response.data;
        const error = response.error;

        if (data) {
          // Load simplified preferences
          setProjectDescription(data.project_description_query || '');
          setFundingMin(data.funding_min || 0);
          setFundingMax(data.funding_max || 1000000);
          setFundingMatters(data.funding_min !== null || data.funding_max !== null);
          setDeadlineRange(data.deadline_range || '0');
          setDeadlineMatters(data.deadline_range !== null);
          setProjectPeriodMin(data.project_period_min_years || 1);
          setProjectPeriodMax(data.project_period_max_years || 5);
          setProjectPeriodMatters(data.project_period_min_years !== null || data.project_period_max_years !== null);
          setSelectedAgencies(data.agencies || []);
          setAgencyMatters((data.agencies || []).length > 0);
        } else {
          setMessage({ type: 'info', text: 'No preferences set yet. Using default values.' });
        }
      } catch (error: any) {
        
        setMessage({ type: 'error', text: `Failed to load preferences: ${error.message || 'An unknown error occurred'}` });
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const preferences = {
        user_id: user.id,
        project_description_query: projectDescription,
        funding_min: fundingMatters ? fundingMin : null,
        funding_max: fundingMatters ? fundingMax : null,
        deadline_range: deadlineMatters ? deadlineRange : null,
        project_period_min_years: projectPeriodMatters ? projectPeriodMin : null,
        project_period_max_years: projectPeriodMatters ? projectPeriodMax : null,
        agencies: agencyMatters ? selectedAgencies : [],
        updated_at: new Date().toISOString(),
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const result = await supabaseApiClient.users.updateUserPreferences(user.id, preferences);

      if (result.error) {
        throw new Error(result.error);
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully' });
      setTimeout(() => setMessage(null), 3000);
      
      // Trigger dashboard refresh by dispatching a custom event with a small delay
      // This ensures all listeners are properly set up
      setTimeout(() => {
        const event = new CustomEvent('preferencesUpdated', { 
          detail: { 
            timestamp: Date.now(),
            userId: user.id 
          },
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(event);
        
        // Also set a flag in localStorage as a failsafe
        localStorage.setItem('preferencesUpdated', JSON.stringify({
          timestamp: Date.now(),
          userId: user.id
        }));
      }, 100); // 100ms delay to ensure listeners are ready
    } catch (error: any) {
      
      setMessage({ type: 'error', text: `Failed to save preferences: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SettingsLayout
      title="Preferences"
      description="Set your essential preferences - let AI handle the rest through your project description"
    >
      {message && (
        <div className={`p-4 mb-8 rounded-lg border ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
            'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* AI-Powered Matching Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Research Matching</h2>
                <p className="text-gray-600">
                  Describe your research, career stage, and goals. Our AI will automatically identify relevant grants, 
                  eligible applicant types, keywords, and funding opportunities.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-3">
                Research & Project Description *
              </label>
              <textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Example: I'm a postdoc at a university developing AI-powered diagnostic tools for early cancer detection. My research focuses on machine learning applications in medical imaging and biomarker analysis. I'm looking for grants that support early-stage investigators in biomedical research, particularly those that fund innovative computational approaches to healthcare. I'm interested in both small pilot grants ($50K-$500K) and larger R01-style awards that support multi-year research programs."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                rows={6}
                maxLength={1000}
                required
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Include your role, research area, eligibility status, keywords, and funding needs
                </p>
                <span className="text-xs text-gray-500">{projectDescription.length}/1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Funding Constraints */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Funding Amount Constraints</h2>
                  <p className="text-gray-600">Set specific funding requirements for your research</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">This matters to me</span>
                <input
                  type="checkbox"
                  id="funding-matters-toggle"
                  checked={fundingMatters}
                  onChange={(e) => setFundingMatters(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>

            <div className={`transition-all duration-200 ${fundingMatters ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fundingMin" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Award Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none z-10">$</span>
                    <input
                      type="number"
                      id="fundingMin"
                      value={fundingMin}
                      onChange={(e) => setFundingMin(parseInt(e.target.value) || 0)}
                      min="0"
                      step="10000"
                      disabled={!fundingMatters}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="fundingMax" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Award Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none z-10">$</span>
                    <input
                      type="number"
                      id="fundingMax"
                      value={fundingMax}
                      onChange={(e) => setFundingMax(parseInt(e.target.value) || 0)}
                      min="0"
                      step="50000"
                      disabled={!fundingMatters}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
              {fundingMatters && (
                <p className="mt-4 text-sm text-gray-600">
                  Current range: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(fundingMin)} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(fundingMax)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Timing Constraints */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Deadlines</h2>
                  <p className="text-gray-600">Set preferred deadline timeline for grant applications</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">This matters to me</span>
                <input
                  type="checkbox"
                  id="deadline-matters-toggle"
                  checked={deadlineMatters}
                  onChange={(e) => setDeadlineMatters(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>

            <div className={`transition-all duration-200 ${deadlineMatters ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <label htmlFor="deadlineRange" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Deadline Timeline
                </label>
                <select
                  id="deadlineRange"
                  value={deadlineRange}
                  onChange={(e) => setDeadlineRange(e.target.value)}
                  disabled={!deadlineMatters}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {DEADLINE_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Project Duration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Duration</h2>
                  <p className="text-gray-600">Specify required project timeline in years</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">This matters to me</span>
                <input
                  type="checkbox"
                  id="project-period-matters-toggle"
                  checked={projectPeriodMatters}
                  onChange={(e) => setProjectPeriodMatters(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>

            <div className={`transition-all duration-200 ${projectPeriodMatters ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="projectPeriodMin" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Duration (years)
                  </label>
                  <input
                    type="number"
                    id="projectPeriodMin"
                    value={projectPeriodMin}
                    onChange={(e) => setProjectPeriodMin(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    disabled={!projectPeriodMatters}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label htmlFor="projectPeriodMax" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Duration (years)
                  </label>
                  <input
                    type="number"
                    id="projectPeriodMax"
                    value={projectPeriodMax}
                    onChange={(e) => setProjectPeriodMax(parseInt(e.target.value) || 5)}
                    min="1"
                    max="10"
                    disabled={!projectPeriodMatters}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agency Preferences */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Specific Funding Agencies</h2>
                  <p className="text-gray-600">Select only if you have specific institutional requirements</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">I have specific agencies</span>
                <input
                  type="checkbox"
                  id="agency-matters-toggle"
                  checked={agencyMatters}
                  onChange={(e) => {
                    setAgencyMatters(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedAgencies([]);
                    }
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            </div>

            <div className={`transition-all duration-200 ${agencyMatters ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {!agencyMatters && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Recommended:</strong> Leave this disabled unless you have specific agency requirements. 
                    The AI can identify relevant agencies from your project description.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Funding Agencies
                </label>
                {loadingAgencies ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {availableAgencies.map((agency) => (
                      <label key={agency} className="flex items-center cursor-pointer hover:bg-white p-3 rounded-md transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAgencies.includes(agency)}
                          onChange={() => toggleAgency(agency)}
                          disabled={!agencyMatters}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-700">{agency}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={saving}
            variant="primary"
            size="lg"
            className="min-w-48"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving Preferences...
              </span>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  );
}