# Funding Data Investigation Report

**Date**: December 26, 2024  
**Purpose**: Investigate whether Grants.gov and EU Funding Portal APIs provide funding amount information

## Executive Summary

After extensive testing and analysis:

1. **Grants.gov API**: The search API (`/v1/api/search2`) does NOT provide funding amount fields in its response
2. **EU Funding Portal API**: DOES provide funding information in some cases, particularly in the `metadata` fields
3. **Current Implementation**: Our code is trying to extract fields that don't exist in the Grants.gov API response

## Detailed Findings

### 1. Grants.gov API

#### Available Fields in Search Response
```json
{
  "id": "50283",
  "number": "PD-09-5761",
  "title": "Supplemental Opportunity for SBIR/STTR Memberships in I/UCRCs",
  "agencyCode": "NSF",
  "agency": "U.S. National Science Foundation",
  "openDate": "11/18/2009",
  "closeDate": "",
  "oppStatus": "posted",
  "docType": "synopsis",
  "cfdaList": ["47.041"]
}
```

#### Missing Fields Our Code Expects
- `awardFloor`
- `awardCeiling`
- `totalFunding`
- `expectedNumberOfAwards`

These fields are NOT present in the API response, despite our `GrantsGovApiClient.ts` trying to extract them (lines 71-75).

#### Potential Solutions for Grants.gov
1. **Use CFDA Numbers**: Cross-reference with Catalog of Federal Domestic Assistance for typical award amounts
2. **Parse Grant Titles**: Some titles include funding information (e.g., "$5M available")
3. **Access Detail Pages**: The detail pages on grants.gov website show funding info, but require different authentication
4. **Use Synopsis/Description**: May need to fetch full grant details through a different endpoint

### 2. EU Funding Portal API

#### Available Funding Fields
The EU API DOES provide funding information in certain metadata fields:

1. **`cftEstimatedTotalProcedureValue`**: Contains estimated funding amount
   - Example: `["350000.00 EUR"]`

2. **`cftEstimatedOverallContractCurrency`**: Currency information

3. **Content Field**: Sometimes contains budget information in HTML format
   - Can be parsed for amounts like "EUR 5 million" or "€350,000"

4. **`latestInfos` Field**: May contain detailed budget breakdowns in HTML format

#### Current Implementation Issues
Our `EuFundingApiClient.ts` is looking for fields that don't match the actual API response:
- Looking for: `minContribution`, `maxContribution`, `budgetTopicCall`
- Should use: `cftEstimatedTotalProcedureValue`, parse content/latestInfos

### 3. Code Changes Needed

#### For GrantsGovApiClient.ts
```typescript
// Remove or set to null these fields since they don't exist:
funding_amount_min: null, // was: GrantNormalizer.normalizeAmount(rawGrant.awardFloor)
funding_amount_max: null, // was: GrantNormalizer.normalizeAmount(rawGrant.awardCeiling)
total_funding_available: null, // was: GrantNormalizer.normalizeAmount(rawGrant.totalFunding)
expected_awards_count: null, // was: rawGrant.expectedNumberOfAwards
```

#### For EuFundingApiClient.ts
```typescript
// Update to use actual fields:
funding_amount_min: null, // Usually not provided
funding_amount_max: GrantNormalizer.normalizeAmount(
  rawGrant.metadata?.cftEstimatedTotalProcedureValue?.[0]
),
total_funding_available: GrantNormalizer.normalizeAmount(
  rawGrant.metadata?.cftEstimatedTotalProcedureValue?.[0]
),
```

### 4. Additional Data Sources Needed

Since Grants.gov doesn't provide funding amounts in the search API, consider:

1. **CFDA Database Integration**: Build a lookup table of typical award amounts by CFDA number
2. **Web Scraping**: Extract funding info from grant detail pages (requires different approach)
3. **Alternative APIs**: 
   - USASpending.gov API for historical award data
   - Agency-specific APIs (NSF, NIH have their own APIs with more details)
4. **Manual Data Entry**: For high-priority grants, manually enter funding ranges

## Recommendations

### Immediate Actions
1. **Fix the code** to stop trying to extract non-existent fields
2. **Update EU client** to use the correct metadata fields
3. **Set funding fields to null** for Grants.gov until we have alternative data sources

### Medium-term Solutions
1. **Build CFDA lookup table** with typical award ranges
2. **Implement content parsing** for EU grants to extract amounts from HTML
3. **Add data quality monitoring** to track grants with missing funding info

### Long-term Solutions
1. **Integrate additional APIs** (USASpending.gov, agency-specific)
2. **Consider premium data sources** if available
3. **Build ML model** to predict funding ranges based on historical data

## Testing Evidence

All tests conducted on December 26, 2024 confirm:
- Grants.gov API search endpoint returns only basic grant metadata
- EU Funding Portal includes funding in metadata but in different fields than expected
- No additional public endpoints found for detailed grant information without authentication

## Impact on Users

Currently, users see:
- No funding amounts for most grants
- Incorrect data extraction attempts
- Potential errors in data processing

This significantly impacts the user experience as funding amount is a critical filter for grant seekers.