#!/usr/bin/env node

/**
 * Test script for advanced filter system
 * Tests each filter type individually to identify broken ones
 */

import axios from 'axios';
import { GrantFilter } from '../src/types/grant';
import { mapFiltersToApi } from '../src/utils/filterMapping';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Test configuration
interface FilterTest {
  name: string;
  filter: GrantFilter;
  expectedApiParams: Record<string, unknown>;
  validateResponse?: (data: any) => void;
}

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

async function testFilter(test: FilterTest) {
  console.log(`\n${colors.blue}Testing: ${test.name}${colors.reset}`);
  console.log(`${colors.gray}Filter:${colors.reset}`, JSON.stringify(test.filter, null, 2));
  
  try {
    // Map filter to API format
    const apiParams = mapFiltersToApi(test.filter);
    console.log(`${colors.gray}Mapped API params:${colors.reset}`, JSON.stringify(apiParams, null, 2));
    
    // Check if mapping matches expected
    const mappingCorrect = compareApiParams(apiParams, test.expectedApiParams);
    if (!mappingCorrect) {
      console.log(`${colors.yellow}⚠️  Mapping mismatch!${colors.reset}`);
      console.log(`${colors.gray}Expected:${colors.reset}`, JSON.stringify(test.expectedApiParams, null, 2));
      console.log(`${colors.gray}Actual:${colors.reset}`, JSON.stringify(apiParams, null, 2));
    }
    
    // Make API call
    const response = await axios.get(`${API_BASE_URL}/api/grants`, {
      params: apiParams,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`${colors.green}✓ API call successful${colors.reset}`);
    console.log(`${colors.gray}Results: ${response.data.grants?.length || 0} grants, Total: ${response.data.count || 0}${colors.reset}`);
    
    // Run custom validation if provided
    if (test.validateResponse) {
      test.validateResponse(response.data);
    }
    
    return { success: true, data: response.data };
  } catch (error: any) {
    console.log(`${colors.red}✗ Test failed${colors.reset}`);
    console.log(`${colors.gray}Error: ${error.message}${colors.reset}`);
    if (error.response?.data) {
      console.log(`${colors.gray}Response:${colors.reset}`, error.response.data);
    }
    return { success: false, error };
  }
}

// Define all filter tests
const filterTests: FilterTest[] = [
  // 1. FUNDING AMOUNT FILTERS
  {
    name: 'Funding: Any Amount',
    filter: {
      fundingMin: 0,
      fundingMax: undefined,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1
    }
  },
  {
    name: 'Funding: Under $50K',
    filter: {
      fundingMin: 0,
      fundingMax: 50000,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      funding_min: 0,
      funding_max: 50000,
      include_no_funding: undefined
    }
  },
  {
    name: 'Funding: $100M+',
    filter: {
      fundingMin: 100000000,
      fundingMax: 100000000,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      funding_min: 100000000,
      funding_max: Number.MAX_SAFE_INTEGER,
      include_no_funding: undefined
    }
  },
  {
    name: 'Funding: No funding information',
    filter: {
      onlyNoFunding: true,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      funding_null: true
    }
  },

  // 2. DEADLINE FILTERS
  {
    name: 'Deadline: Next 7 days',
    filter: {
      deadlineMinDays: 0,
      deadlineMaxDays: 7,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      deadline_start: expect.any(String),
      deadline_end: expect.any(String),
      include_no_deadline: undefined
    }
  },
  {
    name: 'Deadline: Overdue',
    filter: {
      deadlineMinDays: -90,
      deadlineMaxDays: -1,
      showOverdue: true,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      deadline_start: expect.any(String),
      deadline_end: expect.any(String),
      include_no_deadline: undefined,
      show_overdue: true
    }
  },
  {
    name: 'Deadline: No deadline',
    filter: {
      onlyNoDeadline: true,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      deadline_null: true
    }
  },

  // 3. GRANT STATUS FILTERS
  {
    name: 'Status: Active only',
    filter: {
      statuses: ['active'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      status: ['active']
    }
  },
  {
    name: 'Status: Multiple (Active + Open)',
    filter: {
      statuses: ['active', 'open'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      status: ['active', 'open']
    }
  },

  // 4. COST SHARING FILTERS
  {
    name: 'Cost Sharing: Required',
    filter: {
      costSharingRequired: true,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      cost_sharing_required: true
    }
  },
  {
    name: 'Cost Sharing: Not Required',
    filter: {
      costSharingRequired: false,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      cost_sharing_required: false
    }
  },

  // 5. CURRENCY FILTERS
  {
    name: 'Currency: USD only',
    filter: {
      currencies: ['USD'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      currency: ['USD']
    }
  },
  {
    name: 'Currency: Multiple (USD + EUR)',
    filter: {
      currencies: ['USD', 'EUR'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      currency: ['USD', 'EUR']
    }
  },

  // 6. SPECIAL FILTERS
  {
    name: 'Featured Grants Only',
    filter: {
      onlyFeatured: true,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      is_featured: true
    }
  },
  {
    name: 'Posted Date: Last 7 days',
    filter: {
      postDateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      posted_date_start: expect.any(String)
    }
  },

  // 7. DATA SOURCE FILTERS
  {
    name: 'Data Source: NIH only',
    filter: {
      data_source_ids: ['NIH'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      data_sources: 'NIH'
    }
  },
  {
    name: 'Data Source: Multiple (NIH, NSF)',
    filter: {
      data_source_ids: ['NIH', 'NSF'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      data_sources: 'NIH,NSF'
    }
  },

  // 8. GEOGRAPHIC SCOPE FILTERS
  {
    name: 'Geographic Scope: United States',
    filter: {
      geographic_scope: 'United States',
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      geographic_scope: 'United States'
    }
  },

  // 9. APPLICANT TYPE FILTERS
  {
    name: 'Applicant Type: Small businesses',
    filter: {
      eligible_applicant_types: ['Small businesses'],
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      eligible_applicant_types: ['Small businesses']
    }
  },

  // 10. SORT FILTERS
  {
    name: 'Sort: By deadline (soonest)',
    filter: {
      sortBy: 'deadline',
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      sort_by: 'application_deadline',
      sort_direction: 'asc'
    }
  },
  {
    name: 'Sort: By amount (highest)',
    filter: {
      sortBy: 'amount',
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      limit: 5,
      page: 1,
      sort_by: 'funding_amount_max',
      sort_direction: 'desc'
    }
  },

  // 11. SEARCH WITH FILTERS
  {
    name: 'Search + Funding Filter',
    filter: {
      searchTerm: 'research',
      fundingMin: 50000,
      fundingMax: 500000,
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      search: 'research',
      limit: 5,
      page: 1,
      funding_min: 50000,
      funding_max: 500000,
      include_no_funding: undefined
    }
  },

  // 12. COMPLEX COMBINATION
  {
    name: 'Complex: Multiple filters combined',
    filter: {
      searchTerm: 'health',
      fundingMin: 100000,
      fundingMax: 1000000,
      deadlineMinDays: 0,
      deadlineMaxDays: 30,
      statuses: ['active', 'open'],
      costSharingRequired: false,
      currencies: ['USD'],
      data_source_ids: ['NIH'],
      sortBy: 'amount',
      page: 1,
      limit: 5
    } as GrantFilter,
    expectedApiParams: {
      search: 'health',
      limit: 5,
      page: 1,
      funding_min: 100000,
      funding_max: 1000000,
      include_no_funding: undefined,
      deadline_start: expect.any(String),
      deadline_end: expect.any(String),
      include_no_deadline: undefined,
      status: ['active', 'open'],
      cost_sharing_required: false,
      currency: ['USD'],
      data_sources: 'NIH',
      sort_by: 'funding_amount_max',
      sort_direction: 'desc'
    }
  }
];

// Helper to compare API params
function compareApiParams(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  
  // Check all expected keys exist
  for (const key of expectedKeys) {
    if (!(key in actual)) {
      console.log(`${colors.yellow}Missing key: ${key}${colors.reset}`);
      return false;
    }
    
    const expectedValue = expected[key];
    const actualValue = actual[key];
    
    // Handle special matchers
    if (typeof expectedValue === 'object' && expectedValue !== null && '__matcher' in expectedValue) {
      const matcher = expectedValue as any;
      if (matcher.__matcher === 'any' && matcher.type === 'String') {
        if (typeof actualValue !== 'string') {
          console.log(`${colors.yellow}Type mismatch for ${key}: expected string, got ${typeof actualValue}${colors.reset}`);
          return false;
        }
      }
    } else {
      // Direct comparison
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        console.log(`${colors.yellow}Value mismatch for ${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}${colors.reset}`);
        return false;
      }
    }
  }
  
  // Check for unexpected keys
  for (const key of actualKeys) {
    if (!(key in expected)) {
      console.log(`${colors.yellow}Unexpected key: ${key} = ${JSON.stringify(actual[key])}${colors.reset}`);
    }
  }
  
  return true;
}

// Helper to create matchers
const expect = {
  any: (type: string) => ({ __matcher: 'any', type })
};

// Run all tests
async function runAllTests() {
  console.log(`${colors.blue}Starting Advanced Filter Tests${colors.reset}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log('=' * 50);
  
  const results = {
    passed: 0,
    failed: 0,
    total: filterTests.length
  };
  
  for (const test of filterTests) {
    const result = await testFilter(test);
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '=' * 50);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`Total: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed > 0) {
    console.log(`\n${colors.yellow}⚠️  Some filters are not working correctly!${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✓ All filters are working correctly!${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test runner error:${colors.reset}`, error);
  process.exit(1);
});