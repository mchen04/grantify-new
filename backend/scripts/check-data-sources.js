const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Looking for env vars...');
console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);
console.log('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL); 
console.log('Keys available:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  console.error('URL:', supabaseUrl);
  console.error('Key:', !!supabaseServiceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDataSources() {
  try {
    // Get data sources
    const { data: dataSources, error } = await supabase
      .from('data_sources')
      .select('id, name, display_name')
      .order('display_name');

    if (error) {
      console.error('Error fetching data sources:', error);
      return;
    }

    console.log('Data Sources:');
    console.log('=============');
    dataSources.forEach(ds => {
      console.log(`ID: ${ds.id}`);
      console.log(`Name: ${ds.name}`);
      console.log(`Display Name: ${ds.display_name}`);
      console.log('---');
    });

    // Test a query with NIH UUID
    const nihSource = dataSources.find(ds => ds.name === 'NIH' || ds.display_name === 'NIH');
    if (nihSource) {
      console.log('\nTesting grants query with NIH UUID:');
      const { data: grants, error: grantsError } = await supabase
        .from('grants')
        .select('id, title, data_source_id')
        .eq('data_source_id', nihSource.id)
        .limit(3);

      if (grantsError) {
        console.error('Error fetching grants:', grantsError);
      } else {
        console.log(`Found ${grants.length} grants from NIH`);
        grants.forEach(g => {
          console.log(`- ${g.title.substring(0, 50)}...`);
        });
      }
    }
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkDataSources();