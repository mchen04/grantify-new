import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFundingCoverage() {
  // Get all data sources
  const { data: sources } = await supabase
    .from('data_sources')
    .select('id, name, display_name');

  console.log('\nFunding Coverage by Data Source:');
  console.log('================================');
  
  for (const source of sources || []) {
    // Total grants
    const { count: total } = await supabase
      .from('grants')
      .select('*', { count: 'exact', head: true })
      .eq('data_source_id', source.id);
    
    // Grants with funding
    const { count: withFunding } = await supabase
      .from('grants')  
      .select('*', { count: 'exact', head: true })
      .eq('data_source_id', source.id)
      .not('funding_amount_max', 'is', null);
    
    const percentage = total && total > 0 ? ((withFunding || 0) / total * 100).toFixed(1) : '0';
    console.log(`${source.display_name}: ${withFunding || 0}/${total || 0} (${percentage}%)`);
  }
  
  // Check EU Portal specifically
  const { data: euSource } = await supabase
    .from('data_sources')
    .select('id')
    .eq('name', 'eu_funding_portal')
    .single();
    
  if (euSource) {
    console.log('\nEU Portal Grant Analysis:');
    console.log('========================');
    
    // Sample of grants without funding
    const { data: noFunding } = await supabase
      .from('grants')
      .select('id, title, raw_data')
      .eq('data_source_id', euSource.id)
      .is('funding_amount_max', null)
      .limit(5);
      
    console.log(`\nSample EU grants without funding:`);
    noFunding?.forEach(grant => {
      const hasEstimatedValue = grant.raw_data?.metadata?.cftEstimatedTotalProcedureValue;
      const hasBudgetOverview = grant.raw_data?.metadata?.budgetOverview;
      console.log(`- ${grant.title.substring(0, 50)}... (has metadata: cftValue=${!!hasEstimatedValue}, budget=${!!hasBudgetOverview})`);
    });
    
    // Check recent updates
    const { data: recentlyUpdated } = await supabase
      .from('grants')
      .select('id, title, funding_amount_max, updated_at')
      .eq('data_source_id', euSource.id)
      .not('funding_amount_max', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);
      
    console.log('\nRecently updated EU grants with funding:');
    recentlyUpdated?.forEach(grant => {
      console.log(`- ${grant.title.substring(0, 50)}... - €${grant.funding_amount_max?.toLocaleString()}`);
    });
  }
}

checkFundingCoverage();