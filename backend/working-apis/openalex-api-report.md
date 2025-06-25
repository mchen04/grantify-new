# OpenAlex API Testing Report

**API Name**: OpenAlex API  
**Base URL**: `https://api.openalex.org`  
**Test Date**: 2025-06-22  
**Status**: ✅ SUCCESS - Production Ready (Limited Use)

## Executive Summary

OpenAlex is a free and open catalog of scholarly works, authors, institutions, and more. While primarily an academic research database, it includes valuable grant funding information extracted from published papers' acknowledgments. With coverage of works funded by major agencies like NSF, NIH, EU Horizon, and international funders, it provides supplementary grant intelligence through publication tracking. No authentication is required.

## API Capabilities

### 1. Endpoints
- **Works**: `/works` - Academic publications with funding info
- **Funders**: `/funders` - Funding organizations
- **Authors**: `/authors` - Researchers
- **Institutions**: `/institutions` - Universities and research orgs
- **Concepts**: `/concepts` - Research topics
- **Authentication**: None required
- **Rate Limit**: 100,000 requests per day (very generous)

### 2. Query Parameters
- `filter`: Complex filtering syntax
- `search`: Full-text search
- `per_page`: Results per page (max 200)
- `page`: Page number
- `select`: Choose specific fields
- `sort`: Sort results

### 3. Grant Data Available
- Funder name and ID
- Award/grant ID
- Associated publications
- Research outcomes
- Collaboration networks

## Testing Results

### Test 1: Basic API Access
```bash
curl -X GET "https://api.openalex.org/works?filter=has_fulltext:true&per_page=3"
```
**Result**: ✅ Success - API accessible without authentication

### Test 2: List Major Funders
```bash
curl -X GET "https://api.openalex.org/funders?per_page=5"
```
**Result**: ✅ Success - Found major funders like NSF (394,591 works), NIH (386,574 works)

### Test 3: NSF-Funded Works
```bash
curl -X GET "https://api.openalex.org/works?filter=grants.funder:https://openalex.org/F4320306076&per_page=3"
```
**Result**: ✅ Success - Retrieved works with NSF grant information

## Data Structure

### Work Object with Grants
```json
{
  "id": "https://openalex.org/W2799524357",
  "title": "MEGA X: Molecular Evolutionary Genetics Analysis",
  "publication_year": 2018,
  "doi": "10.1093/molbev/msy096",
  "grants": [
    {
      "funder": "https://openalex.org/F4320306076",
      "funder_display_name": "National Science Foundation",
      "award_id": "ABI 1661218"
    },
    {
      "funder": "https://openalex.org/F4320332161",
      "funder_display_name": "National Institutes of Health",
      "award_id": "R01GM126567-01"
    }
  ],
  "authorships": [...],
  "institutions": [...],
  "concepts": [...]
}
```

### Funder Object
```json
{
  "id": "https://openalex.org/F4320306076",
  "display_name": "National Science Foundation",
  "country_code": "US",
  "type": "government",
  "homepage_url": "https://nsf.gov",
  "works_count": 394591,
  "cited_by_count": 28476543
}
```

## Major Funders Covered

1. **National Natural Science Foundation of China** - 2.1M works
2. **National Science Foundation (US)** - 394K works
3. **National Institutes of Health (US)** - 386K works
4. **European Commission** - 180K+ works
5. **Deutsche Forschungsgemeinschaft** - 242K works
6. **UK Research and Innovation** - 150K+ works
7. **Japan Society for Promotion of Science** - 140K+ works

## Production Integration Guide

### Implementation Strategy

1. **Use Cases**:
   - Track grant outcomes and success stories
   - Identify active researchers by funding
   - Find collaboration patterns
   - Monitor funding trends by topic
   - **NOT for finding open grant opportunities**

2. **Query Patterns**:
   ```python
   # Find recent NSF-funded AI research
   params = {
       'filter': 'grants.funder:https://openalex.org/F4320306076,'
                'concepts.id:https://openalex.org/C154945302,'
                'publication_year:>2022',
       'per_page': 100
   }
   
   # Search by grant ID
   params = {
       'filter': 'grants.award_id:"DMS-0234188"',
       'per_page': 10
   }
   ```

3. **Pagination**:
   - Max 200 results per page
   - Use cursor-based pagination for large sets
   - Total count provided in meta

### Data Schema for Grant Intelligence

```json
{
  "work_id": "https://openalex.org/W2799524357",
  "title": "Research paper title",
  "publication_year": 2018,
  "grants": [
    {
      "funder_id": "https://openalex.org/F4320306076",
      "funder_name": "National Science Foundation",
      "award_id": "ABI 1661218",
      "program": "Extracted from text if available"
    }
  ],
  "authors": [
    {
      "name": "John Smith",
      "institution": "MIT",
      "orcid": "0000-0002-1825-0097"
    }
  ],
  "topics": ["machine learning", "bioinformatics"],
  "citations": 245,
  "open_access": true
}
```

## Unique Features

1. **Grant Extraction**: Funding info parsed from papers
2. **Network Analysis**: Author/institution connections
3. **Topic Mapping**: Research area classification
4. **Citation Tracking**: Impact measurement
5. **Open Access**: Free data, no auth required
6. **Bulk Download**: Snapshot available

## Limitations for Grant Discovery

1. **Historical Focus**: Only completed/published research
   - **Not suitable for finding open opportunities**

2. **Incomplete Coverage**: Not all grants result in publications
   - **Many grants may be missing**

3. **Delayed Information**: Publications lag grant awards by years
   - **Data is 1-5 years behind**

4. **Extracted Data**: Grant info parsed from acknowledgments
   - **May have errors or omissions**

## Sample Production Code

```python
import requests
from urllib.parse import urlencode

class OpenAlexAPI:
    BASE_URL = "https://api.openalex.org"
    
    def search_funded_works(self, funder_id, year_min=2020):
        """Search for works funded by specific organization"""
        
        filter_str = f"grants.funder:{funder_id},publication_year:>{year_min}"
        
        params = {
            'filter': filter_str,
            'per_page': 100,
            'select': 'id,title,publication_year,doi,grants,authorships'
        }
        
        response = requests.get(f"{self.BASE_URL}/works", params=params)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_funder_stats(self, funder_id):
        """Get statistics about a funding organization"""
        
        response = requests.get(f"{self.BASE_URL}/funders/{funder_id}")
        
        if response.status_code == 200:
            funder = response.json()
            
            # Get recent works
            recent_works = self.search_funded_works(funder_id, year_min=2022)
            
            return {
                'name': funder['display_name'],
                'total_works': funder['works_count'],
                'recent_works': recent_works['meta']['count'] if recent_works else 0,
                'homepage': funder.get('homepage_url')
            }
        return None
    
    def find_grant_by_id(self, award_id):
        """Find publications from a specific grant"""
        
        # Clean award ID (remove special characters for search)
        clean_id = award_id.replace('-', ' ').replace('/', ' ')
        
        params = {
            'search': clean_id,
            'filter': 'has_grant:true',
            'per_page': 50
        }
        
        response = requests.get(f"{self.BASE_URL}/works", params=params)
        
        if response.status_code == 200:
            data = response.json()
            # Filter results to exact matches
            matches = []
            for work in data['results']:
                for grant in work.get('grants', []):
                    if award_id in grant.get('award_id', ''):
                        matches.append(work)
                        break
            return matches
        return None
    
    def get_researcher_funding(self, author_id):
        """Get funding history for a researcher"""
        
        params = {
            'filter': f'authorships.author.id:{author_id},has_grant:true',
            'per_page': 100,
            'select': 'id,title,publication_year,grants'
        }
        
        response = requests.get(f"{self.BASE_URL}/works", params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            # Extract unique funders
            funders = {}
            for work in data['results']:
                for grant in work.get('grants', []):
                    funder_id = grant['funder']
                    if funder_id not in funders:
                        funders[funder_id] = {
                            'name': grant['funder_display_name'],
                            'grants': []
                        }
                    funders[funder_id]['grants'].append({
                        'award_id': grant.get('award_id'),
                        'year': work['publication_year']
                    })
            
            return funders
        return None
```

## Integration Use Cases

### 1. Grant Success Tracking
- Monitor publication outputs from grants
- Measure research impact
- Track collaboration networks

### 2. Researcher Intelligence
- Find prolific grant recipients
- Identify funding patterns
- Discover research teams

### 3. Topic Analysis
- Track funding trends by field
- Identify emerging research areas
- Map funder priorities

### 4. Competitive Intelligence
- Monitor competitor funding
- Track institutional success
- Analyze funding strategies

## Production Recommendations

1. **Priority**: LOW - Supplementary intelligence only
2. **Update Frequency**: Monthly (data changes slowly)
3. **Use Case**: Research intelligence, not grant discovery
4. **Data Volume**: Millions of works (filter heavily)

## Best Practices

1. **Filter Aggressively**: Use multiple filters
2. **Cache Funder IDs**: Store common funder identifiers
3. **Batch Requests**: Use field selection
4. **Monitor Rate Limits**: Stay under daily quota

## Conclusion

OpenAlex is production-ready as a supplementary data source for grant intelligence and research tracking. While it cannot help find open grant opportunities, it provides valuable insights into funding patterns, successful researchers, and grant outcomes. The API's generous rate limits, comprehensive coverage, and free access make it useful for understanding the grant funding landscape.

**Recommendation**: Implement as a SECONDARY source for grant intelligence only. Use to track funding trends, identify successful researchers, and analyze grant outcomes. Do NOT use as a primary source for finding open grant opportunities. Best suited for strategic analysis and competitive intelligence rather than grant discovery.