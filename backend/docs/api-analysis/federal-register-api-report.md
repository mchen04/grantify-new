# Federal Register API Testing Report

**API Name**: Federal Register API  
**Base URL**: `https://www.federalregister.gov/api/v1/documents.json`  
**Test Date**: 2025-06-22  
**Status**: SUCCESS - Production Ready

## Executive Summary

The Federal Register API is fully functional and provides access to federal regulatory documents including grant announcements, notices, and rules. With no authentication requirements and comprehensive search capabilities, it serves as an excellent supplementary source for federal grant opportunities, especially for early announcements and policy changes affecting grant programs.

## API Capabilities

### 1. Endpoints
- **Documents Search**: `/api/v1/documents.json` (GET)
- **Single Document**: `/api/v1/documents/{document_number}.json`
- **Public Inspection**: `/api/v1/public-inspection-documents.json`
- **Agencies List**: `/api/v1/agencies.json`

### 2. Authentication
- **None required** - Completely open API
- No rate limits documented
- JSON and CSV formats available

### 3. Document Types
- Notice (most grant announcements)
- Proposed Rule
- Rule
- Presidential Document

## Search Parameters

### Key Filters
- `conditions[term]`: Full-text search
- `conditions[agencies][]`: Filter by agency slug
- `conditions[type][]`: Document type (Notice, Rule, etc.)
- `conditions[publication_date][gte/lte]`: Date range
- `conditions[sections][]`: FR sections
- `conditions[topics][]`: Topic tags
- `per_page`: Results per page (max 1000)
- `page`: Page number

## Testing Results

### Test 1: Basic Grant Search
```bash
curl -X GET "https://www.federalregister.gov/api/v1/documents.json?conditions%5Bterm%5D=grant&per_page=5"
```
**Result**: Success - Found 239,735 documents mentioning "grant"

### Test 2: Filtered by Agency and Date
```bash
curl -X GET "https://www.federalregister.gov/api/v1/documents.json?\
conditions%5Bterm%5D=grant%20opportunity&\
conditions%5Bagencies%5D%5B%5D=education-department&\
conditions%5Bpublication_date%5D%5Bgte%5D=2025-01-01"
```
**Result**: Success - Returns recent Education Department grant opportunities

### Test 3: Notice Type Documents
```bash
curl -X GET "https://www.federalregister.gov/api/v1/documents.json?\
conditions%5Bterm%5D=funding%20opportunity&\
conditions%5Btype%5D%5B%5D=Notice"
```
**Result**: Success - Filters to Notice documents only

## Data Structure

### Document Fields
```json
{
  "title": "Low Income Taxpayer Clinic Grant Program",
  "type": "Notice",
  "abstract": "Grant opportunity description...",
  "document_number": "2025-07978",
  "html_url": "https://www.federalregister.gov/documents/...",
  "pdf_url": "https://www.govinfo.gov/content/pkg/...",
  "publication_date": "2025-05-08",
  "agencies": [
    {
      "name": "Internal Revenue Service",
      "id": 254,
      "slug": "internal-revenue-service"
    }
  ],
  "excerpts": "Highlighted search matches..."
}
```

## Production Integration Guide

### Implementation Strategy

1. **Data Collection Focus**:
   - Filter for "Notice" type documents
   - Search terms: "grant", "funding opportunity", "cooperative agreement"
   - Monitor specific agencies known for grants

2. **Query Pattern**:
   ```python
   params = {
       'conditions[term]': 'grant opportunity',
       'conditions[type][]': 'Notice',
       'conditions[publication_date][gte]': last_sync_date,
       'per_page': 100,
       'page': 1
   }
   ```

3. **Pagination**:
   - Max 1000 results per page
   - Can only paginate through first 2000 results
   - Use date ranges for comprehensive coverage

### Data Schema for Recommendation Engine

```json
{
  "source": "federal_register",
  "document_id": "2025-07978",
  "title": "Grant Program Title",
  "type": "grant_announcement",
  "agency": "Internal Revenue Service",
  "publication_date": "2025-05-08",
  "abstract": "Program description...",
  "url": "https://www.federalregister.gov/...",
  "pdf_url": "https://www.govinfo.gov/...",
  "grant_details": {
    "extracted_deadline": "July 14, 2025",
    "extracted_amount": "Parse from abstract",
    "extracted_eligibility": "Parse from abstract"
  }
}
```

## Unique Features

1. **Highlighted Excerpts**: Search term highlighting in results
2. **Multiple Formats**: HTML, PDF, and API access
3. **Agency Hierarchy**: Parent-child agency relationships
4. **Public Inspection**: Pre-publication document access
5. **Topics/Sections**: Categorized content

## Limitations & Workarounds

1. **Mixed Content**: Not all documents are grant-related
   - **Solution**: Filter by keywords and document type

2. **Unstructured Data**: Grant details in abstract text
   - **Solution**: NLP extraction for amounts, deadlines

3. **2000 Result Limit**: Pagination restricted
   - **Solution**: Use date ranges to segment searches

## Sample Production Code

```python
import requests
from datetime import datetime, timedelta
import re

class FederalRegisterAPI:
    BASE_URL = "https://www.federalregister.gov/api/v1"
    
    def search_grant_notices(self, days_back=7, page=1):
        """Search for recent grant-related notices"""
        
        start_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        
        params = {
            'conditions[term]': 'grant OR "funding opportunity" OR "cooperative agreement"',
            'conditions[type][]': 'Notice',
            'conditions[publication_date][gte]': start_date,
            'per_page': 100,
            'page': page,
            'order': 'newest'
        }
        
        response = requests.get(f"{self.BASE_URL}/documents.json", params=params)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def get_agency_grants(self, agency_slug, term="grant"):
        """Get grants from specific agency"""
        
        params = {
            'conditions[term]': term,
            'conditions[agencies][]': agency_slug,
            'conditions[type][]': 'Notice',
            'per_page': 100
        }
        
        response = requests.get(f"{self.BASE_URL}/documents.json", params=params)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def extract_grant_details(self, document):
        """Extract grant details from abstract using regex"""
        
        abstract = document.get('abstract', '')
        
        # Extract deadline
        deadline_pattern = r'(deadline|due|submit by|closes?)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})'
        deadline_match = re.search(deadline_pattern, abstract, re.IGNORECASE)
        
        # Extract amount
        amount_pattern = r'\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion))?'
        amount_matches = re.findall(amount_pattern, abstract)
        
        return {
            'deadline': deadline_match.group(2) if deadline_match else None,
            'amounts': amount_matches,
            'has_grant_info': bool(deadline_match or amount_matches)
        }
    
    def get_all_grant_notices(self, days_back=30):
        """Get all grant notices with pagination"""
        
        all_documents = []
        page = 1
        
        while True:
            data = self.search_grant_notices(days_back, page)
            if not data or not data.get('results'):
                break
                
            documents = data['results']
            
            # Filter for likely grant announcements
            grant_docs = [
                doc for doc in documents
                if any(keyword in doc['title'].lower() 
                      for keyword in ['grant', 'funding', 'award', 'cooperative'])
            ]
            
            all_documents.extend(grant_docs)
            
            # Check pagination limit
            if page >= 20 or len(all_documents) >= 2000:
                break
                
            page += 1
            
        return all_documents
```

## Integration Use Cases

### 1. Early Grant Announcements
- Catch grant opportunities before they appear on Grants.gov
- Monitor policy changes affecting grant programs
- Track agency funding priorities

### 2. Supplementary Information
- Grant program background and context
- Policy changes affecting eligibility
- Amendment notices for existing programs

### 3. Agency Monitoring
- Track specific agencies' grant activities
- Build agency grant calendars
- Identify new grant programs

## Production Recommendations

1. **Priority**: MEDIUM - Valuable supplementary source
2. **Update Frequency**: Daily scan for new notices
3. **Data Volume**: ~500-1000 grant-related notices monthly
4. **Storage**: Store full documents for reference

## Best Practices

1. **Keyword Optimization**: Use multiple search terms
2. **Agency Focus**: Monitor major grant-making agencies
3. **Date Ranges**: Use weekly chunks to avoid limits
4. **Content Parsing**: Implement NLP for detail extraction

## Conclusion

The Federal Register API is production-ready and provides valuable early access to federal grant announcements and policy changes. While it requires parsing unstructured content, it offers unique value as an early warning system for new opportunities. The API's reliability, open access, and comprehensive coverage make it an excellent supplementary data source.

**Recommendation**: Implement as a secondary source for early grant intelligence. Use in combination with Grants.gov for comprehensive federal grant coverage. Focus on Notice-type documents and implement smart parsing to extract grant details from abstracts.