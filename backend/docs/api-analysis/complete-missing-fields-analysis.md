# Complete Missing Fields Analysis - Grantify.ai Database

**Date**: December 26, 2024  
**Total Grants**: 3,874

## Executive Summary

Analysis of the Grantify.ai database reveals significant missing data across multiple fields, with some fields having >90% NULL rates. This report analyzes each data source to determine whether these missing fields are due to API limitations or parsing issues.

## Database-Wide Missing Field Statistics

| Field | NULL Count | NULL % | Primary Cause |
|-------|------------|--------|---------------|
| guidelines_url | 3,819 | 98.58% | Not provided by most APIs |
| total_funding_available | 3,661 | 94.50% | API limitation (Grants.gov, EU Portal) |
| eligibility_criteria | 3,583 | 92.49% | Only California provides structured eligibility |
| funding_amount_min/max | 3,566 | 92.05% | Grants.gov doesn't provide |
| description | 2,369 | 61.15% | Grants.gov doesn't provide |
| application_deadline | 2,097 | 54.13% | Some sources don't have deadlines |
| summary | 2,035 | 52.53% | Mixed availability |
| posted_date | 1,013 | 26.15% | Generally available |
| application_url | 332 | 8.57% | Most sources provide URLs |

## Data Source Analysis

### 1. Grants.gov (2,094 grants - 54% of total)

**API Limitations:**
- ❌ **NO funding amounts** - API doesn't return awardFloor, awardCeiling, totalFunding
- ❌ **NO descriptions** - Only titles provided in search API
- ❌ **NO eligibility criteria** - Not in search response
- ❌ **NO guidelines URL** - Not provided
- ✅ Application deadlines (51% have deadlines)
- ✅ Basic metadata (title, agency, dates, CFDA)

**Actual API Response Fields:**
```json
{
  "id", "number", "title", "agencyCode", "agency",
  "openDate", "closeDate", "oppStatus", "docType", "cfdaList"
}
```

**Potential Solutions:**
1. Use CFDA numbers to cross-reference typical award amounts
2. Access full opportunity details (requires different authentication)
3. Integrate USASpending.gov API for historical award data

### 2. EU Funding Portal (1,037 grants - 27% of total)

**Current Issues:**
- ❌ Funding data exists in metadata but not extracted (FIXABLE!)
- ✅ Descriptions available (99% coverage)
- ❌ No structured eligibility criteria
- ✅ Deadlines available (47% coverage)
- ✅ Summaries available (99% coverage)

**Available Funding Fields in Metadata:**
- `cftEstimatedTotalProcedureValue`: e.g., "400000 EUR"
- `cftEstimatedOverallContractAmount`: e.g., "400000"
- `budgetOverview`: Complex JSON with yearly budgets

**Fix Status**: Parser updated but needs retroactive application to existing grants

### 3. World Bank (200 grants - 5% of total)

**Data Coverage:**
- ✅ Good funding data (83% have amounts) - Already fixed
- ❌ NO descriptions in API
- ✅ Some eligibility info (44%)
- ✅ Some deadlines (44%)
- ❌ NO summaries

**Note**: Recent fix multiplied amounts by 1,000,000 (values were in millions)

### 4. California Grants Portal (159 grants - 4% of total)

**Best Data Quality:**
- ✅ EXCELLENT eligibility criteria (100% coverage)
- ✅ EXCELLENT descriptions (99% coverage)
- ✅ EXCELLENT summaries (100% coverage)
- ⚠️ POOR funding data (28% coverage) - Parser exists but many grants don't specify amounts
- ⚠️ Some guidelines URLs (35% coverage)
- ⚠️ Poor deadline coverage (23%)

### 5. Federal Register (183 grants)

**Limited Data:**
- ❌ NO funding amounts
- ✅ Some descriptions (63% coverage)
- ❌ NO eligibility criteria
- ❌ NO deadlines
- ❌ Minimal summaries (2%)

### 6. Other Sources (NSF, USASpending, OpenAlex, UKRI)

**Mixed Quality:**
- NSF Awards: Good funding data and descriptions
- USASpending: Complete data for awarded grants
- OpenAlex: Academic grants with descriptions
- UKRI: Limited data, few grants

## Critical Findings

### 1. Grants.gov API Fundamental Limitation
The Grants.gov search API (`/v1/api/search2`) does NOT provide:
- Funding amounts (awardFloor, awardCeiling)
- Descriptions
- Eligibility criteria
- Expected number of awards

This affects 54% of all grants in the database.

### 2. EU Portal Funding Data Available but Not Extracted
EU grants have funding data in metadata fields but show NULL in database:
- Fix exists in code but needs retroactive application
- Affects 1,037 grants (27% of total)

### 3. Guidelines URL Rarely Provided
Only California Grants provides guidelines URLs (35% of their grants)
- 98.58% NULL rate is expected, not a bug

### 4. Eligibility Criteria Structural Issue
Only California provides structured eligibility data
- Other sources may have eligibility in description text
- Requires NLP extraction for other sources

## Immediate Actions Required

### 1. Apply EU Funding Fix (High Priority)
```sql
-- Script already created: fix-eu-funding-amounts.sql
-- Will update ~1,000 grants with funding data
```

### 2. Document API Limitations
Update documentation to clearly state:
- Grants.gov doesn't provide funding amounts
- Most sources don't provide guidelines URLs
- Eligibility is only structured for California

### 3. Implement Alternative Data Sources
For Grants.gov grants:
- Build CFDA award amount lookup table
- Integrate USASpending.gov for historical data
- Consider web scraping for critical grants

## Long-term Recommendations

### 1. Data Enrichment Pipeline
- Use LLMs to extract eligibility from descriptions
- Cross-reference multiple APIs for complete data
- Implement user-contributed data with verification

### 2. API-Specific Optimizations
- **Grants.gov**: Access detail pages or use different endpoints
- **EU Portal**: Parse complex budgetOverview JSON
- **World Bank**: Fetch project documents for descriptions

### 3. User Experience Improvements
- Clearly indicate why funding data is missing
- Provide alternative filters when funding unavailable
- Show data completeness indicators

## Validation Script
```typescript
// For each API client, verify actual response fields
// Update parsers to handle only available fields
// Set realistic expectations for data completeness
```

## Conclusion

The high NULL rates are primarily due to API limitations rather than parsing errors:
- **Grants.gov** (54% of grants) fundamentally lacks funding data
- **EU Portal** has funding data that needs extraction (fixable)
- **Guidelines URLs** and **structured eligibility** are rarely provided

The system should be updated to:
1. Fix EU funding extraction (immediate)
2. Document known limitations
3. Implement alternative data sources for missing fields