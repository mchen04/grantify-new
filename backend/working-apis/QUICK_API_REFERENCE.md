# Quick API Reference Guide

## 🟢 All Working APIs (13 Total)

### 1. Grants.gov
- **URL**: `https://www.grants.gov/search/v2/`
- **Auth**: None
- **Format**: XML
- **Rate Limit**: None specified
- **Key Data**: Federal grants, deadlines, eligibility

### 2. EU Funding & Tenders Portal
- **URL**: `https://api.tech.ec.europa.eu/search-api/prod/rest/search`
- **Auth**: API Key: `SEDIA`
- **Format**: JSON
- **Rate Limit**: Reasonable use
- **Key Data**: EU grants, Horizon Europe, multi-country

### 3. NIH RePORTER
- **URL**: `https://api.reporter.nih.gov/v2/projects/search`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: Biomedical research, project details

### 4. NSF Awards
- **URL**: `https://www.research.gov/awardapi-service/v1/awards.json`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: STEM research awards

### 5. Canadian Open Government
- **URL**: `https://open.canada.ca/data/api/3/action/datastore_search_sql`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: Canadian federal grants via SQL

### 6. UKRI Gateway to Research
- **URL**: `https://gtr.ukri.org/api/projects`
- **Auth**: None
- **Format**: JSON/XML
- **Rate Limit**: Be reasonable
- **Key Data**: UK research council funding

### 7. World Bank Projects
- **URL**: `https://search.worldbank.org/api/v2/projects`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: International development projects

### 8. Federal Register
- **URL**: `https://www.federalregister.gov/api/v1/documents.json`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: Grant announcements, policy changes

### 9. USAspending.gov
- **URL**: `https://api.usaspending.gov/api/v2/search/spending_by_award/`
- **Auth**: None
- **Format**: JSON
- **Rate Limit**: None specified
- **Key Data**: Historical award data

### 10. California Grants Portal
- **URL**: `https://data.ca.gov/api/3/action/datastore_search`
- **Auth**: None
- **Format**: JSON (CKAN)
- **Rate Limit**: None specified
- **Key Data**: California state grants

### 11. OpenAlex
- **URL**: `https://api.openalex.org/works`
- **Auth**: None (polite email recommended)
- **Format**: JSON
- **Rate Limit**: 100k/day with email
- **Key Data**: Research papers with grant info

### 12. New York State Data
- **URL**: `https://data.ny.gov/resource/[dataset-id].json`
- **Auth**: None
- **Format**: JSON (Socrata)
- **Rate Limit**: None specified
- **Key Data**: Historical state grant data

### 13. SAM.gov Entity Management
- **URL**: `https://api.sam.gov/entity-information/v2/entities`
- **Auth**: API Key required
- **Format**: JSON
- **Rate Limit**: Based on user type
- **Key Data**: Organization verification

## Quick Integration Examples

### Basic Search Pattern
```python
# Most APIs follow this pattern
params = {
    'keyword': 'environmental',
    'status': 'active',
    'limit': 100,
    'offset': 0
}
response = requests.get(api_url, params=params)
```

### APIs Requiring Special Headers
```python
# EU Portal
headers = {'X-API-Key': 'SEDIA'}

# SAM.gov
params = {'api_key': 'YOUR_KEY'}

# OpenAlex (recommended)
headers = {'mailto': 'your-email@example.com'}
```

### SQL Query APIs
```python
# Canadian Open Government
sql = "SELECT * FROM grants WHERE amount > 100000"
params = {'sql': sql}

# California (CKAN)
params = {
    'resource_id': 'dataset-id',
    'q': 'search term',
    'limit': 100
}
```

## Update Frequencies

- **Real-time**: Grants.gov (every 4 hours)
- **Daily**: EU Portal, NIH, NSF, Federal Register
- **Weekly**: Canadian, UKRI, World Bank
- **Monthly**: OpenAlex, NY State
- **On-demand**: SAM.gov, USAspending

## Geographic Coverage

- **United States**: Grants.gov, NIH, NSF, Federal Register, USAspending, California, NY State
- **Europe**: EU Funding Portal
- **United Kingdom**: UKRI Gateway
- **Canada**: Canadian Open Government
- **International**: World Bank, OpenAlex
- **Verification**: SAM.gov (US only)