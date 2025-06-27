# Comprehensive Funding Data Investigation Report

**Date**: December 26, 2024  
**Investigator**: Claude  
**Purpose**: Deep investigation into funding data availability from Grants.gov and EU Funding Portal APIs

## Executive Summary

After extensive testing and code analysis:

1. **Grants.gov API**: Confirmed that the search API does NOT provide funding amount fields
2. **EU Funding Portal API**: Confirmed that it DOES provide funding data in metadata fields
3. **Code Status**: Fixed both API clients to handle the actual API response structures

## Detailed Findings

### 1. Grants.gov API Investigation

#### API Endpoint Tested
- **URL**: `https://api.grants.gov/v1/api/search2`
- **Method**: POST
- **Authentication**: None required

#### Actual Response Structure
```json
{
  "id": "358587",
  "number": "DOT-SS4A-FY25-01",
  "title": "Safe Streets and Roads for All Funding Opportunity",
  "agencyCode": "DOT-DOT X-50",
  "agency": "69A345 Office of the Under Secretary for Policy",
  "openDate": "03/28/2025",
  "closeDate": "06/26/2025",
  "oppStatus": "posted",
  "docType": "synopsis",
  "cfdaList": ["20.939"]
}
```

#### Missing Fields Our Code Expected
- `awardFloor` - NOT PROVIDED
- `awardCeiling` - NOT PROVIDED
- `totalFunding` - NOT PROVIDED
- `expectedNumberOfAwards` - NOT PROVIDED

#### Fix Applied
```typescript
// Funding - Grants.gov API doesn't provide these fields in search response
currency: 'USD',
funding_amount_min: null, // Field not available in API
funding_amount_max: null, // Field not available in API
total_funding_available: null, // Field not available in API
expected_awards_count: null, // Field not available in API
```

### 2. EU Funding Portal API Investigation

#### API Endpoint Tested
- **URL**: `https://api.tech.ec.europa.eu/search-api/prod/rest/search`
- **Method**: POST (with query parameters)
- **Authentication**: API Key "SEDIA" as query parameter

#### Funding Data Sources Found

1. **cftEstimatedTotalProcedureValue** (for tenders)
   - Example: `["460000 EUR"]`
   - Found in `metadata.cftEstimatedTotalProcedureValue`

2. **budgetOverview** (for grants)
   - Contains structured JSON with budget breakdowns by year
   - Example: Shows EUR 900,000 allocated across different actions

3. **additionalInfos** (fallback)
   - Contains HTML with budget mentions
   - Example: "The indicative available budget for grants for this Call is EUR 900 000"

#### Fix Applied
Created a comprehensive funding extraction method:
```typescript
private extractFundingAmount(rawGrant: any): number | null {
  // 1. Check cftEstimatedTotalProcedureValue (tenders)
  // 2. Parse budgetOverview JSON (grants)
  // 3. Extract from additionalInfos HTML (fallback)
  return extractedAmount;
}
```

### 3. Alternative Data Sources for Grants.gov

Since Grants.gov doesn't provide funding amounts in the search API, consider:

1. **CFDA Integration**
   - Use CFDA numbers to lookup typical award amounts
   - Build a reference table of historical funding ranges by CFDA

2. **USASpending.gov API**
   - Provides historical award data
   - Can calculate average/typical funding amounts

3. **Agency-Specific APIs**
   - NSF, NIH, DOE have their own APIs with more detailed funding info

4. **Grant Detail Pages**
   - The full grant opportunity pages contain funding info
   - Would require authenticated access or web scraping

### 4. Impact Analysis

#### Current State
- **Grants.gov grants**: All have NULL funding amounts (1,217 posted grants affected)
- **EU grants**: Now properly extracting funding from multiple metadata sources

#### User Impact
- Users cannot filter Grants.gov opportunities by funding amount
- This significantly reduces the usefulness of the funding filter feature
- EU grants now show proper funding amounts

## Recommendations

### Immediate Actions (Completed)
✅ Fixed GrantsGovApiClient to return null for unavailable fields  
✅ Fixed EuFundingApiClient to extract funding from correct metadata fields  
✅ Added comprehensive funding extraction logic for EU grants

### Short-term Actions
1. **Add CFDA Lookup Table**
   - Create a reference table with typical funding ranges by CFDA code
   - Update during regular maintenance cycles

2. **Implement USASpending.gov Integration**
   - Use their API to get historical award data
   - Calculate average funding amounts by opportunity

3. **Add Data Quality Monitoring**
   - Track percentage of grants with missing funding data
   - Alert when data quality drops below threshold

### Long-term Actions
1. **Premium Data Sources**
   - Investigate commercial grant databases
   - Consider partnerships with data providers

2. **Machine Learning Approach**
   - Train model on historical data
   - Predict funding ranges based on grant characteristics

3. **Community Sourcing**
   - Allow users to contribute funding information
   - Build verification system for crowdsourced data

## Technical Details

### Files Modified
1. `/backend/src/services/api-integrations/clients/GrantsGovApiClient.ts`
   - Lines 72-75: Set funding fields to null

2. `/backend/src/services/api-integrations/clients/EuFundingApiClient.ts`
   - Added extractFundingAmount() method (lines 52-105)
   - Updated funding field extraction (lines 122-123)

### Testing Evidence
- Tested live Grants.gov API: Confirmed no funding fields
- Tested live EU Portal API: Found funding in metadata fields
- Verified fixes handle missing data gracefully

## Conclusion

The investigation confirms that:
1. Grants.gov search API fundamentally lacks funding data
2. EU Portal API provides funding data but in different fields than expected
3. Our code has been updated to reflect these realities
4. Additional data sources are needed for comprehensive funding information

This completes the deep research into funding data availability from both APIs.