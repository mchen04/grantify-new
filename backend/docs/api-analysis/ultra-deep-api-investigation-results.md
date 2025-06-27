# Ultra-Deep API Investigation Results

**Date**: December 26, 2024  
**Investigation Method**: Direct API testing, database analysis, code review

## Executive Summary

After ultra-deep investigation of each data source:

1. **EU Portal API** - We ARE missing funding data! 47% of grants have funding in metadata fields
2. **Federal Register** - Funding amounts exist in description text (could be extracted)
3. **Grants.gov** - Confirmed: NO funding data in search API
4. **OpenAlex** - Not a grant database (it's academic papers mentioning grants)

## Detailed Findings by Data Source

### 1. EU Funding Portal ⚠️ MAJOR FINDING

**Current Status**: Shows 0% funding coverage  
**Reality**: 47% of grants HAVE funding data available!

**Available Funding Fields Found**:
```json
// In metadata.cftEstimatedTotalProcedureValue (294 grants)
"cftEstimatedTotalProcedureValue": ["400000 EUR"]

// In metadata.budgetOverview (196 grants)
"budgetOverview": [{
  "budgetTopicActionMap": {
    "33687": [{
      "budgetYearMap": {"0": 500000}  // €500,000
    }]
  }
}]
```

**Examples Found**:
- Collaborative Spectrum Sharing: €500,000
- Food Scanner Prize: €1,000,000
- Birth Day Prize: €1,000,000
- Social Innovation Prize: €2,000,000

**Fix Required**: Update `extractFundingAmount()` to parse these fields

### 2. Federal Register 💡 OPPORTUNITY

**Current Status**: Shows 0% funding coverage  
**Reality**: Many grants have funding amounts in description text!

**Examples Found**:
- "approximately $26 million will be available"
- "$20 million in FY 2025 Airport Infrastructure Grant funds"
- "$42 million, pending availability of funding"
- "in excess of $200 million available"

**Potential Solution**: Extract funding using regex patterns from descriptions

### 3. Grants.gov ❌ CONFIRMED LIMITATION

**API Response Structure**:
```json
{
  "id": "50283",
  "number": "PD-09-5761", 
  "title": "Supplemental Opportunity...",
  "agencyCode": "NSF",
  "agency": "U.S. National Science Foundation",
  "openDate": "11/18/2009",
  "closeDate": "",
  "oppStatus": "posted",
  "docType": "synopsis",
  "cfdaList": ["47.041"]
}
```

**Missing Fields Our Code Expects**:
- awardFloor ❌
- awardCeiling ❌
- totalFunding ❌
- expectedNumberOfAwards ❌
- description ❌
- eligibility ❌

**Alternative Endpoints Tested**:
- `/v1/api/opportunities` - 403 Forbidden
- `/v1/api/search` - 403 Forbidden
- `/grantsws/OppDetails` - May have XML data (needs auth)

### 4. World Bank ✅ ALREADY FIXED

- Funding data available and correctly parsed
- Recent fix multiplied amounts by 1,000,000 (were in millions)
- 83% coverage is accurate

### 5. California Grants ✅ BEST QUALITY

- 100% eligibility coverage (only source with structured eligibility!)
- 99% description coverage
- 28% funding coverage (many grants don't specify amounts)

### 6. OpenAlex 🔄 MISUNDERSTOOD PURPOSE

**Not a grant database!** It's an academic publication database.
- Searches for papers that mention grants
- Used to find grant-funded research outputs
- No actual grant opportunities

## Immediate Actions Required

### 1. Fix EU Portal Funding Extraction (HIGH PRIORITY)
```typescript
// Add to extractFundingAmount():
// 1. Parse cftEstimatedTotalProcedureValue
// 2. Parse budgetOverview JSON structure
// 3. Will add funding to ~490 EU grants!
```

### 2. Extract Federal Register Funding (MEDIUM PRIORITY)
```typescript
// Add regex extraction:
const amountMatch = description.match(/\$([0-9,]+(?:\.[0-9]+)?)\s*(million|billion)?/i);
// Will add funding to ~50+ Federal Register grants
```

### 3. Update Documentation (HIGH PRIORITY)
- Clearly state Grants.gov doesn't provide funding
- Explain why 54% of grants lack funding data
- Set user expectations appropriately

## Data Completeness Reality Check

| Data Source | Grants | Reality | Current Status | Action Needed |
|-------------|--------|---------|----------------|---------------|
| EU Portal | 1,037 | 47% have funding | Shows 0% | Parse metadata fields |
| Federal Register | 183 | ~30% have funding | Shows 0% | Extract from text |
| Grants.gov | 2,094 | 0% have funding | Shows 0% | None - API limitation |
| World Bank | 200 | 83% have funding | Shows 83% | Already fixed ✅ |
| California | 159 | 28% have funding | Shows 28% | Already optimal ✅ |

## SQL Scripts to Apply Fixes

### Fix EU Portal Funding
```sql
-- Already created: fix-eu-funding-amounts.sql
-- Will update ~490 grants with funding data
```

### Extract Federal Register Funding
```sql
UPDATE grants
SET funding_amount_max = 
  CASE 
    WHEN description ~* '\$([0-9]+) million' THEN 
      (regexp_match(description, '\$([0-9]+) million', 'i'))[1]::numeric * 1000000
    WHEN description ~* '\$([0-9,]+)' THEN
      replace((regexp_match(description, '\$([0-9,]+)', 'i'))[1], ',', '')::numeric
    ELSE NULL
  END
WHERE data_source_id = (SELECT id FROM data_sources WHERE name = 'federal_register')
  AND description ~* '\$[0-9,]+';
```

## Conclusion

The investigation revealed that:
1. **We ARE missing extractable data** from EU Portal (47% of grants)
2. **Federal Register has funding in text** (extractable)
3. **Grants.gov truly lacks funding data** (API limitation)
4. **OpenAlex isn't a grant source** (it's research papers)

By fixing EU Portal and Federal Register extraction, we can add funding data to ~540 additional grants, improving coverage from 8% to ~22% for these sources.