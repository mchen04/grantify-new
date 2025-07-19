// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { z } from 'npm:zod'

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// API Client configurations
const API_CLIENTS = {
  grants_gov: {
    baseUrl: 'https://api.grants.gov/v1/api/search2',
    rateLimit: 60, // requests per minute
    transform: transformGrantsGov
  },
  nih_reporter: {
    baseUrl: 'https://api.reporter.nih.gov/v2/projects/search',
    rateLimit: 100,
    transform: transformNihReporter
  },
  nsf_awards: {
    baseUrl: 'https://www.research.gov/awardapi-service/v1/awards.json',
    rateLimit: 60,
    transform: transformNsfAwards
  },
  california_grants: {
    baseUrl: 'https://www.grants.ca.gov/api/grantsapi',
    rateLimit: 30,
    transform: transformCaliforniaGrants
  },
  canadian_open_gov: {
    baseUrl: 'https://open.canada.ca/data/api/action/package_search',
    rateLimit: 60,
    transform: transformCanadianOpenGov
  },
  eu_funding: {
    baseUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/data/api/search',
    rateLimit: 30,
    transform: transformEuFunding
  },
  federal_register: {
    baseUrl: 'https://www.federalregister.gov/api/v1/documents.json',
    rateLimit: 100,
    transform: transformFederalRegister
  },
  ny_state: {
    baseUrl: 'https://data.ny.gov/resource/jcbx-khzq.json',
    rateLimit: 60,
    transform: transformNyState
  },
  openalex: {
    baseUrl: 'https://api.openalex.org/funders',
    rateLimit: 100,
    transform: transformOpenAlex
  },
  sam_gov: {
    baseUrl: 'https://api.sam.gov/opportunities/v2/search',
    rateLimit: 60,
    transform: transformSamGov
  },
  ukri_gateway: {
    baseUrl: 'https://gtr.ukri.org/api/funds',
    rateLimit: 60,
    transform: transformUkriGateway
  },
  usaspending: {
    baseUrl: 'https://api.usaspending.gov/api/v2/search/spending_by_award',
    rateLimit: 60,
    transform: transformUsaspending
  },
  world_bank: {
    baseUrl: 'https://search.worldbank.org/api/v2/projects',
    rateLimit: 60,
    transform: transformWorldBank
  }
}

const requestSchema = z.object({
  source: z.string(),
  params: z.record(z.any()).optional(),
  limit: z.number().min(1).max(500).default(100)
})

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { source, params = {}, limit } = requestSchema.parse(body)

    if (!API_CLIENTS[source as keyof typeof API_CLIENTS]) {
      return new Response(
        JSON.stringify({ error: 'Unknown API source' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const client = API_CLIENTS[source as keyof typeof API_CLIENTS]
    const startTime = Date.now()

    // Check rate limiting (simplified - would use Redis in production)
    const rateLimitKey = `rate_limit:${source}:${Math.floor(Date.now() / 60000)}`
    
    try {
      const data = await fetchFromAPI(client, { ...params, limit })
      const grants = await client.transform(data, source)
      
      const duration = Date.now() - startTime

      return new Response(
        JSON.stringify({
          success: true,
          source,
          count: grants.length,
          duration,
          data: grants
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' }
        }
      )

    } catch (error) {
      console.error(`API integration error for ${source}:`, error)
      
      return new Response(
        JSON.stringify({
          success: false,
          source,
          error: error.message,
          duration: Date.now() - startTime
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchFromAPI(client: any, params: any): Promise<any> {
  const url = new URL(client.baseUrl)
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value))
    }
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Grantify.ai/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}

// Transform functions for each data source
async function transformGrantsGov(data: any, sourceId: string): Promise<any[]> {
  const grants = []
  
  if (data.data?.oppHits) {
    for (const item of data.data.oppHits) {
      grants.push({
        data_source: sourceId,
        source_identifier: item.id || item.number,
        title: item.title,
        status: normalizeStatus(item.oppStatus),
        funding_organization_name: item.agency,
        description: item.description || item.synopsis,
        application_deadline: item.closeDate,
        posted_date: item.openDate,
        grant_type: item.docType || 'Grant',
        source_url: `https://www.grants.gov/search-results-detail/${item.id}`,
        raw_data: item
      })
    }
  }
  
  return grants
}

async function transformNihReporter(data: any, sourceId: string): Promise<any[]> {
  const grants = []
  
  if (data.results) {
    for (const item of data.results) {
      grants.push({
        data_source: sourceId,
        source_identifier: item.appl_id?.toString(),
        title: item.project_title,
        status: 'active',
        funding_organization_name: 'National Institutes of Health',
        description: item.abstract_text,
        funding_amount_max: item.award_amount,
        start_date: item.project_start_date,
        end_date: item.project_end_date,
        grant_type: 'Research Grant',
        source_url: `https://reporter.nih.gov/project-details/${item.appl_id}`,
        raw_data: item
      })
    }
  }
  
  return grants
}

async function transformNsfAwards(data: any, sourceId: string): Promise<any[]> {
  const grants = []
  
  if (data.response?.award) {
    for (const item of data.response.award) {
      grants.push({
        data_source: sourceId,
        source_identifier: item.id,
        title: item.title,
        status: 'active',
        funding_organization_name: 'National Science Foundation',
        description: item.abstractText,
        funding_amount_max: item.fundsObligatedAmt,
        start_date: item.date,
        end_date: item.expDate,
        grant_type: 'Research Grant',
        source_url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${item.id}`,
        raw_data: item
      })
    }
  }
  
  return grants
}

async function transformCaliforniaGrants(data: any, sourceId: string): Promise<any[]> {
  // Implementation for California grants API
  return []
}

async function transformCanadianOpenGov(data: any, sourceId: string): Promise<any[]> {
  // Implementation for Canadian Open Government API
  return []
}

async function transformEuFunding(data: any, sourceId: string): Promise<any[]> {
  // Implementation for EU funding API
  return []
}

async function transformFederalRegister(data: any, sourceId: string): Promise<any[]> {
  // Implementation for Federal Register API
  return []
}

async function transformNyState(data: any, sourceId: string): Promise<any[]> {
  // Implementation for NY State API
  return []
}

async function transformOpenAlex(data: any, sourceId: string): Promise<any[]> {
  // Implementation for OpenAlex API
  return []
}

async function transformSamGov(data: any, sourceId: string): Promise<any[]> {
  // Implementation for SAM.gov API
  return []
}

async function transformUkriGateway(data: any, sourceId: string): Promise<any[]> {
  // Implementation for UKRI Gateway API
  return []
}

async function transformUsaspending(data: any, sourceId: string): Promise<any[]> {
  // Implementation for USASpending API
  return []
}

async function transformWorldBank(data: any, sourceId: string): Promise<any[]> {
  // Implementation for World Bank API
  return []
}

function normalizeStatus(status: string): string {
  if (!status) return 'active'
  
  const statusMap: Record<string, string> = {
    'posted': 'active',
    'open': 'active',
    'forecasted': 'forecasted',
    'closed': 'closed',
    'archived': 'archived'
  }
  
  return statusMap[status.toLowerCase()] || 'active'
}