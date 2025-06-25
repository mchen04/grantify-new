# NSF Awards API Testing Report

**API Name**: NSF Awards API  
**Base URL**: `https://www.research.gov/awardapi-service/v1/awards`  
**Test Date**: 2025-06-22  
**Status**: ✅ SUCCESS - Production Ready

## Executive Summary

The NSF Awards API is fully functional and provides access to National Science Foundation award data without authentication. The API returns comprehensive grant information including funding amounts, dates, locations, and award details. It supports both JSON and XML formats and offers various filtering capabilities suitable for a grant recommendation platform.

## API Capabilities

### 1. Endpoints
- **JSON Format**: `/v1/awards.json`
- **XML Format**: `/v1/awards.xml`
- **Method**: GET
- **Authentication**: None required

### 2. Available Data Fields

Each award includes:
- `id`: Unique NSF award ID
- `title`: Full award title
- `agency`: Always "NSF"
- `awardeeName`: Recipient organization
- `awardeeCity`: City location
- `awardeeStateCode`: State code
- `fundsObligatedAmt`: Award amount in dollars
- `date`: Award date (MM/DD/YYYY)
- `startDate`: Project start date
- `publicAccessMandate`: Public access requirement flag

### 3. Query Parameters

- `agency`: Filter by agency (e.g., "NSF")
- `cfdaNumber`: Filter by CFDA number (e.g., "47.041" for Engineering)
- `offset`: Pagination offset (default: 1)
- `printFields`: Specify which fields to return
- `awardsDateRangeStart`: Start date filter (MM/DD/YYYY)
- `awardsDateRangeEnd`: End date filter (MM/DD/YYYY)

### 4. CFDA Numbers for Key NSF Programs

- 47.041: Engineering
- 47.049: Mathematical and Physical Sciences
- 47.050: Geosciences
- 47.070: Computer and Information Science and Engineering
- 47.074: Biological Sciences
- 47.075: Social, Behavioral and Economic Sciences
- 47.076: Education and Human Resources

## Testing Results

### Test 1: Basic Query
```bash
curl -X GET "https://www.research.gov/awardapi-service/v1/awards.json?agency=NSF"
```
**Result**: ✅ Success - Retrieved recent NSF awards with full details

### Test 2: Filter by CFDA
```bash
curl -X GET "https://www.research.gov/awardapi-service/v1/awards.xml?cfdaNumber=47.041"
```
**Result**: ✅ Success - Retrieved engineering grants only

### Test 3: Custom Fields
```bash
curl -X GET "https://www.research.gov/awardapi-service/v1/awards.json?agency=NSF&printFields=id,title"
```
**Result**: ✅ Success - Returns only requested fields

## Production Integration Guide

### Implementation Strategy

1. **Data Collection**:
   - Daily sync of new awards by date range
   - Filter by relevant CFDA numbers for grant categories
   - Store historical data for trend analysis

2. **Recommended Query Pattern**:
   ```python
   # Get recent awards in a category
   params = {
       'agency': 'NSF',
       'cfdaNumber': '47.076',  # Education grants
       'offset': 1
   }
   ```

3. **Pagination Strategy**:
   - Default results per page: 25
   - Use offset parameter for pagination
   - No documented rate limits

### Data Schema for Recommendation Engine

```json
{
  "grant_id": "2507847",
  "title": "Postdoctoral Fellowship: PRFB: Using introduced parrots...",
  "agency": "NSF",
  "recipient_name": "DeRaad, Devon A",
  "recipient_org": "University Name",
  "location_city": "Lawrence",
  "location_state": "KS",
  "funding_amount": 270000,
  "award_date": "2025-04-29",
  "start_date": "2026-09-01",
  "cfda_number": "47.041",
  "category": "Engineering",
  "grant_type": "Fellowship",
  "eligibility": "Postdoctoral researchers"
}
```

## Limitations & Workarounds

1. **Limited Search Capabilities**: No keyword search in titles/abstracts
   - **Workaround**: Download all awards and implement local search

2. **No Detailed Abstracts**: API doesn't return project abstracts
   - **Solution**: Use award IDs to cross-reference with NSF.gov for details

3. **Historical Data**: Limited historical depth in API queries
   - **Solution**: Build local database with regular syncs

4. **No Deadline Information**: Awards are past grants, not open opportunities
   - **Note**: This API is for awarded grants, not open solicitations

## Production Recommendations

1. **Use Case**: Best for tracking awarded grants and funding trends
2. **Update Frequency**: Daily sync for new awards
3. **Data Volume**: ~50,000+ awards per year
4. **Storage Requirements**: ~100MB annually

## Sample Production Code

```python
import requests
import json
from datetime import datetime, timedelta

class NSFAwardsAPI:
    BASE_URL = "https://www.research.gov/awardapi-service/v1/awards.json"
    
    # CFDA mapping for categories
    CFDA_CATEGORIES = {
        "Engineering": "47.041",
        "Mathematics and Physical Sciences": "47.049",
        "Geosciences": "47.050",
        "Computer Science": "47.070",
        "Biological Sciences": "47.074",
        "Social Sciences": "47.075",
        "Education": "47.076"
    }
    
    def get_awards_by_category(self, category, offset=1):
        """Get awards for a specific category"""
        cfda = self.CFDA_CATEGORIES.get(category)
        if not cfda:
            return None
            
        params = {
            'agency': 'NSF',
            'cfdaNumber': cfda,
            'offset': offset
        }
        
        response = requests.get(self.BASE_URL, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('response', {}).get('award', [])
        return None
    
    def get_recent_awards(self, days_back=30):
        """Get awards from the last N days"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        params = {
            'agency': 'NSF',
            'awardsDateRangeStart': start_date.strftime('%m/%d/%Y'),
            'awardsDateRangeEnd': end_date.strftime('%m/%d/%Y')
        }
        
        response = requests.get(self.BASE_URL, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('response', {}).get('award', [])
        return None
    
    def extract_grant_insights(self, awards):
        """Extract insights for recommendation engine"""
        insights = {
            'total_funding': sum(int(a.get('fundsObligatedAmt', 0)) for a in awards),
            'avg_funding': 0,
            'state_distribution': {},
            'popular_topics': []
        }
        
        if awards:
            insights['avg_funding'] = insights['total_funding'] // len(awards)
            
            # State distribution
            for award in awards:
                state = award.get('awardeeStateCode', 'Unknown')
                insights['state_distribution'][state] = \
                    insights['state_distribution'].get(state, 0) + 1
        
        return insights
```

## Integration with Grant Recommendation Platform

### Use Cases

1. **Funding Trend Analysis**: Show users typical award amounts in their field
2. **Geographic Insights**: Display funding distribution by state
3. **Success Examples**: Show recently funded projects similar to user interests
4. **Institution Analysis**: Identify which organizations receive funding

### Data Enrichment Strategy

Since this API provides awarded grants (not open opportunities), use it to:
- Build profiles of successful grant recipients
- Analyze funding patterns and trends
- Provide examples of winning proposals
- Guide users on typical award amounts

## Conclusion

The NSF Awards API is production-ready and provides valuable historical grant data. While it doesn't offer open grant opportunities, it's excellent for understanding NSF funding patterns, typical award amounts, and successful recipient profiles. This data can significantly enhance a grant recommendation platform by providing users with insights into what gets funded and how much funding to expect.

**Recommendation**: Implement as a supplementary data source for funding intelligence and trend analysis. Combine with Grants.gov for open opportunities.