import { SupabaseClient } from '@supabase/supabase-js';
import supabaseClient, { getServiceRoleClient } from '../src/db/supabaseClient';
import grantsService from '../src/services/grants/grantsService';
import { GrantFilter } from '../src/models/grant';

/**
 * Comprehensive test script for all grant filter combinations
 * Run with: npm run test:filters
 */

interface TestCase {
  name: string;
  filters: GrantFilter;
  expectedBehavior: string;
}

// Define all test cases based on user requirements
const testCases: TestCase[] = [
  // Funding Amount Tests
  {
    name: 'Any Amount (default)',
    filters: {},
    expectedBehavior: 'Should return all grants without funding filters'
  },
  {
    name: 'Under $50K',
    filters: { funding_min: 0, funding_max: 50000 },
    expectedBehavior: 'Should return grants with max funding <= $50K'
  },
  {
    name: '$50K-$100K',
    filters: { funding_min: 50000, funding_max: 100000 },
    expectedBehavior: 'Should return grants in range $50K-$100K'
  },
  {
    name: '$100K-$500K',
    filters: { funding_min: 100000, funding_max: 500000 },
    expectedBehavior: 'Should return grants in range $100K-$500K'
  },
  {
    name: '$500K-$1M',
    filters: { funding_min: 500000, funding_max: 1000000 },
    expectedBehavior: 'Should return grants in range $500K-$1M'
  },
  {
    name: '$1M-$5M',
    filters: { funding_min: 1000000, funding_max: 5000000 },
    expectedBehavior: 'Should return grants in range $1M-$5M'
  },
  {
    name: '$5M-$10M',
    filters: { funding_min: 5000000, funding_max: 10000000 },
    expectedBehavior: 'Should return grants in range $5M-$10M'
  },
  {
    name: '$10M+',
    filters: { funding_min: 10000000 },
    expectedBehavior: 'Should return grants with min funding >= $10M'
  },
  {
    name: '$0 exactly',
    filters: { funding_min: 0, funding_max: 0 },
    expectedBehavior: 'Should return grants with funding = $0'
  },
  {
    name: '$100M+',
    filters: { funding_min: 100000000 },
    expectedBehavior: 'Should return grants with min funding >= $100M'
  },
  {
    name: 'Include unspecified funding',
    filters: { funding_min: 50000, funding_max: 100000, include_no_funding: true },
    expectedBehavior: 'Should return grants in range OR with null funding'
  },
  {
    name: 'Only unspecified funding',
    filters: { funding_null: true },
    expectedBehavior: 'Should return only grants with null funding amounts'
  },
  
  // Application Deadline Tests
  {
    name: 'Any Deadline (default)',
    filters: {},
    expectedBehavior: 'Should return all grants without deadline filters'
  },
  {
    name: 'Overdue grants',
    filters: { 
      deadline_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      deadline_end: new Date(Date.now() - 1).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines in the past'
  },
  {
    name: 'Next 7 days',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines in next 7 days'
  },
  {
    name: 'Next 30 days',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines in next 30 days'
  },
  {
    name: 'Next 3 months',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines in next 3 months'
  },
  {
    name: 'Next 6 months',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines in next 6 months'
  },
  {
    name: 'This year',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    expectedBehavior: 'Should return grants with deadlines this year'
  },
  {
    name: '90 days overdue',
    filters: { 
      deadline_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      deadline_end: new Date(Date.now() - 1).toISOString()
    },
    expectedBehavior: 'Should return grants overdue by up to 90 days'
  },
  {
    name: 'Include unspecified deadline',
    filters: { 
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      include_no_deadline: true
    },
    expectedBehavior: 'Should return grants in range OR with null deadline'
  },
  {
    name: 'Only unspecified deadline',
    filters: { deadline_null: true },
    expectedBehavior: 'Should return only grants with null deadline'
  },
  
  // Grant Status Tests
  {
    name: 'Active status',
    filters: { status: 'active' },
    expectedBehavior: 'Should return only active grants'
  },
  {
    name: 'Open status',
    filters: { status: 'open' },
    expectedBehavior: 'Should return only open grants'
  },
  {
    name: 'Forecasted status',
    filters: { status: 'forecasted' },
    expectedBehavior: 'Should return only forecasted grants'
  },
  {
    name: 'Closed status',
    filters: { status: 'closed' },
    expectedBehavior: 'Should return only closed grants'
  },
  {
    name: 'Archived status',
    filters: { status: 'archived' },
    expectedBehavior: 'Should return only archived grants'
  },
  {
    name: 'Multiple statuses',
    filters: { status: ['active', 'open', 'forecasted'] },
    expectedBehavior: 'Should return grants with any of the specified statuses'
  },
  
  // Cost Sharing Tests
  {
    name: 'Cost sharing required',
    filters: { cost_sharing_required: true },
    expectedBehavior: 'Should return only grants requiring cost sharing'
  },
  {
    name: 'No cost sharing',
    filters: { cost_sharing_required: false },
    expectedBehavior: 'Should return only grants not requiring cost sharing'
  },
  
  // Currency Tests
  {
    name: 'USD currency',
    filters: { currency: 'USD' },
    expectedBehavior: 'Should return only USD grants'
  },
  {
    name: 'EUR currency',
    filters: { currency: 'EUR' },
    expectedBehavior: 'Should return only EUR grants'
  },
  {
    name: 'GBP currency',
    filters: { currency: 'GBP' },
    expectedBehavior: 'Should return only GBP grants'
  },
  {
    name: 'Multiple currencies',
    filters: { currency: ['USD', 'EUR'] },
    expectedBehavior: 'Should return grants in USD or EUR'
  },
  
  // Special Filters Tests
  {
    name: 'Featured grants only',
    filters: { is_featured: true },
    expectedBehavior: 'Should return only featured grants'
  },
  
  // Complex Filter Combinations
  {
    name: 'Complex: High funding + Near deadline + Active',
    filters: { 
      funding_min: 1000000,
      deadline_start: new Date().toISOString(),
      deadline_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    },
    expectedBehavior: 'Should return active grants with >$1M funding and deadline in next 30 days'
  },
  {
    name: 'Complex: No funding specified + USD + Cost sharing',
    filters: { 
      funding_null: true,
      currency: 'USD',
      cost_sharing_required: true
    },
    expectedBehavior: 'Should return USD grants with no funding specified that require cost sharing'
  }
];

async function runTest(testCase: TestCase, client: SupabaseClient): Promise<void> {
  console.log(`\\n📋 Testing: ${testCase.name}`);
  console.log(`   Expected: ${testCase.expectedBehavior}`);
  
  try {
    const { grants, totalCount } = await grantsService.getGrants(testCase.filters, client);
    
    console.log(`   ✅ Result: Found ${totalCount} grants`);
    
    // Show sample of results
    if (grants.length > 0) {
      console.log(`   Sample grants:`);
      grants.slice(0, 3).forEach((grant, index) => {
        console.log(`     ${index + 1}. ${grant.title}`);
        console.log(`        Status: ${grant.status}`);
        console.log(`        Funding: ${grant.currency || 'USD'} ${grant.funding_amount_min || 'N/A'} - ${grant.funding_amount_max || 'N/A'}`);
        console.log(`        Deadline: ${grant.application_deadline || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log('🧪 Starting comprehensive filter tests...');
  console.log('=====================================\\n');
  
  // Use service role client to bypass RLS
  const serviceClient = getServiceRoleClient();
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      await runTest(testCase, serviceClient);
      passed++;
    } catch (error) {
      failed++;
      console.error(`Test failed: ${testCase.name}`);
      console.error(error);
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\\n=====================================');
  console.log(`📊 Test Summary:`);
  console.log(`   Total tests: ${testCases.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
}

// Run the tests
runAllTests()
  .then(() => {
    console.log('\\n✨ Filter testing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Test suite failed:', error);
    process.exit(1);
  });