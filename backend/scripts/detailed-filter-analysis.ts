import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedFilterAnalysis() {
  console.log('🔍 DETAILED FILTER EFFECTIVENESS ANALYSIS\n');

  // Get sample records to understand data structure
  const { data: sampleGrants } = await supabase
    .from('grants')
    .select('*')
    .limit(5);

  console.log('📋 Sample Grant Record Structure:');
  if (sampleGrants && sampleGrants.length > 0) {
    console.log('Available fields:', Object.keys(sampleGrants[0]));
    console.log('\nSample record:');
    console.log(JSON.stringify(sampleGrants[0], null, 2));
  }

  // Get total count
  const { count: totalGrants } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total grants: ${totalGrants}\n`);

  // Detailed Status Analysis
  console.log('1️⃣ DETAILED STATUS ANALYSIS');
  console.log('=' .repeat(40));
  
  const { data: statusData } = await supabase
    .from('grants')
    .select('status');

  const statusCounts: Record<string, number> = {};
  statusData?.forEach(grant => {
    const status = grant.status || 'null/undefined';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('Status breakdown:');
  Object.entries(statusCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([status, count]) => {
      const percentage = ((count / totalGrants!) * 100);
      console.log(`  ${status}: ${count} (${percentage.toFixed(2)}%)`);
    });

  // Calculate status filter effectiveness
  const statusEffectiveness = Object.values(statusCounts).length > 1 ? 
    Math.max(...Object.values(statusCounts)) / Math.min(...Object.values(statusCounts)) : 1;
  console.log(`Status filter effectiveness ratio: ${statusEffectiveness.toFixed(2)}:1`);

  // Detailed Geographic Analysis
  console.log('\n2️⃣ DETAILED GEOGRAPHIC ANALYSIS');
  console.log('=' .repeat(40));
  
  const { data: geoData } = await supabase
    .from('grants')
    .select('geographic_scope');

  const geoCounts: Record<string, number> = {};
  geoData?.forEach(grant => {
    const scope = grant.geographic_scope || 'null/undefined';
    geoCounts[scope] = (geoCounts[scope] || 0) + 1;
  });

  console.log('Geographic scope breakdown:');
  Object.entries(geoCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([scope, count]) => {
      const percentage = ((count / totalGrants!) * 100);
      console.log(`  ${scope}: ${count} (${percentage.toFixed(2)}%)`);
    });

  // Test actual filtering impact
  console.log('\n3️⃣ FILTER IMPACT TESTING');
  console.log('=' .repeat(40));

  // Test each status filter
  console.log('\nStatus filter impact:');
  for (const [status, count] of Object.entries(statusCounts)) {
    if (status !== 'null/undefined') {
      const { count: filteredCount } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      const reductionPercentage = ((totalGrants! - filteredCount!) / totalGrants!) * 100;
      console.log(`  Filter by "${status}": ${filteredCount} results (${reductionPercentage.toFixed(1)}% reduction)`);
    }
  }

  // Test geographic filters
  console.log('\nGeographic filter impact:');
  for (const [scope, count] of Object.entries(geoCounts).slice(0, 5)) {
    if (scope !== 'null/undefined') {
      const { count: filteredCount } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
        .eq('geographic_scope', scope);
      
      const reductionPercentage = ((totalGrants! - filteredCount!) / totalGrants!) * 100;
      console.log(`  Filter by "${scope}": ${filteredCount} results (${reductionPercentage.toFixed(1)}% reduction)`);
    }
  }

  // Test funding amount filtering
  console.log('\n4️⃣ FUNDING AMOUNT FILTERING ANALYSIS');
  console.log('=' .repeat(40));

  const { data: fundingData } = await supabase
    .from('grants')
    .select('funding_amount_min, funding_amount_max')
    .not('funding_amount_min', 'is', null);

  console.log(`Grants with funding data: ${fundingData?.length || 0} out of ${totalGrants}`);

  if (fundingData && fundingData.length > 0) {
    const amounts = fundingData.map(g => g.funding_amount_min).filter(a => a > 0);
    amounts.sort((a, b) => a - b);
    
    console.log(`Funding amount range: $${amounts[0]?.toLocaleString()} - $${amounts[amounts.length - 1]?.toLocaleString()}`);
    
    // Test funding range filters
    const ranges = [
      { name: 'Under $50K', min: 0, max: 50000 },
      { name: '$50K - $250K', min: 50000, max: 250000 },
      { name: '$250K - $1M', min: 250000, max: 1000000 },
      { name: 'Over $1M', min: 1000000, max: 999999999 }
    ];

    for (const range of ranges) {
      const { count: rangeCount } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
        .gte('funding_amount_min', range.min)
        .lte('funding_amount_min', range.max);
      
      console.log(`  ${range.name}: ${rangeCount} grants`);
    }
  } else {
    console.log('❌ No funding data available for meaningful filtering');
  }

  // Test text search effectiveness
  console.log('\n5️⃣ TEXT SEARCH EFFECTIVENESS');  
  console.log('=' .repeat(40));

  const searchTerms = ['education', 'health', 'environment', 'research', 'technology'];
  
  for (const term of searchTerms) {
    const { count: searchCount } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    
    const matchPercentage = ((searchCount! / totalGrants!) * 100);
    console.log(`  Search "${term}": ${searchCount} matches (${matchPercentage.toFixed(1)}%)`);
  }

  // Combined filter testing
  console.log('\n6️⃣ COMBINED FILTER TESTING');
  console.log('=' .repeat(40));

  // Test realistic user scenarios
  const scenarios = [
    { name: 'Active grants only', filters: { status: 'active' } },
    { name: 'EU grants only', filters: { geographic_scope: 'European Union' } },
    { name: 'Active EU grants', filters: { status: 'active', geographic_scope: 'European Union' } }
  ];

  for (const scenario of scenarios) {
    let query = supabase.from('grants').select('*', { count: 'exact', head: true });
    
    Object.entries(scenario.filters).forEach(([field, value]) => {
      query = query.eq(field, value);
    });
    
    const { count } = await query;
    const reductionPercentage = ((totalGrants! - count!) / totalGrants!) * 100;
    console.log(`  ${scenario.name}: ${count} results (${reductionPercentage.toFixed(1)}% reduction)`);
  }

  // Data quality recommendations
  console.log('\n7️⃣ RECOMMENDATIONS');
  console.log('=' .repeat(40));

  console.log('\n✅ EFFECTIVE FILTERS (implement first):');
  if (statusEffectiveness > 2) {
    console.log('  • Status filter - Creates significant result variation');
  }
  
  const hasGeoVariation = Object.values(geoCounts).length > 3;
  if (hasGeoVariation) {
    console.log('  • Geographic scope filter - Multiple meaningful categories');
  }

  console.log('\n⚠️  PROBLEMATIC FILTERS (fix data first):');
  if (!fundingData || fundingData.length < totalGrants! * 0.5) {
    console.log('  • Funding amount filters - Poor data coverage (<50%)');
  }

  console.log('\n❌ USELESS FILTERS (don\'t implement):');
  console.log('  • Deadline filters - 0% data coverage');
  console.log('  • Applicant type filters - 0% data coverage');
  console.log('  • Category filters - 0% data coverage');
  console.log('  • Data source filters - 0% data coverage');

  console.log('\n🎯 PRIORITY ACTIONS:');
  console.log('  1. Implement status filtering (active/closed/open)');
  console.log('  2. Implement geographic scope filtering');
  console.log('  3. Improve data collection for funding amounts');
  console.log('  4. Add deadline data collection to API integrations');
  console.log('  5. Focus on text search as primary discovery method');
  console.log('  6. Consider removing non-functional filter UI elements');

  console.log('\n📊 USER EXPERIENCE RECOMMENDATIONS:');
  console.log('  • Show filter result counts before applying');
  console.log('  • Disable filters with no data');
  console.log('  • Combine status + geography as primary filters');
  console.log('  • Use text search + minimal filters approach');
  console.log('  • Add data quality indicators to users');
}

// Run the detailed analysis
detailedFilterAnalysis()
  .catch(error => {
    console.error('Error in detailed analysis:', error);
    process.exit(1);
  });