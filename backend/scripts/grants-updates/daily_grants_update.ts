import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Data source UUID mappings
const DATA_SOURCE_IDS = {
  'grants_gov': '35662128-107f-450c-904e-feaeba3caa2c',
  'federal_register': '2b1c9d18-38a3-4686-866d-9c9ec87a5693',
  'california_grants': '9d0483f6-0620-40ac-85f7-ccf047a2879b',
  'usaspending': 'd57417a7-e665-47f7-9432-6a64fea5155e',
  'canadian_open_gov': '4f0acd83-72f4-4d98-b157-e8570c31d7f7',
  'eu_funding_portal': 'cba84e15-d24d-4b27-81c0-24cc583fa0bb',
  'ukri_gateway': 'ac988b94-b89a-4b17-acc5-a57f0f45cfa7',
  'ny_state': 'd044f897-bcd0-4aa6-aba6-8d9b3115773e',
  'nsf_awards': '2a7b0850-aaa7-49f0-8615-6797dc21e5b1',
  'world_bank': '07fbd9b2-e725-470e-a527-a4d36c8706a2'
};

// Update statistics
const updateStats = {
  startTime: new Date(),
  apis: {} as Record<string, { 
    new: number; 
    updated: number; 
    closed: number; 
    errors: number;
    errorDetails?: string[];
  }>,
  total: { new: 0, updated: 0, closed: 0, errors: 0 }
};

// Helper to log API results
function logApiResult(apiName: string, type: 'new' | 'updated' | 'closed' | 'errors', count: number, error?: string) {
  if (!updateStats.apis[apiName]) {
    updateStats.apis[apiName] = { new: 0, updated: 0, closed: 0, errors: 0, errorDetails: [] };
  }
  updateStats.apis[apiName][type] += count;
  updateStats.total[type] += count;
  
  if (error && updateStats.apis[apiName].errorDetails) {
    updateStats.apis[apiName].errorDetails.push(error);
  }
}

// Helper to convert date strings to ISO format
function toISODate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    // Handle MM/DD/YYYY format
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [month, day, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
}

// Update grant status based on deadline
async function updateExpiredGrants() {
  console.log('\nUpdating expired grants...');
  
  const { data, error } = await supabase
    .from('grants')
    .update({ status: 'closed' })
    .in('status', ['active', 'open'])
    .lt('application_deadline', new Date().toISOString())
    .select('id');
    
  if (error) {
    console.error('Error updating expired grants:', error);
  } else {
    console.log(`Marked ${data?.length || 0} grants as closed due to passed deadlines`);
    updateStats.total.closed += data?.length || 0;
  }
}

// 1. Grants.gov API - Fetch both active and forecasted
async function updateGrantsGov() {
  const API_NAME = 'Grants.gov';
  console.log(`\nUpdating ${API_NAME}...`);
  
  try {
    // Fetch active grants
    const activeResponse = await axios.post('https://api.grants.gov/v1/api/search2', {
      oppStatuses: "posted",
      startRecordNum: 0,
      rows: 500,
      sortBy: 'postedDate:desc'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    // Fetch forecasted grants
    const forecastedResponse = await axios.post('https://api.grants.gov/v1/api/search2', {
      oppStatuses: "forecasted",
      startRecordNum: 0,
      rows: 500,
      sortBy: 'postedDate:desc'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    const allOpportunities = [
      ...(activeResponse.data?.opportunities || []),
      ...(forecastedResponse.data?.opportunities || [])
    ];
    
    let newCount = 0;
    let updateCount = 0;
    
    for (const opp of allOpportunities) {
      const grant = {
        data_source_id: DATA_SOURCE_IDS.grants_gov,
        source_identifier: opp.id || opp.oppNumber,
        source_url: `https://grants.gov/search-results-detail/${opp.id}`,
        title: opp.title || 'Untitled Grant',
        status: opp.oppStatus === 'POSTED' ? 'active' : 'forecasted',
        funding_organization_name: opp.agencyName || 'Unknown Agency',
        currency: 'USD',
        funding_amount_min: opp.awardFloor ? parseFloat(opp.awardFloor) : null,
        funding_amount_max: opp.awardCeiling ? parseFloat(opp.awardCeiling) : null,
        posted_date: toISODate(opp.postedDate),
        application_deadline: toISODate(opp.closingDate),
        grant_type: opp.opportunityCategory || null,
        funding_instrument: opp.fundingInstrumentType || null,
        summary: opp.synopsis || null,
        description: opp.description || opp.synopsis || null,
        eligibility_criteria: opp.eligibleApplicants || null,
        geographic_scope: 'United States',
        countries: ['US'],
        cfda_numbers: opp.cfdaNumbers || null,
        opportunity_number: opp.oppNumber || null,
        cost_sharing_required: opp.costSharing === 'Yes',
        application_url: opp.additionalInfoUrl || `https://grants.gov/search-results-detail/${opp.id}`,
        raw_data: opp
      };

      // Check if grant exists
      const { data: existing } = await supabase
        .from('grants')
        .select('id, updated_at')
        .eq('source_identifier', grant.source_identifier)
        .eq('data_source_id', grant.data_source_id)
        .single();

      if (existing) {
        // Update existing grant
        const { error } = await supabase
          .from('grants')
          .update(grant)
          .eq('id', existing.id);
          
        if (!error) updateCount++;
      } else {
        // Insert new grant
        const { error } = await supabase
          .from('grants')
          .insert(grant);
          
        if (!error) newCount++;
      }
    }
    
    console.log(`${API_NAME}: ${newCount} new, ${updateCount} updated`);
    logApiResult(API_NAME, 'new', newCount);
    logApiResult(API_NAME, 'updated', updateCount);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${API_NAME} Error:`, errorMsg);
    logApiResult(API_NAME, 'errors', 1, errorMsg);
  }
}

// 2. Federal Register API
async function updateFederalRegister() {
  const API_NAME = 'Federal Register';
  console.log(`\nUpdating ${API_NAME}...`);
  
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Simpler query to avoid 400 error
    const params = new URLSearchParams({
      'conditions[publication_date][gte]': thirtyDaysAgo.toISOString().split('T')[0],
      'conditions[type][]': 'NOTICE',
      'per_page': '100'
    });

    const response = await axios.get(
      `https://www.federalregister.gov/api/v1/documents.json?${params}`,
      { timeout: 30000 }
    );

    let newCount = 0;
    let updateCount = 0;
    
    for (const doc of response.data?.results || []) {
      if (!doc.abstract?.toLowerCase().includes('grant') && 
          !doc.title?.toLowerCase().includes('grant')) continue;

      const grant = {
        data_source_id: DATA_SOURCE_IDS.federal_register,
        source_identifier: doc.document_number,
        source_url: doc.html_url,
        title: doc.title,
        status: 'active',
        funding_organization_name: doc.agencies?.[0]?.name || 'Federal Agency',
        posted_date: toISODate(doc.publication_date),
        summary: doc.abstract ? doc.abstract.substring(0, 500) : null,
        description: doc.abstract,
        geographic_scope: 'United States',
        countries: ['US'],
        raw_data: doc
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('grants')
        .select('id')
        .eq('source_identifier', grant.source_identifier)
        .eq('data_source_id', grant.data_source_id)
        .single();

      if (existing) {
        await supabase.from('grants').update(grant).eq('id', existing.id);
        updateCount++;
      } else {
        await supabase.from('grants').insert(grant);
        newCount++;
      }
    }
    
    console.log(`${API_NAME}: ${newCount} new, ${updateCount} updated`);
    logApiResult(API_NAME, 'new', newCount);
    logApiResult(API_NAME, 'updated', updateCount);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${API_NAME} Error:`, errorMsg);
    logApiResult(API_NAME, 'errors', 1, errorMsg);
  }
}

// 3. California Grants Portal
async function updateCaliforniaGrants() {
  const API_NAME = 'California Grants';
  console.log(`\nUpdating ${API_NAME}...`);
  
  try {
    // Use data.ca.gov API
    const resourceId = '111c8c88-21f6-453c-ae2c-b4785a0624f5';
    const filters = JSON.stringify({ 'Status': 'active' });
    
    const response = await axios.get('https://data.ca.gov/api/3/action/datastore_search', {
      params: {
        resource_id: resourceId,
        filters: filters,
        limit: 100
      },
      timeout: 30000
    });

    let newCount = 0;
    let updateCount = 0;
    
    for (const record of response.data?.result?.records || []) {
      // Skip non-active grants
      if (record.Status !== 'active') continue;
      
      // Parse deadline
      let deadline = null;
      if (record.ApplicationDeadline) {
        deadline = toISODate(record.ApplicationDeadline);
      }
      
      // Skip if deadline has passed
      if (deadline && new Date(deadline) < new Date()) continue;
      
      // Parse amounts
      let minAmount = null;
      let maxAmount = null;
      if (record.EstAmounts) {
        const amountStr = record.EstAmounts.replace(/[^0-9,]/g, '');
        const amounts = amountStr.split(',').map((a: string) => parseFloat(a.replace(/,/g, ''))).filter((a: number) => !isNaN(a));
        if (amounts.length > 0) {
          minAmount = Math.min(...amounts);
          maxAmount = Math.max(...amounts);
        }
      }
      
      const grantData = {
        data_source_id: DATA_SOURCE_IDS.california_grants,
        source_identifier: record.PortalID || `ca_${Date.now()}_${Math.random()}`,
        source_url: record.GrantURL || null,
        title: record.Title || 'California Grant',
        status: 'active',
        funding_organization_name: record.AgencyDept || 'California State Agency',
        currency: 'USD',
        funding_amount_min: minAmount,
        funding_amount_max: maxAmount,
        posted_date: toISODate(record.OpenDate),
        application_deadline: deadline,
        grant_type: record.Type || 'Grant',
        summary: record.Purpose || null,
        eligibility_criteria: record.ApplicantType || null,
        geographic_scope: 'State',
        countries: ['US'],
        states: ['CA'],
        application_url: record.GrantURL || null,
        raw_data: record
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('grants')
        .select('id')
        .eq('source_identifier', grantData.source_identifier)
        .eq('data_source_id', grantData.data_source_id)
        .single();

      if (existing) {
        await supabase.from('grants').update(grantData).eq('id', existing.id);
        updateCount++;
      } else {
        await supabase.from('grants').insert(grantData);
        newCount++;
      }
    }
    
    console.log(`${API_NAME}: ${newCount} new, ${updateCount} updated`);
    logApiResult(API_NAME, 'new', newCount);
    logApiResult(API_NAME, 'updated', updateCount);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${API_NAME} Error:`, errorMsg);
    logApiResult(API_NAME, 'errors', 1, errorMsg);
  }
}

// 4. World Bank Projects
async function updateWorldBank() {
  const API_NAME = 'World Bank';
  console.log(`\nUpdating ${API_NAME}...`);
  
  try {
    const response = await axios.get('https://search.worldbank.org/api/v2/projects', {
      params: {
        format: 'json',
        fl: 'id,project_name,boardapprovaldate,closingdate,totalcommamt,countryname,project_abstract,regionname,url',
        rows: 100,
        os: 0,
        apilang: 'en',
        fct: 'boardapprovaldate_exact:[2024-01-01T00:00:00Z TO *]'
      },
      timeout: 30000
    });

    let newCount = 0;
    let updateCount = 0;
    const projects = response.data?.projects || {};
    
    for (const [id, project] of Object.entries(projects) as [string, any][]) {
      let abstract = null;
      if (project.project_abstract?.cdata) {
        abstract = project.project_abstract.cdata;
      } else if (project.project_abstract && typeof project.project_abstract === 'string') {
        abstract = project.project_abstract;
      }
      
      const amount = parseFloat(project.totalcommamt?.replace(/,/g, '')) || null;
      
      const grant = {
        data_source_id: DATA_SOURCE_IDS.world_bank,
        source_identifier: id,
        source_url: project.url || `https://projects.worldbank.org/en/projects-operations/project-detail/${id}`,
        title: project.project_name || 'World Bank Project',
        status: project.closingdate && new Date(project.closingdate) > new Date() ? 'active' : 'closed',
        funding_organization_name: 'World Bank',
        currency: 'USD',
        funding_amount_min: amount,
        funding_amount_max: amount,
        posted_date: toISODate(project.boardapprovaldate),
        application_deadline: toISODate(project.closingdate),
        grant_type: 'Development Grant',
        summary: abstract ? abstract.substring(0, 500) : null,
        description: abstract,
        geographic_scope: project.regionname || 'International',
        countries: project.countryname && typeof project.countryname === 'string' ? project.countryname.split(',').map((c: string) => c.trim()) : null,
        raw_data: { region: project.regionname, country: project.countryname }
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('grants')
        .select('id')
        .eq('source_identifier', grant.source_identifier)
        .eq('data_source_id', grant.data_source_id)
        .single();

      if (existing) {
        await supabase.from('grants').update(grant).eq('id', existing.id);
        updateCount++;
      } else {
        await supabase.from('grants').insert(grant);
        newCount++;
      }
    }
    
    console.log(`${API_NAME}: ${newCount} new, ${updateCount} updated`);
    logApiResult(API_NAME, 'new', newCount);
    logApiResult(API_NAME, 'updated', updateCount);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${API_NAME} Error:`, errorMsg);
    logApiResult(API_NAME, 'errors', 1, errorMsg);
  }
}

// 5. NSF Awards
async function updateNSF() {
  const API_NAME = 'NSF Awards';
  console.log(`\nUpdating ${API_NAME}...`);
  
  try {
    const params = new URLSearchParams({
      dateStart: '01/01/2024',
      dateEnd: '12/31/2025',
      printFields: 'id,title,awardeeName,fundsObligatedAmt,startDate,expDate,abstractText'
    });
    
    const response = await axios.get(
      `https://api.nsf.gov/services/v1/awards.json?${params}`,
      { timeout: 30000 }
    );

    let newCount = 0;
    let updateCount = 0;
    const awards = response.data?.response?.award || [];
    
    for (const award of awards.slice(0, 100)) {
      const amount = parseFloat(award.fundsObligatedAmt) || null;
      
      const grant = {
        data_source_id: DATA_SOURCE_IDS.nsf_awards,
        source_identifier: award.id,
        source_url: `https://www.nsf.gov/awardsearch/showAward?AWD_ID=${award.id}`,
        title: award.title || 'NSF Award',
        status: award.expDate && new Date(award.expDate) > new Date() ? 'active' : 'closed',
        funding_organization_name: 'National Science Foundation',
        currency: 'USD',
        funding_amount_min: amount,
        funding_amount_max: amount,
        posted_date: toISODate(award.startDate),
        application_deadline: toISODate(award.expDate),
        grant_type: 'Research Grant',
        summary: award.abstractText ? award.abstractText.substring(0, 500) : null,
        description: award.abstractText,
        geographic_scope: 'National',
        countries: ['US'],
        raw_data: { awardee: award.awardeeName }
      };

      // Check if exists
      const { data: existing } = await supabase
        .from('grants')
        .select('id')
        .eq('source_identifier', grant.source_identifier)
        .eq('data_source_id', grant.data_source_id)
        .single();

      if (existing) {
        await supabase.from('grants').update(grant).eq('id', existing.id);
        updateCount++;
      } else {
        await supabase.from('grants').insert(grant);
        newCount++;
      }
    }
    
    console.log(`${API_NAME}: ${newCount} new, ${updateCount} updated`);
    logApiResult(API_NAME, 'new', newCount);
    logApiResult(API_NAME, 'updated', updateCount);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${API_NAME} Error:`, errorMsg);
    logApiResult(API_NAME, 'errors', 1, errorMsg);
  }
}

// Refresh materialized view
async function refreshMaterializedView() {
  console.log('\nRefreshing materialized view...');
  
  try {
    await supabase.rpc('refresh_active_opportunities');
    console.log('Materialized view refreshed');
  } catch (error) {
    console.error('Error refreshing materialized view:', error);
  }
}

// Generate update report
async function generateReport() {
  const duration = Math.round((new Date().getTime() - updateStats.startTime.getTime()) / 1000);
  
  const report = {
    timestamp: new Date().toISOString(),
    duration_seconds: duration,
    totals: updateStats.total,
    by_api: updateStats.apis,
    database_stats: await supabase.rpc('get_grant_statistics').single()
  };
  
  // Write report to file
  const reportPath = path.join(__dirname, `../logs/update_${new Date().toISOString().split('T')[0]}.json`);
  const logsDir = path.dirname(reportPath);
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DAILY UPDATE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} seconds`);
  console.log(`New grants: ${updateStats.total.new}`);
  console.log(`Updated grants: ${updateStats.total.updated}`);
  console.log(`Closed grants: ${updateStats.total.closed}`);
  console.log(`Errors: ${updateStats.total.errors}`);
  console.log('\nReport saved to:', reportPath);
  
  return report;
}

// Main execution
async function main() {
  console.log('Starting daily grants update...');
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  try {
    // Update expired grants first
    await updateExpiredGrants();
    
    // Run all API updates in parallel
    await Promise.allSettled([
      updateGrantsGov(),
      updateFederalRegister(),
      updateCaliforniaGrants(),
      updateWorldBank(),
      updateNSF()
    ]);
    
    // Refresh materialized view
    await refreshMaterializedView();
    
    // Generate and save report
    const report = await generateReport();
    
    // Exit with appropriate code
    process.exit(updateStats.total.errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Fatal error during update:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as updateGrants };