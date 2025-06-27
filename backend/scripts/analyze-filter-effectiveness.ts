import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface FilterAnalysis {
  totalGrants: number;
  statusDistribution: Record<string, { count: number; percentage: number }>;
  geographicScopeDistribution: Record<string, { count: number; percentage: number }>;
  dataSourceDistribution: Record<string, { count: number; percentage: number }>;
  fundingAmountCoverage: {
    withFunding: number;
    withoutFunding: number;
    coveragePercentage: number;
  };
  deadlineCoverage: {
    withDeadline: number;
    withoutDeadline: number;
    coveragePercentage: number;
  };
  costSharingDistribution: Record<string, { count: number; percentage: number }>;
  applicantTypesDistribution: Record<string, { count: number; percentage: number }>;
  dataQualityAnalysis: {
    fieldCoverage: Record<string, { totalRecords: number; nonNullRecords: number; coveragePercentage: number }>;
  };
  filterEffectiveness: {
    statusFilter: Record<string, number>;
    geographicFilter: Record<string, number>;
    fundingRangeFilter: Record<string, number>;
    deadlineFilter: Record<string, number>;
    combinedFilters: Record<string, number>;
  };
}

async function analyzeFilterEffectiveness(): Promise<FilterAnalysis> {
  console.log('🔍 Starting comprehensive filter effectiveness analysis...\n');

  // Get total grants count
  const { count: totalGrants } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total grants in database: ${totalGrants}`);

  // 1. Analyze Grant Status Distribution
  console.log('\n1️⃣ Analyzing Grant Status Distribution...');
  const { data: statusData } = await supabase
    .from('grants')
    .select('status')
    .not('status', 'is', null);

  const statusDistribution: Record<string, { count: number; percentage: number }> = {};
  const statusCounts: Record<string, number> = {};

  statusData?.forEach(grant => {
    const status = grant.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  Object.entries(statusCounts).forEach(([status, count]) => {
    statusDistribution[status] = {
      count,
      percentage: ((count / totalGrants!) * 100)
    };
  });

  console.log('Status Distribution:');
  Object.entries(statusDistribution).forEach(([status, data]) => {
    console.log(`  ${status}: ${data.count} (${data.percentage.toFixed(2)}%)`);
  });

  // 2. Analyze Geographic Scope Distribution
  console.log('\n2️⃣ Analyzing Geographic Scope Distribution...');
  const { data: geoData } = await supabase
    .from('grants')
    .select('geographic_scope')
    .not('geographic_scope', 'is', null);

  const geographicScopeDistribution: Record<string, { count: number; percentage: number }> = {};
  const geoCounts: Record<string, number> = {};

  geoData?.forEach(grant => {
    const scope = grant.geographic_scope || 'unknown';
    geoCounts[scope] = (geoCounts[scope] || 0) + 1;
  });

  Object.entries(geoCounts).forEach(([scope, count]) => {
    geographicScopeDistribution[scope] = {
      count,
      percentage: ((count / totalGrants!) * 100)
    };
  });

  console.log('Geographic Scope Distribution:');
  Object.entries(geographicScopeDistribution).forEach(([scope, data]) => {
    console.log(`  ${scope}: ${data.count} (${data.percentage.toFixed(2)}%)`);
  });

  // 3. Analyze Data Source Distribution
  console.log('\n3️⃣ Analyzing Data Source Distribution...');
  const { data: sourceData } = await supabase
    .from('grants')
    .select('data_source')
    .not('data_source', 'is', null);

  const dataSourceDistribution: Record<string, { count: number; percentage: number }> = {};
  const sourceCounts: Record<string, number> = {};

  sourceData?.forEach(grant => {
    const source = grant.data_source || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  Object.entries(sourceCounts).forEach(([source, count]) => {
    dataSourceDistribution[source] = {
      count,
      percentage: ((count / totalGrants!) * 100)
    };
  });

  console.log('Data Source Distribution:');
  Object.entries(dataSourceDistribution).forEach(([source, data]) => {
    console.log(`  ${source}: ${data.count} (${data.percentage.toFixed(2)}%)`);
  });

  // 4. Analyze Funding Amount Coverage
  console.log('\n4️⃣ Analyzing Funding Amount Coverage...');
  const { count: withFunding } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .not('funding_amount_min', 'is', null);

  const withoutFunding = totalGrants! - withFunding!;
  const fundingCoveragePercentage = ((withFunding! / totalGrants!) * 100);

  const fundingAmountCoverage = {
    withFunding: withFunding!,
    withoutFunding,
    coveragePercentage: fundingCoveragePercentage
  };

  console.log(`Funding Amount Coverage:`);
  console.log(`  With funding data: ${withFunding} (${fundingCoveragePercentage.toFixed(2)}%)`);
  console.log(`  Without funding data: ${withoutFunding} (${((withoutFunding / totalGrants!) * 100).toFixed(2)}%)`);

  // 5. Analyze Deadline Coverage
  console.log('\n5️⃣ Analyzing Deadline Coverage...');
  const { count: withDeadline } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .not('deadline', 'is', null);

  const withoutDeadline = totalGrants! - withDeadline!;
  const deadlineCoveragePercentage = ((withDeadline! / totalGrants!) * 100);

  const deadlineCoverage = {
    withDeadline: withDeadline!,
    withoutDeadline,
    coveragePercentage: deadlineCoveragePercentage
  };

  console.log(`Deadline Coverage:`);
  console.log(`  With deadline data: ${withDeadline} (${deadlineCoveragePercentage.toFixed(2)}%)`);
  console.log(`  Without deadline data: ${withoutDeadline} (${((withoutDeadline / totalGrants!) * 100).toFixed(2)}%)`);

  // 6. Analyze Cost Sharing Distribution
  console.log('\n6️⃣ Analyzing Cost Sharing Distribution...');
  const { data: costSharingData } = await supabase
    .from('grants')
    .select('cost_sharing_required')
    .not('cost_sharing_required', 'is', null);

  const costSharingDistribution: Record<string, { count: number; percentage: number }> = {};
  const costSharingCounts: Record<string, number> = {};

  costSharingData?.forEach(grant => {
    const costSharing = grant.cost_sharing_required ? 'required' : 'not_required';
    costSharingCounts[costSharing] = (costSharingCounts[costSharing] || 0) + 1;
  });

  Object.entries(costSharingCounts).forEach(([costSharing, count]) => {
    costSharingDistribution[costSharing] = {
      count,
      percentage: ((count / totalGrants!) * 100)
    };
  });

  console.log('Cost Sharing Distribution:');
  Object.entries(costSharingDistribution).forEach(([costSharing, data]) => {
    console.log(`  ${costSharing}: ${data.count} (${data.percentage.toFixed(2)}%)`);
  });

  // 7. Analyze Applicant Types Distribution
  console.log('\n7️⃣ Analyzing Applicant Types Distribution...');
  const { data: applicantData } = await supabase
    .from('grants')
    .select('applicant_types')
    .not('applicant_types', 'is', null);

  const applicantTypesDistribution: Record<string, { count: number; percentage: number }> = {};
  const applicantCounts: Record<string, number> = {};

  applicantData?.forEach(grant => {
    if (grant.applicant_types && Array.isArray(grant.applicant_types)) {
      grant.applicant_types.forEach((type: string) => {
        applicantCounts[type] = (applicantCounts[type] || 0) + 1;
      });
    }
  });

  Object.entries(applicantCounts).forEach(([type, count]) => {
    applicantTypesDistribution[type] = {
      count,
      percentage: ((count / totalGrants!) * 100)
    };
  });

  console.log('Applicant Types Distribution (Top 10):');
  Object.entries(applicantTypesDistribution)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10)
    .forEach(([type, data]) => {
      console.log(`  ${type}: ${data.count} (${data.percentage.toFixed(2)}%)`);
    });

  // 8. Data Quality Analysis
  console.log('\n8️⃣ Analyzing Data Quality...');
  const fieldsToAnalyze = [
    'title', 'description', 'agency', 'status', 'deadline', 'funding_amount_min', 
    'funding_amount_max', 'geographic_scope', 'applicant_types', 'cost_sharing_required',
    'data_source', 'categories', 'created_at', 'updated_at'
  ];

  const fieldCoverage: Record<string, { totalRecords: number; nonNullRecords: number; coveragePercentage: number }> = {};

  for (const field of fieldsToAnalyze) {
    const { count: nonNullCount } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .not(field, 'is', null);

    fieldCoverage[field] = {
      totalRecords: totalGrants!,
      nonNullRecords: nonNullCount!,
      coveragePercentage: ((nonNullCount! / totalGrants!) * 100)
    };
  }

  console.log('Field Coverage Analysis:');
  Object.entries(fieldCoverage)
    .sort(([,a], [,b]) => b.coveragePercentage - a.coveragePercentage)
    .forEach(([field, data]) => {
      console.log(`  ${field}: ${data.nonNullRecords}/${data.totalRecords} (${data.coveragePercentage.toFixed(2)}%)`);
    });

  // 9. Test Filter Effectiveness
  console.log('\n9️⃣ Testing Filter Effectiveness...');

  // Test status filter effectiveness
  const statusFilterResults: Record<string, number> = {};
  for (const status of Object.keys(statusDistribution)) {
    const { count } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    statusFilterResults[status] = count!;
  }

  // Test geographic filter effectiveness
  const geographicFilterResults: Record<string, number> = {};
  for (const scope of Object.keys(geographicScopeDistribution)) {
    const { count } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .eq('geographic_scope', scope);
    geographicFilterResults[scope] = count!;
  }

  // Test funding range filter effectiveness
  const fundingRangeFilterResults: Record<string, number> = {};
  
  // Test different funding ranges
  const fundingRanges = [
    { name: 'under_10k', min: 0, max: 10000 },
    { name: '10k_to_100k', min: 10000, max: 100000 },
    { name: '100k_to_1m', min: 100000, max: 1000000 },
    { name: 'over_1m', min: 1000000, max: 999999999 }
  ];

  for (const range of fundingRanges) {
    const { count } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .gte('funding_amount_min', range.min)
      .lte('funding_amount_max', range.max);
    fundingRangeFilterResults[range.name] = count!;
  }

  // Test deadline filter effectiveness
  const deadlineFilterResults: Record<string, number> = {};
  const currentDate = new Date().toISOString();
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year from now

  const { count: activeDeadlineCount } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .gte('deadline', currentDate);

  const { count: nearDeadlineCount } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true })
    .gte('deadline', currentDate)
    .lte('deadline', futureDate);

  deadlineFilterResults['active_deadlines'] = activeDeadlineCount!;
  deadlineFilterResults['near_deadlines'] = nearDeadlineCount!;

  // Test combined filter effectiveness
  const combinedFilterResults: Record<string, number> = {};

  // Test status + geographic combination
  for (const status of ['active', 'open', 'forecasted']) {
    for (const scope of ['national', 'regional', 'local']) {
      const { count } = await supabase
        .from('grants')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
        .eq('geographic_scope', scope);
      if (count! > 0) {
        combinedFilterResults[`${status}_${scope}`] = count!;
      }
    }
  }

  console.log('Filter Effectiveness Results:');
  console.log('Status Filter:');
  Object.entries(statusFilterResults).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} grants`);
  });

  console.log('Geographic Filter:');
  Object.entries(geographicFilterResults).forEach(([scope, count]) => {
    console.log(`  ${scope}: ${count} grants`);
  });

  console.log('Funding Range Filter:');
  Object.entries(fundingRangeFilterResults).forEach(([range, count]) => {
    console.log(`  ${range}: ${count} grants`);
  });

  console.log('Deadline Filter:');
  Object.entries(deadlineFilterResults).forEach(([filter, count]) => {
    console.log(`  ${filter}: ${count} grants`);
  });

  console.log('Combined Filters (Top 10):');
  Object.entries(combinedFilterResults)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([filter, count]) => {
      console.log(`  ${filter}: ${count} grants`);
    });

  return {
    totalGrants: totalGrants!,
    statusDistribution,
    geographicScopeDistribution,
    dataSourceDistribution,
    fundingAmountCoverage,
    deadlineCoverage,
    costSharingDistribution,
    applicantTypesDistribution,
    dataQualityAnalysis: { fieldCoverage },
    filterEffectiveness: {
      statusFilter: statusFilterResults,
      geographicFilter: geographicFilterResults,
      fundingRangeFilter: fundingRangeFilterResults,
      deadlineFilter: deadlineFilterResults,
      combinedFilters: combinedFilterResults
    }
  };
}

async function generateRecommendations(analysis: FilterAnalysis): Promise<void> {
  console.log('\n🎯 FILTER EFFECTIVENESS RECOMMENDATIONS\n');
  console.log('='.repeat(60));

  // Analyze which filters are most effective
  const effectiveFilters: string[] = [];
  const ineffectiveFilters: string[] = [];
  const lowDataCoverageFilters: string[] = [];

  // Check status filter effectiveness
  const statusVariation = Object.values(analysis.statusDistribution).map(s => s.count);
  const statusEffectiveness = Math.max(...statusVariation) / Math.min(...statusVariation);
  
  if (statusEffectiveness > 2) {
    effectiveFilters.push('Status Filter - Creates meaningful distribution differences');
  } else {
    ineffectiveFilters.push('Status Filter - Limited impact on result distribution');
  }

  // Check geographic filter effectiveness
  const geoVariation = Object.values(analysis.geographicScopeDistribution).map(g => g.count);
  const geoEffectiveness = Math.max(...geoVariation) / Math.min(...geoVariation);
  
  if (geoEffectiveness > 2) {
    effectiveFilters.push('Geographic Scope Filter - Creates meaningful distribution differences');
  } else {
    ineffectiveFilters.push('Geographic Scope Filter - Limited impact on result distribution');
  }

  // Check data coverage issues
  Object.entries(analysis.dataQualityAnalysis.fieldCoverage).forEach(([field, coverage]) => {
    if (coverage.coveragePercentage < 50) {
      lowDataCoverageFilters.push(`${field} - Only ${coverage.coveragePercentage.toFixed(1)}% coverage`);
    }
  });

  console.log('✅ HIGHLY EFFECTIVE FILTERS:');
  effectiveFilters.forEach(filter => console.log(`  • ${filter}`));
  
  console.log('\n❌ LESS EFFECTIVE FILTERS:');
  ineffectiveFilters.forEach(filter => console.log(`  • ${filter}`));
  
  console.log('\n⚠️  LOW DATA COVERAGE FILTERS:');
  lowDataCoverageFilters.forEach(filter => console.log(`  • ${filter}`));

  console.log('\n📊 FUNDING AMOUNT ANALYSIS:');
  console.log(`  • Coverage: ${analysis.fundingAmountCoverage.coveragePercentage.toFixed(1)}%`);
  if (analysis.fundingAmountCoverage.coveragePercentage > 70) {
    console.log('  • RECOMMENDATION: Funding filters are viable with good data coverage');
  } else {
    console.log('  • RECOMMENDATION: Funding filters may not be reliable due to low data coverage');
  }

  console.log('\n📅 DEADLINE ANALYSIS:');
  console.log(`  • Coverage: ${analysis.deadlineCoverage.coveragePercentage.toFixed(1)}%`);
  if (analysis.deadlineCoverage.coveragePercentage > 70) {
    console.log('  • RECOMMENDATION: Deadline filters are viable with good data coverage');
  } else {
    console.log('  • RECOMMENDATION: Deadline filters may not be reliable due to low data coverage');
  }

  console.log('\n🎯 PRIORITY RECOMMENDATIONS:');
  console.log('  1. Focus on filters with high data coverage (>80%)');
  console.log('  2. Implement status filtering if it shows meaningful distribution');
  console.log('  3. Consider combining multiple filters for better results');
  console.log('  4. Improve data quality for low-coverage fields before implementing filters');
  console.log('  5. Test user behavior to see which filters are actually used');

  console.log('\n📈 FILTER COMBINATION EFFECTIVENESS:');
  const topCombinations = Object.entries(analysis.filterEffectiveness.combinedFilters)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  topCombinations.forEach(([combination, count]) => {
    console.log(`  • ${combination}: ${count} grants`);
  });

  console.log('\n='.repeat(60));
}

// Run the analysis
analyzeFilterEffectiveness()
  .then(analysis => generateRecommendations(analysis))
  .catch(error => {
    console.error('Error analyzing filter effectiveness:', error);
    process.exit(1);
  });