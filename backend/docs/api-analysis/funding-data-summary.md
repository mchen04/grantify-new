# Funding Data Summary - Code Analysis

## Current Implementation Issues

### 1. GrantsGovApiClient.ts (Lines 71-75)
The code is trying to extract these fields from the API response:
```typescript
funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant.awardFloor),
funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant.awardCeiling),
total_funding_available: GrantNormalizer.normalizeAmount(rawGrant.totalFunding),
expected_awards_count: rawGrant.expectedNumberOfAwards,
```

**Problem**: These fields (`awardFloor`, `awardCeiling`, `totalFunding`, `expectedNumberOfAwards`) do NOT exist in the Grants.gov API response.

**Actual API Response Structure**:
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

### 2. EuFundingApiClient.ts (Lines 66-68)
The code is trying to extract:
```typescript
funding_amount_min: GrantNormalizer.normalizeAmount(rawGrant.minContribution),
funding_amount_max: GrantNormalizer.normalizeAmount(rawGrant.maxContribution),
total_funding_available: GrantNormalizer.normalizeAmount(rawGrant.budgetTopicCall),
```

**Problem**: These fields don't exist in the raw grant object. However, the EU API DOES provide funding information in different fields:
- `metadata.cftEstimatedTotalProcedureValue` - Contains values like `["350000.00 EUR"]`
- Content and metadata fields may contain budget information in HTML format

## Recommendations

### Immediate Fix for GrantsGovApiClient.ts
```typescript
// Set to null since data isn't available from API
funding_amount_min: null,
funding_amount_max: null,
total_funding_available: null,
expected_awards_count: null,
```

### Fix for EuFundingApiClient.ts
```typescript
// Extract from actual available fields
const estimatedValue = rawGrant.metadata?.cftEstimatedTotalProcedureValue?.[0];
const fundingAmount = estimatedValue ? GrantNormalizer.normalizeAmount(estimatedValue) : null;

funding_amount_min: null,
funding_amount_max: fundingAmount,
total_funding_available: fundingAmount,
```

### Additional Data Sources Needed
1. **For Grants.gov**: 
   - Use CFDA numbers to cross-reference typical award amounts
   - Consider integrating USASpending.gov API for historical award data
   - Parse grant titles/descriptions for funding mentions

2. **For EU Portal**:
   - Parse HTML content in metadata fields
   - Extract budget information from `latestInfos` field
   - Use regex to find EUR amounts in content

## Impact
- Currently all Grants.gov grants have NULL funding amounts
- EU grants may have incorrect or NULL funding amounts
- This severely limits the usefulness of funding-based filters