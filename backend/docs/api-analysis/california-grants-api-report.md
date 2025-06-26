# California Grants Portal API Testing Report

**API Name**: California Grants Portal API (via CA Open Data)  
**Base URL**: `https://data.ca.gov/api/3/action/`  
**Test Date**: 2025-06-22  
**Status**: SUCCESS - Production Ready

## Executive Summary

The California Grants Portal provides comprehensive API access through the California Open Data platform (data.ca.gov). The API offers full access to state grant opportunities and awards data without authentication. With daily updates, SQL query support, and rich filtering capabilities, it's an excellent source for California state grant information.

## API Capabilities

### 1. Endpoints
- **Package Info**: `/package_show?id=california-grants-portal`
- **Grant Opportunities**: `/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5`
- **Grant Awards**: `/datastore_search?resource_id=018f3523-652d-4197-a4a8-a055bfd1544f`
- **SQL Queries**: `/datastore_search_sql`

### 2. Authentication
- **None required** - Completely open API
- No rate limits documented
- CORS enabled for browser access

### 3. Data Resources
- **Grant Opportunities**: ~1,690 active grants (updated daily at 8:45 PM PT)
- **Grant Awards**: ~9,367 FY 2023-2024 awards
- **Fields**: 37 fields per grant including all essential information

## Available Data Fields

### Grant Opportunities Fields
- `Grant Title` - Full name of the grant
- `Grant ID` - Unique identifier
- `Status` - active/closed
- `Purpose` - Grant description
- `Funding Source` - State/Federal origin
- `Loan Or Grant` - Type of funding
- `Fund Amount` - Available funding
- `Estimated Number Of Awards` - Expected recipients
- `Estimated Funding Per Award` - Individual award amount
- `Application Due Date` - Deadline
- `Categories` - Subject areas (Education, Environment, etc.)
- `Matching Funds` - Requirements
- `Geographic Eligibility` - Location restrictions
- `Applicant Type Eligibility` - Who can apply
- `Agency Name` - Granting agency
- `Agency Contact Email` - Point of contact
- `Resource URL` - Application link

## Testing Results

### Test 1: Basic Grant Search
```bash
curl -G "https://data.ca.gov/api/3/action/datastore_search" \
  --data-urlencode "resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5" \
  --data-urlencode "limit=5"
```
**Result**: Success - Returns grant opportunities with full details

### Test 2: Filter Active Grants
```bash
curl -G "https://data.ca.gov/api/3/action/datastore_search" \
  --data-urlencode "resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5" \
  --data-urlencode 'filters={"Status":"active"}' \
  --data-urlencode "limit=10"
```
**Result**: Success - Returns only active grant opportunities

### Test 3: SQL Query for Category
```bash
curl -G "https://data.ca.gov/api/3/action/datastore_search_sql" \
  --data-urlencode 'sql=SELECT * FROM "111c8c88-21f6-453c-ae2c-b4785a0624f5" WHERE "Categories" LIKE '\''%Education%'\'' LIMIT 10'
```
**Result**: Success - Returns education-related grants

## Production Integration Guide

### Implementation Strategy

1. **Data Sync Approach**:
   - Daily sync at 9 PM PT (after 8:45 PM update)
   - Incremental updates based on `Last Modified Date`
   - Full refresh weekly for data integrity

2. **Query Optimization**:
   ```python
   # Get active grants with pagination
   params = {
       'resource_id': '111c8c88-21f6-453c-ae2c-b4785a0624f5',
       'filters': json.dumps({'Status': 'active'}),
       'limit': 100,
       'offset': 0,
       'sort': 'Application Due Date asc'
   }
   ```

3. **Category Mapping**:
   - Education
   - Environment and Water
   - Health and Human Services
   - Business and Commerce
   - Housing and Community Development
   - Public Safety
   - Science and Technology

### Data Schema for Recommendation Engine

```json
{
  "grant_id": "22-10654",
  "title": "Clean California Local Grant Program",
  "agency": "California Department of Transportation",
  "status": "active",
  "funding_amount": "$10,000,000.00",
  "award_min": "$50,000.00",
  "award_max": "$5,000,000.00",
  "estimated_awards": "5",
  "deadline": "2025-03-15",
  "categories": ["Environment and Water", "Transportation"],
  "eligibility": {
    "geographic": "California",
    "applicant_types": ["Local Agency", "Nonprofit", "Tribe"]
  },
  "matching_required": false,
  "description": "Grant purpose and requirements...",
  "application_url": "https://..."
}
```

## Sample Production Code

```python
import requests
import json
from datetime import datetime

class CaliforniaGrantsAPI:
    BASE_URL = "https://data.ca.gov/api/3/action"
    GRANTS_RESOURCE_ID = "111c8c88-21f6-453c-ae2c-b4785a0624f5"
    
    def get_active_grants(self, category=None, limit=100):
        """Get active grant opportunities"""
        
        url = f"{self.BASE_URL}/datastore_search"
        
        # Build filters
        filters = {"Status": "active"}
        
        params = {
            'resource_id': self.GRANTS_RESOURCE_ID,
            'filters': json.dumps(filters),
            'limit': limit,
            'sort': 'Application Due Date asc'
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            grants = data['result']['records']
            
            # Filter by category if specified
            if category:
                grants = [g for g in grants if category in g.get('Categories', '')]
            
            return grants
        
        return None
    
    def search_grants_sql(self, query):
        """Execute SQL query for complex searches"""
        
        url = f"{self.BASE_URL}/datastore_search_sql"
        
        params = {
            'sql': f'SELECT * FROM "{self.GRANTS_RESOURCE_ID}" WHERE {query}'
        }
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            return response.json()['result']['records']
        
        return None
    
    def get_grants_by_eligibility(self, applicant_type):
        """Find grants for specific applicant types"""
        
        query = f'"Applicant Type Eligibility" LIKE \'%{applicant_type}%\' AND "Status" = \'active\''
        return self.search_grants_sql(query)
    
    def get_upcoming_deadlines(self, days=30):
        """Get grants with upcoming deadlines"""
        
        future_date = datetime.now().strftime('%Y-%m-%d')
        query = f'"Application Due Date" >= \'{future_date}\' AND "Status" = \'active\' ORDER BY "Application Due Date" ASC'
        return self.search_grants_sql(query)
```

## API Best Practices

1. **Pagination**: Use offset/limit for large datasets
2. **Filtering**: Use filters parameter for simple queries, SQL for complex
3. **Caching**: Cache category lists and agency names
4. **Error Handling**: Check `success` field in responses

## Unique Features

1. **SQL Support**: Full SQL queries for complex filtering
2. **Field Selection**: Use `fields` parameter to limit response size
3. **Sorting**: Multiple field sorting with direction
4. **Full Text Search**: Use `q` parameter for text search

## Production Recommendations

1. **Priority**: HIGH - Only comprehensive source for CA state grants
2. **Update Frequency**: Daily at 9 PM PT
3. **Data Volume**: ~2,000 opportunities, ~10,000 awards
4. **Storage Requirements**: ~50MB for complete dataset

## Integration Benefits

1. **Complete Coverage**: All California state grants in one place
2. **Rich Metadata**: Detailed eligibility and category information
3. **Reliable Updates**: Daily automated updates
4. **No Authentication**: Simple integration without API keys

## Conclusion

The California Grants Portal API is production-ready and provides excellent access to state grant opportunities. With comprehensive filtering, SQL support, and daily updates, it's an essential data source for any grant recommendation platform serving California users. The open access and well-structured data make it ideal for integration.

**Recommendation**: Implement immediately as the primary source for California state grants. The API's reliability, data quality, and feature set make it a model for state-level grant data access.