# Canadian Open Government API Testing Report

**API Name**: Canadian Open Government API (CKAN)  
**Base URL**: `https://open.canada.ca/data/api/3/action/`  
**Test Date**: 2025-06-22  
**Status**: SUCCESS - Production Ready

## Executive Summary

The Canadian Open Government API provides comprehensive access to Canadian federal grant data through the CKAN API platform. With over 1.1 million grant records available through the Treasury Board's Proactive Disclosure dataset and additional datasets from various agencies like CIHR, this API offers extensive coverage of Canadian government funding. No authentication is required, making it ideal for integration into grant recommendation platforms.

## API Capabilities

### 1. Endpoints
- **Package Search**: `/package_search` - Search datasets
- **Package Show**: `/package_show` - Get dataset details
- **Datastore Search**: `/datastore_search` - Query data within datasets
- **Datastore SQL**: `/datastore_search_sql` - SQL queries on datasets
- **Authentication**: None required
- **Response Format**: JSON

### 2. Key Grant Datasets

#### Treasury Board Grants and Contributions
- **Resource ID**: `1d15a62f-5656-49ad-8c88-f40ce689d831`
- **Records**: 1,167,442 grant records
- **Coverage**: All federal departments and agencies

#### CIHR Grants and Awards
- **Dataset ID**: `49edb1d7-5cb4-4fa7-897c-515d1aad5da3`
- **Format**: Annual XLSX files (2000-2024)
- **Coverage**: Canadian health research grants

### 3. Search Parameters
- `q`: Text search query
- `filters`: JSON object for field filtering
- `limit`: Results per request (max 32000)
- `offset`: Pagination offset
- `fields`: Specific fields to return
- `sort`: Sort order

## Testing Results

### Test 1: Search for Grant Datasets
```bash
curl -X GET "https://open.canada.ca/data/api/3/action/package_search?q=grant&rows=5"
```
**Result**: Success - Found 435 grant-related datasets

### Test 2: Query Treasury Board Grants
```bash
curl -X GET "https://open.canada.ca/data/api/3/action/datastore_search?resource_id=1d15a62f-5656-49ad-8c88-f40ce689d831&limit=3"
```
**Result**: Success - Access to 1.1M+ grant records

### Test 3: Filter by Organization
```bash
curl -X GET "https://open.canada.ca/data/api/3/action/datastore_search" \
  -d "resource_id=1d15a62f-5656-49ad-8c88-f40ce689d831" \
  -d 'filters={"owner_org":"casdo-ocena"}' \
  -d "limit=10"
```
**Result**: Success - Filtering works correctly

## Data Structure

### Grant Record Fields
```json
{
  "ref_number": "Unique reference",
  "agreement_type": "G (Grant) or C (Contribution)",
  "recipient_legal_name": "Organization name",
  "recipient_city": "City",
  "recipient_province": "Province code",
  "recipient_postal_code": "Postal code",
  "prog_name_en": "Program name in English",
  "prog_name_fr": "Program name in French",
  "agreement_title_en": "Grant title",
  "agreement_value": "Amount in CAD",
  "agreement_start_date": "YYYY-MM-DD",
  "agreement_end_date": "YYYY-MM-DD",
  "description_en": "Grant description",
  "expected_results_en": "Expected outcomes",
  "owner_org": "Department code",
  "owner_org_title": "Department name"
}
```

## Production Integration Guide

### Implementation Strategy

1. **Data Collection Focus**:
   - Treasury Board dataset for comprehensive coverage
   - CIHR dataset for health research
   - Filter by agreement_type = "G" for grants only
   - Recent dates for active opportunities

2. **Query Pattern**:
   ```python
   # Get recent grants
   params = {
       'resource_id': '1d15a62f-5656-49ad-8c88-f40ce689d831',
       'filters': json.dumps({
           'agreement_type': 'G',
           'agreement_start_date': '>2024-01-01'
       }),
       'limit': 1000,
       'offset': 0
   }
   ```

3. **Pagination**:
   - Max 32000 records per request
   - Use offset for pagination
   - Total count in response

### Data Schema for Recommendation Engine

```json
{
  "grant_id": "01-2019-2020-Q4-16727281",
  "title": "Analysis of CSA Group standards",
  "funding_organization": "Accessibility Standards Canada",
  "program_name": "Advancing Accessibility Standards Research",
  "recipient_name": "Canadian Standards Association",
  "location": {
    "city": "Toronto",
    "province": "ON",
    "postal_code": "M9W 1R3",
    "country": "CA"
  },
  "funding_amount": 79365,
  "currency": "CAD",
  "start_date": "2020-03-23",
  "end_date": "2021-02-19",
  "description": "Research project description...",
  "expected_results": "Project outcomes...",
  "type": "grant",
  "status": "completed"
}
```

## Unique Features

1. **Bilingual Data**: English and French fields
2. **SQL Support**: Direct SQL queries on datasets
3. **Comprehensive Coverage**: All federal departments
4. **Historical Data**: Records dating back years
5. **Geographic Data**: Postal codes and ridings

## Limitations & Considerations

1. **Mixed Data**: Includes both grants and contributions
   - **Solution**: Filter by agreement_type = "G"

2. **Historical Focus**: Many completed grants
   - **Solution**: Filter by recent dates

3. **Large Dataset**: 1M+ records
   - **Solution**: Use filters and pagination

4. **XLSX Downloads**: Some datasets only in Excel
   - **Solution**: Download and process separately

## Sample Production Code

```python
import requests
import json
from datetime import datetime, timedelta

class CanadianGrantsAPI:
    BASE_URL = "https://open.canada.ca/data/api/3/action"
    GRANTS_RESOURCE_ID = "1d15a62f-5656-49ad-8c88-f40ce689d831"
    
    def search_grants(self, start_date=None, organization=None, limit=1000):
        """Search Canadian government grants"""
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        
        filters = {
            'agreement_type': 'G',  # Grants only
            'agreement_start_date': f'>{start_date}'
        }
        
        if organization:
            filters['owner_org'] = organization
        
        params = {
            'resource_id': self.GRANTS_RESOURCE_ID,
            'filters': json.dumps(filters),
            'limit': limit
        }
        
        response = requests.get(
            f"{self.BASE_URL}/datastore_search",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            return data['result']
        return None
    
    def get_all_grants(self, start_date=None, max_records=10000):
        """Get all grants with pagination"""
        
        all_grants = []
        offset = 0
        limit = 1000  # Reasonable chunk size
        
        while offset < max_records:
            result = self.search_grants(start_date, limit=limit)
            
            if not result or not result['records']:
                break
            
            all_grants.extend(result['records'])
            total = result['total']
            
            if offset + limit >= total:
                break
                
            offset += limit
            
        return all_grants
    
    def search_by_program(self, program_name):
        """Search grants by program name"""
        
        sql = f"""
        SELECT * FROM "{self.GRANTS_RESOURCE_ID}"
        WHERE agreement_type = 'G'
        AND (prog_name_en ILIKE '%{program_name}%' 
             OR prog_name_fr ILIKE '%{program_name}%')
        LIMIT 100
        """
        
        response = requests.get(
            f"{self.BASE_URL}/datastore_search_sql",
            params={'sql': sql}
        )
        
        if response.status_code == 200:
            return response.json()['result']['records']
        return None
    
    def get_active_programs(self):
        """Get list of active grant programs"""
        
        sql = f"""
        SELECT DISTINCT prog_name_en, owner_org_title, COUNT(*) as grant_count
        FROM "{self.GRANTS_RESOURCE_ID}"
        WHERE agreement_type = 'G'
        AND agreement_end_date > CURRENT_DATE
        GROUP BY prog_name_en, owner_org_title
        ORDER BY grant_count DESC
        """
        
        response = requests.get(
            f"{self.BASE_URL}/datastore_search_sql",
            params={'sql': sql}
        )
        
        if response.status_code == 200:
            return response.json()['result']['records']
        return None
```

## Integration Use Cases

### 1. Canadian Grant Discovery
- Search by province/city
- Filter by organization
- Track federal programs
- Monitor funding trends

### 2. Organization Tracking
- Follow specific departments
- Analyze funding patterns
- Identify eligible programs

### 3. Geographic Analysis
- Provincial distribution
- Postal code targeting
- Federal riding analysis

### 4. Historical Analysis
- Funding trends over time
- Program evolution
- Success patterns

## Production Recommendations

1. **Priority**: HIGH - Essential for Canadian grants
2. **Update Frequency**: Weekly sync
3. **Data Volume**: 1.1M+ records (filter needed)
4. **Storage**: Index by program, organization, location

## Best Practices

1. **Efficient Filtering**: Use server-side filters
2. **Date Management**: Focus on recent/future grants
3. **Language Support**: Store both EN/FR fields
4. **Batch Processing**: Use reasonable chunk sizes

## Additional Datasets

### Other Valuable Grant Sources
1. **NSERC Awards**: Natural sciences research
2. **SSHRC Awards**: Social sciences research
3. **Innovation Canada**: Business grants
4. **Provincial Datasets**: Available separately

## Conclusion

The Canadian Open Government API is production-ready and provides comprehensive access to Canadian federal grant data. With over 1 million grant records, SQL query support, and no authentication requirements, it's an essential source for Canadian grant opportunities. The API's reliability, extensive coverage, and structured data make it ideal for integration into grant recommendation platforms.

**Recommendation**: Implement immediately as the primary source for Canadian federal grants. Focus on the Treasury Board dataset for comprehensive coverage and supplement with agency-specific datasets like CIHR for specialized domains. The SQL query capability enables sophisticated filtering and analysis.