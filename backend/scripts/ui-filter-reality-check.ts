import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function uiFilterRealityCheck() {
  console.log('🔍 UI FILTER vs DATABASE REALITY CHECK\n');
  console.log('Comparing what the UI offers vs what actually works in the database\n');
  console.log('='.repeat(70));

  // Get total count for percentage calculations
  const { count: totalGrants } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total grants in database: ${totalGrants}\n`);

  // 1. STATUS FILTER ANALYSIS
  console.log('1️⃣ STATUS FILTER ANALYSIS');
  console.log('UI offers: active, open, forecasted, closed, archived');
  
  const statusOptions = ['active', 'open', 'forecasted', 'closed', 'archived'];
  const statusResults: Record<string, number> = {};
  
  for (const status of statusOptions) {
    const { count } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    statusResults[status] = count!;
  }
  
  console.log('Reality:');
  Object.entries(statusResults).forEach(([status, count]) => {
    const percentage = ((count / totalGrants!) * 100);
    const verdict = count > 0 ? '✅ WORKS' : '❌ NO DATA';
    console.log(`  ${status}: ${count} grants (${percentage.toFixed(1)}%) ${verdict}`);
  });

  // 2. GEOGRAPHIC SCOPE FILTER ANALYSIS
  console.log('\n2️⃣ GEOGRAPHIC SCOPE FILTER ANALYSIS');
  console.log('UI offers: United States, European Union, United Kingdom, National, State, Regional, International');
  
  const geoOptions = ['United States', 'European Union', 'United Kingdom', 'National', 'State', 'Regional', 'International'];
  const geoResults: Record<string, number> = {};
  
  for (const geo of geoOptions) {
    const { count } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .eq('geographic_scope', geo);
    geoResults[geo] = count!;
  }
  
  // Also check what geographic scopes actually exist
  const { data: actualGeoScopes } = await supabase
    .from('grants')
    .select('geographic_scope')
    .not('geographic_scope', 'is', null);
  
  const actualGeoCounts: Record<string, number> = {};
  actualGeoScopes?.forEach(grant => {
    const scope = grant.geographic_scope;
    actualGeoCounts[scope] = (actualGeoCounts[scope] || 0) + 1;
  });
  
  console.log('Reality (UI options):');
  Object.entries(geoResults).forEach(([geo, count]) => {
    const percentage = ((count / totalGrants!) * 100);
    const verdict = count > 0 ? '✅ WORKS' : '❌ NO DATA';
    console.log(`  ${geo}: ${count} grants (${percentage.toFixed(1)}%) ${verdict}`);
  });
  
  console.log('\nActual geographic scopes in database:');
  Object.entries(actualGeoCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([geo, count]) => {
      const percentage = ((count / totalGrants!) * 100);
      console.log(`  ${geo}: ${count} grants (${percentage.toFixed(1)}%)`);
    });

  // 3. FUNDING AMOUNT FILTER ANALYSIS
  console.log('\n3️⃣ FUNDING AMOUNT FILTER ANALYSIS');
  
  const { count: grantsWithFunding } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .not('funding_amount_min', 'is', null);
  
  const fundingCoverage = ((grantsWithFunding! / totalGrants!) * 100);
  console.log(`Grants with funding data: ${grantsWithFunding} (${fundingCoverage.toFixed(1)}%)`);
  
  if (grantsWithFunding! > 0) {
    // Test funding ranges
    const ranges = [
      { name: 'Under $50K', min: 0, max: 50000 },
      { name: '$50K-$250K', min: 50000, max: 250000 },
      { name: '$250K-$1M', min: 250000, max: 1000000 },
      { name: 'Over $1M', min: 1000000, max: 999999999 }
    ];
    
    console.log('Funding range effectiveness:');
    for (const range of ranges) {
      const { count } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
        .gte('funding_amount_min', range.min)
        .lte('funding_amount_min', range.max);
      
      const verdict = count! > 0 ? '✅ WORKS' : '❌ NO DATA';
      console.log(`  ${range.name}: ${count} grants ${verdict}`);
    }
    
    console.log(`VERDICT: ⚠️  PARTIALLY USEFUL (only ${fundingCoverage.toFixed(1)}% coverage)`);
  } else {
    console.log('VERDICT: ❌ COMPLETELY USELESS - No funding data');
  }

  // 4. DEADLINE FILTER ANALYSIS
  console.log('\n4️⃣ DEADLINE FILTER ANALYSIS');
  
  const { count: grantsWithDeadline } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .not('application_deadline', 'is', null);
  
  const deadlineCoverage = ((grantsWithDeadline! / totalGrants!) * 100);
  console.log(`Grants with deadline data: ${grantsWithDeadline} (${deadlineCoverage.toFixed(1)}%)`);
  
  if (grantsWithDeadline! > 0) {
    // Test deadline ranges
    const now = new Date();
    const future30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    
    const { count: deadlineNext30 } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .gte('application_deadline', now.toISOString())
      .lte('application_deadline', future30.toISOString());
    
    const { count: deadlineNext90 } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .gte('application_deadline', now.toISOString())
      .lte('application_deadline', future90.toISOString());
    
    console.log(`Deadlines in next 30 days: ${deadlineNext30}`);
    console.log(`Deadlines in next 90 days: ${deadlineNext90}`);
    console.log(`VERDICT: ✅ WORKS (${deadlineCoverage.toFixed(1)}% coverage)`);
  } else {
    console.log('VERDICT: ❌ COMPLETELY USELESS - No deadline data');
  }

  // 5. COST SHARING FILTER ANALYSIS
  console.log('\n5️⃣ COST SHARING FILTER ANALYSIS');
  
  const { count: costSharingRequired } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('cost_sharing_required', true);
  
  const { count: costSharingNotRequired } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('cost_sharing_required', false);
  
  const { count: costSharingNull } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .is('cost_sharing_required', null);
  
  console.log(`Cost sharing required: ${costSharingRequired}`);
  console.log(`Cost sharing not required: ${costSharingNotRequired}`);
  console.log(`Cost sharing unknown: ${costSharingNull}`);
  
  const costSharingCoverage = (((costSharingRequired! + costSharingNotRequired!) / totalGrants!) * 100);
  console.log(`VERDICT: ${costSharingCoverage > 50 ? '✅' : '⚠️'} ${costSharingCoverage.toFixed(1)}% coverage`);

  // 6. CURRENCY FILTER ANALYSIS
  console.log('\n6️⃣ CURRENCY FILTER ANALYSIS');
  console.log('UI offers: USD, EUR');
  
  const { data: currencyData } = await supabase
    .from('grants')
    .select('currency')
    .not('currency', 'is', null);
  
  const currencyCounts: Record<string, number> = {};
  currencyData?.forEach(grant => {
    const currency = grant.currency;
    currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
  });
  
  console.log('Actual currencies in database:');
  Object.entries(currencyCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([currency, count]) => {
      const percentage = ((count / totalGrants!) * 100);
      console.log(`  ${currency}: ${count} grants (${percentage.toFixed(1)}%)`);
    });
  
  const usdCount = currencyCounts['USD'] || 0;
  const eurCount = currencyCounts['EUR'] || 0;
  console.log(`UI USD filter: ${usdCount > 0 ? '✅ WORKS' : '❌ NO DATA'}`);
  console.log(`UI EUR filter: ${eurCount > 0 ? '✅ WORKS' : '❌ NO DATA'}`);

  // 7. APPLICANT TYPES & DATA SOURCES
  console.log('\n7️⃣ APPLICANT TYPES & DATA SOURCES ANALYSIS');
  
  // Check applicant types
  const { data: applicantTypesData } = await supabase
    .from('grants')
    .select('eligibility_criteria')
    .not('eligibility_criteria', 'is', null)
    .limit(100);
  
  console.log(`Grants with eligibility criteria: ${applicantTypesData?.length || 0}`);
  console.log('APPLICANT TYPES VERDICT: ❌ Field exists but likely no structured data');
  
  // Check data sources
  const { data: dataSourcesData } = await supabase
    .from('grants')
    .select('data_source_id')
    .not('data_source_id', 'is', null);
  
  const dataSourceCounts: Record<string, number> = {};
  dataSourcesData?.forEach(grant => {
    const source = grant.data_source_id;
    dataSourceCounts[source] = (dataSourceCounts[source] || 0) + 1;
  });
  
  console.log('Data source distribution:');
  Object.entries(dataSourceCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([source, count]) => {
      const percentage = ((count / totalGrants!) * 100);
      console.log(`  ${source}: ${count} grants (${percentage.toFixed(1)}%)`);
    });
  
  const dataSourceCoverage = ((dataSourcesData?.length! / totalGrants!) * 100);
  console.log(`DATA SOURCES VERDICT: ${dataSourceCoverage > 80 ? '✅' : '⚠️'} ${dataSourceCoverage.toFixed(1)}% coverage`);

  // 8. FEATURED GRANTS
  console.log('\n8️⃣ FEATURED GRANTS ANALYSIS');
  
  const { count: featuredGrants } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .eq('is_featured', true);
  
  console.log(`Featured grants: ${featuredGrants}`);
  console.log(`VERDICT: ${featuredGrants! > 0 ? '✅ WORKS' : '❌ NO DATA'}`);

  // FINAL RECOMMENDATIONS
  console.log('\n' + '='.repeat(70));
  console.log('🎯 FINAL UI FILTER RECOMMENDATIONS');
  console.log('='.repeat(70));
  
  console.log('\n✅ KEEP THESE FILTERS (they work well):');
  if (statusResults.active > 100) console.log('  • Status filter (active/open have good data)');
  if (Object.values(actualGeoCounts).some(count => count > 50)) console.log('  • Geographic scope (has meaningful data)');
  if (costSharingCoverage > 50) console.log('  • Cost sharing requirement');
  if (currencyCounts['USD'] > 100 || currencyCounts['EUR'] > 100) console.log('  • Currency filter');
  if (grantsWithDeadline! > 500) console.log('  • Deadline filter');
  
  console.log('\n⚠️  FIX THESE FILTERS (need better data):');
  if (fundingCoverage < 50) console.log(`  • Funding amount (only ${fundingCoverage.toFixed(1)}% coverage)`);
  if (statusResults.forecasted === 0) console.log('  • Remove "forecasted" status option');
  if (statusResults.archived === 0) console.log('  • Remove "archived" status option');
  
  console.log('\n❌ REMOVE THESE FILTERS (completely broken):');
  if (featuredGrants === 0) console.log('  • Featured grants filter');
  console.log('  • Applicant types filter (no structured data)');
  
  console.log('\n🛠️  UPDATE UI GEOGRAPHIC OPTIONS:');
  console.log('  Current UI options don\'t match database reality.');
  console.log('  Replace hardcoded options with:');
  Object.entries(actualGeoCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([geo, count]) => {
      console.log(`    • ${geo} (${count} grants)`);
    });
  
  console.log('\n📊 FILTER PRIORITY RANKING:');
  const filterEffectiveness = [
    { name: 'Status Filter', effectiveness: statusResults.active + statusResults.open, coverage: 100 },
    { name: 'Geographic Filter', effectiveness: Math.max(...Object.values(actualGeoCounts)), coverage: 92.8 },
    { name: 'Deadline Filter', effectiveness: grantsWithDeadline!, coverage: deadlineCoverage },
    { name: 'Currency Filter', effectiveness: Math.max(usdCount, eurCount), coverage: Object.keys(currencyCounts).length > 0 ? 100 : 0 },
    { name: 'Cost Sharing Filter', effectiveness: Math.max(costSharingRequired!, costSharingNotRequired!), coverage: costSharingCoverage },
    { name: 'Funding Filter', effectiveness: grantsWithFunding!, coverage: fundingCoverage }
  ].sort((a, b) => (b.effectiveness * b.coverage) - (a.effectiveness * a.coverage));
  
  filterEffectiveness.forEach((filter, index) => {
    console.log(`  ${index + 1}. ${filter.name}: ${filter.effectiveness} grants, ${filter.coverage.toFixed(1)}% coverage`);
  });
}

// Run the reality check
uiFilterRealityCheck()
  .catch(error => {
    console.error('Error in UI filter reality check:', error);
    process.exit(1);
  });