import { http, HttpResponse } from 'msw'

// Mock data
const mockGrants = [
  {
    id: 'grant-1',
    title: 'Cancer Research Initiative Grant',
    agency: 'National Cancer Institute',
    closeDate: '2024-12-31',
    fundingAmount: 500000,
    description: 'Supporting innovative cancer research projects with focus on immunotherapy and precision medicine.',
    categories: ['Health', 'Research', 'Cancer'],
    sourceUrl: 'https://grants.nih.gov/grants/guide/pa-files/PAR-24-001.html',
    opportunityId: 'PAR-24-001',
    eligibleApplicantTypes: ['Academic Institutions', 'Research Organizations'],
    costSharing: false,
    clinicalTrialAllowed: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'grant-2',
    title: 'Environmental Science Research Program',
    agency: 'Environmental Protection Agency',
    closeDate: '2024-11-30',
    fundingAmount: 750000,
    description: 'Research grants for environmental protection and sustainability studies.',
    categories: ['Environment', 'Research', 'Sustainability'],
    sourceUrl: 'https://epa.gov/research-grants/environmental-research',
    opportunityId: 'EPA-ENV-2024',
    eligibleApplicantTypes: ['Universities', 'Non-profits'],
    costSharing: true,
    clinicalTrialAllowed: false,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
]

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  created_at: '2024-01-01T00:00:00Z',
}

const mockStats = {
  grants: {
    total: 2584,
    active: 2156,
    uniqueAgencies: 45,
    totalFunding: 265000000,
    dataSources: 51,
    expiringTwoWeeks: 11,
    expiringOneWeek: 5,
    expiringThreeDays: 2,
    totalRounded: 500,
    totalFundingDisplay: 265,
  },
  users: {
    total: 10847,
    active: 8932,
    totalInteractions: 156789,
  },
  metrics: {
    matchAccuracy: 94.5,
    avgTimeSaved: 36,
    successRate: 87.3,
    grantsSecured: 1247,
  },
}

export const handlers = [
  // Grant search API
  http.get('/api/grants', ({ request }) => {
    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('searchTerm')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    // Filter grants based on search term
    let filteredGrants = mockGrants
    if (searchTerm) {
      filteredGrants = mockGrants.filter(grant =>
        grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.agency.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedGrants = filteredGrants.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      grants: paginatedGrants,
      pagination: {
        page,
        limit,
        total: filteredGrants.length,
        pages: Math.ceil(filteredGrants.length / limit),
      },
      filters: {
        agencies: ['National Cancer Institute', 'Environmental Protection Agency'],
        categories: ['Health', 'Research', 'Environment'],
        fundingRanges: ['$100K-$500K', '$500K-$1M'],
      },
    })
  }),

  // Individual grant API
  http.get('/api/grants/:id', ({ params }) => {
    const grant = mockGrants.find(g => g.id === params.id)
    if (!grant) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(grant)
  }),

  // Stats API
  http.get('/api/stats', () => {
    return HttpResponse.json(mockStats)
  }),

  // User interactions API
  http.post('/api/user-interactions', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      id: `interaction-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    })
  }),

  http.get('/api/user-interactions', () => {
    return HttpResponse.json([
      {
        id: 'interaction-1',
        grantId: 'grant-1',
        type: 'saved',
        createdAt: '2024-01-15T10:00:00Z',
      },
    ])
  }),

  // Dashboard API
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      savedGrants: [mockGrants[0]],
      appliedGrants: [],
      recommendations: [mockGrants[1]],
      recentActivity: [
        {
          id: 'activity-1',
          type: 'saved',
          grantTitle: 'Cancer Research Initiative Grant',
          timestamp: '2024-01-15T10:00:00Z',
        },
      ],
      stats: {
        savedCount: 1,
        appliedCount: 0,
        viewedCount: 5,
      },
    })
  }),

  // Health check API
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  }),

  // Filter options API
  http.get('/api/filter-options', () => {
    return HttpResponse.json({
      agencies: ['National Cancer Institute', 'Environmental Protection Agency'],
      categories: ['Health', 'Research', 'Environment', 'Cancer', 'Sustainability'],
      fundingRanges: [
        { min: 0, max: 100000, label: '$0-$100K' },
        { min: 100000, max: 500000, label: '$100K-$500K' },
        { min: 500000, max: 1000000, label: '$500K-$1M' },
      ],
      eligibleApplicantTypes: [
        'Academic Institutions',
        'Research Organizations', 
        'Universities',
        'Non-profits',
      ],
    })
  }),

  // Authentication endpoints (mocking Supabase responses)
  http.post('/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    })
  }),

  http.get('/auth/v1/user', () => {
    return HttpResponse.json(mockUser)
  }),

  // Error scenarios for testing
  http.get('/api/grants/error', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  http.get('/api/grants/network-error', () => {
    return HttpResponse.error()
  }),
]