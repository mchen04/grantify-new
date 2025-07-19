// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { z } from 'npm:zod'

// Grant data source types
interface DataSource {
  id: string
  name: string
  display_name: string
  api_type: string
  base_url: string
  auth_type: string
  auth_credentials?: any
  update_frequency: string
  geographic_coverage?: string
  is_active: boolean
  rate_limit_per_minute?: number
  metadata: any
}

interface GrantData {
  data_source_id: string
  source_identifier: string
  source_url?: string
  title: string
  status: string
  funding_organization_name?: string
  currency?: string
  funding_amount_min?: number
  funding_amount_max?: number
  total_funding_available?: number
  posted_date?: string
  application_deadline?: string
  start_date?: string
  end_date?: string
  grant_type?: string
  funding_instrument?: string
  summary?: string
  description?: string
  geographic_scope?: string
  raw_data?: any
}

// Schema validation
const syncRequestSchema = z.object({
  data_source_id: z.string().optional(),
  sync_type: z.enum(['full', 'incremental']).default('incremental'),
  force: z.boolean().default(false)
})

// Initialize Supabase client with service role key for database operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { data_source_id, sync_type, force } = syncRequestSchema.parse(body)

    console.log('Starting grant sync:', { data_source_id, sync_type, force })

    // Get active data sources
    const { data: dataSources, error: dsError } = await supabase
      .from('data_sources')
      .select('*')
      .eq('is_active', true)
      .modify((query) => {
        if (data_source_id) {
          query.eq('id', data_source_id)
        }
      })

    if (dsError) throw dsError

    if (!dataSources || dataSources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active data sources found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Process each data source
    for (const dataSource of dataSources) {
      const result = await syncDataSource(dataSource, sync_type, force)
      results.push(result)
    }

    return new Response(
      JSON.stringify({
        message: 'Sync completed',
        results,
        summary: {
          total_sources: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

async function syncDataSource(dataSource: DataSource, syncType: string, force: boolean) {
  const startTime = Date.now()
  
  try {
    console.log(`Starting sync for ${dataSource.name}`)

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('api_sync_logs')
      .insert({
        data_source_id: dataSource.id,
        sync_type: 'manual',
        status: 'started'
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create sync log:', logError)
    }

    // Fetch grants from the data source
    const grants = await fetchGrantsFromSource(dataSource)
    
    let recordsCreated = 0
    let recordsUpdated = 0
    let recordsFailed = 0

    // Process each grant
    for (const grantData of grants) {
      try {
        const result = await upsertGrant(grantData)
        if (result.created) {
          recordsCreated++
        } else {
          recordsUpdated++
        }
      } catch (error) {
        console.error(`Failed to process grant ${grantData.source_identifier}:`, error)
        recordsFailed++
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000)

    // Update sync log
    if (syncLog) {
      await supabase
        .from('api_sync_logs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: duration,
          records_fetched: grants.length,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_failed: recordsFailed
        })
        .eq('id', syncLog.id)
    }

    // Update data source last sync time
    await supabase
      .from('data_sources')
      .update({ last_successful_sync: new Date().toISOString() })
      .eq('id', dataSource.id)

    return {
      success: true,
      dataSource: dataSource.name,
      records: {
        fetched: grants.length,
        created: recordsCreated,
        updated: recordsUpdated,
        failed: recordsFailed
      },
      duration
    }

  } catch (error) {
    console.error(`Sync failed for ${dataSource.name}:`, error)
    
    return {
      success: false,
      dataSource: dataSource.name,
      error: error.message,
      duration: Math.floor((Date.now() - startTime) / 1000)
    }
  }
}

async function fetchGrantsFromSource(dataSource: DataSource): Promise<GrantData[]> {
  // This is a simplified implementation - you would implement specific
  // API clients for each data source based on your existing clients
  
  const grants: GrantData[] = []
  
  try {
    switch (dataSource.name) {
      case 'grants_gov':
        return await fetchGrantsGov(dataSource)
      case 'nih_reporter':
        return await fetchNihReporter(dataSource)
      case 'nsf_awards':
        return await fetchNsfAwards(dataSource)
      default:
        console.log(`No specific client for ${dataSource.name}, using generic fetch`)
        return await fetchGeneric(dataSource)
    }
  } catch (error) {
    console.error(`Failed to fetch from ${dataSource.name}:`, error)
    return []
  }
}

async function fetchGrantsGov(dataSource: DataSource): Promise<GrantData[]> {
  const response = await fetch(dataSource.base_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      oppStatuses: 'posted',
      rows: 100,
      sortBy: 'openDate:desc'
    })
  })

  if (!response.ok) {
    throw new Error(`Grants.gov API error: ${response.status}`)
  }

  const data = await response.json()
  const grants: GrantData[] = []

  if (data.data?.oppHits) {
    for (const grant of data.data.oppHits) {
      grants.push({
        data_source_id: dataSource.id,
        source_identifier: grant.id || grant.number,
        source_url: `https://www.grants.gov/search-results-detail/${grant.id}`,
        title: grant.title,
        status: normalizeStatus(grant.oppStatus || 'posted'),
        funding_organization_name: grant.agency,
        currency: 'USD',
        posted_date: grant.openDate,
        application_deadline: grant.closeDate,
        grant_type: grant.docType || 'Grant',
        description: grant.description || grant.synopsis || '',
        raw_data: grant
      })
    }
  }

  return grants
}

async function fetchNihReporter(dataSource: DataSource): Promise<GrantData[]> {
  // Implement NIH RePORTER API integration
  return []
}

async function fetchNsfAwards(dataSource: DataSource): Promise<GrantData[]> {
  // Implement NSF Awards API integration
  return []
}

async function fetchGeneric(dataSource: DataSource): Promise<GrantData[]> {
  // Generic HTTP fetch for other sources
  const response = await fetch(dataSource.base_url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  // This would need to be customized based on the API response format
  return []
}

async function upsertGrant(grantData: GrantData): Promise<{ created: boolean }> {
  // Check if grant already exists
  const { data: existing } = await supabase
    .from('grants')
    .select('id')
    .eq('data_source_id', grantData.data_source_id)
    .eq('source_identifier', grantData.source_identifier)
    .single()

  if (existing) {
    // Update existing grant
    const { error } = await supabase
      .from('grants')
      .update({
        ...grantData,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) throw error
    return { created: false }
  } else {
    // Insert new grant
    const { error } = await supabase
      .from('grants')
      .insert({
        ...grantData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })

    if (error) throw error
    return { created: true }
  }
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'posted': 'active',
    'open': 'active',
    'closed': 'closed',
    'archived': 'archived',
    'forecasted': 'forecasted'
  }
  
  return statusMap[status.toLowerCase()] || 'active'
}