# New York State Grants Data API Testing Report

**API Name**: New York State Open Data APIs (data.ny.gov)  
**Base URL**: `https://data.ny.gov/api/`  
**Test Date**: 2025-06-22  
**Status**: SUCCESS - Limited Grant Data Available

## Executive Summary

While New York State's Grants Management portal (grantsmanagement.ny.gov) does not offer a public API, the state's Open Data platform (data.ny.gov) provides access to several grant-related datasets through the Socrata API. These datasets include Local Development Corporation grants, Local Government Efficiency Program grants, and specialized program grants. The data is primarily historical and focused on awarded grants rather than open opportunities, but it provides valuable insight into NY State grant programs.

## API Capabilities

### 1. Platform Details
- **Platform**: Socrata Open Data Platform
- **Base URL**: `https://data.ny.gov/api/`
- **Authentication**: None required for public datasets
- **Response Formats**: JSON, CSV, XML
- **Documentation**: Standard Socrata API

### 2. Available Grant Datasets

#### Local Development Corporations Grants
- **Endpoint**: `/views/j5ab-5nj2/rows.json`
- **Description**: Grants awarded by Local Development Corporations
- **Fields**: Authority name, fiscal year, recipient, amount, purpose

#### Local Government Efficiency Program Grants
- **Endpoint**: `/views/fc8g-rgwz/rows.json`
- **Description**: Grants from 2005 onwards for local government efficiency
- **Update Frequency**: Annual

#### Hudson River Estuary Grants
- **Endpoint**: `/views/a828-8j32/rows.json`
- **Description**: Environmental grants from 1999 onwards
- **Focus**: Environmental protection and restoration

### 3. Query Parameters (Socrata)
- `$limit`: Number of results
- `$offset`: Pagination offset
- `$where`: SQL-like filtering
- `$select`: Choose specific fields
- `$order`: Sort results
- `$q`: Full-text search

## Testing Results

### Test 1: Local Development Corporation Grants
```bash
curl -X GET "https://data.ny.gov/api/views/j5ab-5nj2/rows.json?accessType=DOWNLOAD&$limit=5"
```
**Result**: Success - Returns grant data with recipient information

### Test 2: Dataset Metadata
```bash
curl -X GET "https://data.ny.gov/api/views/j5ab-5nj2.json"
```
**Result**: Success - Provides full dataset schema and metadata

### Test 3: Filtered Query
```bash
curl -X GET "https://data.ny.gov/api/views/j5ab-5nj2/rows.json?$where=fiscal_year_end_date>'2023-01-01'"
```
**Result**: Success - Filtering works with Socrata query language

## Data Structure

### Grant Record Fields (Local Development Corps)
- Authority Name
- Fiscal Year End Date
- Awarded Grants (Yes/No)
- Grant Fund Sources
- Recipient Name
- Recipient City
- Recipient State
- Recipient Zip
- Grant Amount
- Grant Purpose/Description

## Production Integration Guide

### Implementation Strategy

1. **Data Collection Focus**:
   - Historical grant awards for trend analysis
   - Understanding state funding priorities
   - Identifying successful recipients
   - NOT for finding open opportunities

2. **Query Examples**:
   ```python
   # Recent grants
   params = {
       '$where': "fiscal_year_end_date > '2023-01-01'",
       '$limit': 1000,
       '$order': 'fiscal_year_end_date DESC'
   }
   
   # Grants by recipient city
   params = {
       '$where': "recipient_city = 'Albany'",
       '$select': 'recipient_name, grant_amount, grant_purpose'
   }
   ```

3. **Available Datasets to Monitor**:
   - Local Development Corporation Grants
   - Local Government Efficiency Grants
   - Environmental Protection Grants
   - Economic Development Grants

### Data Schema for Grant Intelligence

```json
{
  "source": "nys_open_data",
  "authority": "Local Development Corporation",
  "fiscal_year": "2024",
  "recipient": {
    "name": "Organization Name",
    "city": "Albany",
    "state": "NY",
    "zip": "12207"
  },
  "grant_amount": 50000,
  "grant_purpose": "Economic development project",
  "fund_source": "State funds",
  "award_date": "2024-03-15"
}
```

## Unique Features

1. **Socrata Platform**: Industry-standard open data platform
2. **Multiple Formats**: JSON, CSV, XML, RDF
3. **SQL-like Queries**: Powerful filtering with SoQL
4. **No Authentication**: Public access to all datasets
5. **Visualization Tools**: Built-in charts and maps

## Limitations & Considerations

1. **Historical Focus**: Primarily awarded grants, not opportunities
   - **Use Case**: Trend analysis, not opportunity discovery

2. **Limited Coverage**: Not all NY State grants included
   - **Solution**: Combine with other sources

3. **Update Frequency**: Varies by dataset (often annual)
   - **Impact**: Data may be months old

4. **No Central Grant API**: Must query multiple datasets
   - **Solution**: Aggregate multiple endpoints

## Sample Production Code

```python
import requests
from datetime import datetime, timedelta

class NYStateGrantsAPI:
    BASE_URL = "https://data.ny.gov/api/views"
    
    # Dataset IDs
    LOCAL_DEV_GRANTS = "j5ab-5nj2"
    EFFICIENCY_GRANTS = "fc8g-rgwz"
    ESTUARY_GRANTS = "a828-8j32"
    
    def get_recent_grants(self, dataset_id, days_back=365):
        """Get grants from the past year"""
        
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        
        params = {
            '$where': f"fiscal_year_end_date > '{cutoff_date}'",
            '$limit': 1000,
            '$order': 'fiscal_year_end_date DESC'
        }
        
        url = f"{self.BASE_URL}/{dataset_id}/rows.json"
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return self._parse_grants(data, dataset_id)
        return None
    
    def _parse_grants(self, data, dataset_id):
        """Parse grant data based on dataset structure"""
        
        grants = []
        
        for row in data.get('data', []):
            if dataset_id == self.LOCAL_DEV_GRANTS:
                grant = {
                    'authority': row[8],  # Authority Name
                    'fiscal_year': row[9],  # Fiscal Year
                    'has_grants': row[10] == 'Yes',  # Awarded Grants
                    'fund_source': row[11],  # Grant Fund Sources
                    'recipient_name': row[12],  # Recipient Name
                    'recipient_city': row[13],  # Recipient City
                    'amount': self._parse_amount(row[16]) if len(row) > 16 else None
                }
                
                if grant['has_grants']:
                    grants.append(grant)
        
        return grants
    
    def _parse_amount(self, amount_str):
        """Parse amount string to number"""
        if not amount_str:
            return None
        
        # Remove $ and commas
        clean = str(amount_str).replace('$', '').replace(',', '')
        
        try:
            return float(clean)
        except:
            return None
    
    def search_all_grant_datasets(self):
        """Search all known grant datasets"""
        
        datasets = [
            (self.LOCAL_DEV_GRANTS, "Local Development Corporation Grants"),
            (self.EFFICIENCY_GRANTS, "Local Government Efficiency Grants"),
            (self.ESTUARY_GRANTS, "Hudson River Estuary Grants")
        ]
        
        all_grants = []
        
        for dataset_id, name in datasets:
            grants = self.get_recent_grants(dataset_id)
            if grants:
                for grant in grants:
                    grant['program'] = name
                    all_grants.append(grant)
        
        return all_grants
    
    def get_dataset_info(self, dataset_id):
        """Get metadata about a dataset"""
        
        url = f"{self.BASE_URL}/{dataset_id}.json"
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            return {
                'name': data.get('name'),
                'description': data.get('description'),
                'columns': [col['name'] for col in data.get('columns', [])],
                'row_count': data.get('rowCount'),
                'created': data.get('createdAt'),
                'updated': data.get('rowsUpdatedAt')
            }
        return None
```

## Integration Use Cases

### 1. Historical Analysis
- Track state grant awards over time
- Identify funding trends
- Analyze geographic distribution
- Study program effectiveness

### 2. Recipient Intelligence
- Find organizations that receive grants
- Understand funding patterns
- Identify potential partners
- Track success rates

### 3. Program Discovery
- Learn about state grant programs
- Understand eligibility patterns
- Identify focus areas
- Track program changes

### 4. Supplementary Data
- Enhance grant profiles with award history
- Provide context for opportunities
- Show success examples
- Support application strategies

## Production Recommendations

1. **Priority**: LOW - Limited to historical data
2. **Update Frequency**: Monthly (data updates slowly)
3. **Use Case**: Intelligence and analysis only
4. **Data Volume**: Thousands of records per dataset

## Alternative Sources for NY Opportunities

1. **Grants Gateway**: Manual monitoring of grantsmanagement.ny.gov
2. **Regional Councils**: Check regional economic development councils
3. **State Agency Sites**: Individual agency grant pages
4. **Federal Sources**: Many NY grants come through federal programs

## Conclusion

New York State's data.ny.gov platform provides valuable historical grant data through standard Socrata APIs, but it's not suitable for discovering open grant opportunities. The platform excels at providing transparency into past grant awards and can be useful for understanding funding patterns and identifying successful applicants. However, those seeking current NY State grant opportunities must use the Grants Gateway website directly or monitor individual agency announcements.

**Recommendation**: Implement as a SECONDARY source for grant intelligence and historical analysis only. Do not rely on it for finding open opportunities. The lack of current opportunity data limits its value for a grant recommendation platform, but it can provide useful context about NY State grant programs and past awards.