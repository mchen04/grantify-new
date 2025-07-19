# API Integration Guide - How All APIs Work Together

## Overview

This guide shows how all 13 working APIs integrate to create a comprehensive grant discovery platform. Each API serves a specific purpose and they work together to provide complete coverage of grant opportunities worldwide.

## API Roles & Responsibilities

### 1. Primary Grant Discovery APIs

#### Grants.gov (US Federal)
- **Role**: Primary source for ALL US federal grant opportunities
- **Update Frequency**: Every 4 hours
- **Key Features**: Real-time opportunities, eligibility checking
```python
def fetch_grants_gov():
    """Fetches all active federal grants"""
    url = "https://www.grants.gov/search/v2/"
    # Returns: title, deadline, amount, eligibility, agency
```

#### EU Funding & Tenders Portal
- **Role**: Primary source for ALL European Union grants
- **API Key Required**: `SEDIA` (public key)
- **Update Frequency**: Daily
```python
def fetch_eu_grants():
    """Fetches EU funding opportunities"""
    headers = {"X-API-Key": "SEDIA"}
    # Returns: title, deadline, funding amount in EUR, eligible countries
```

#### Canadian Open Government
- **Role**: Primary source for Canadian federal grants
- **Update Frequency**: Weekly
- **Special Feature**: SQL query support for complex filtering
```python
def fetch_canadian_grants():
    """Fetches Canadian grant data via SQL"""
    sql = "SELECT * FROM grants WHERE year >= 2024"
    # Returns: organization, amount, recipient, program
```

### 2. Specialized Research Grant APIs

#### NIH RePORTER
- **Role**: Biomedical and health research grants
- **Unique Value**: Detailed project abstracts and outcomes
```python
def fetch_nih_grants():
    """Specialized for health/medical research"""
    # Returns: project details, PI info, publications, clinical trials
```

#### NSF Awards
- **Role**: Science, technology, engineering, math grants
- **Unique Value**: Active awards with investigator details
```python
def fetch_nsf_awards():
    """STEM research funding"""
    # Returns: award amount, institution, research area, duration
```

#### UKRI Gateway
- **Role**: UK research council funding
- **Coverage**: All UK research disciplines
```python
def fetch_ukri_projects():
    """UK research grants across all councils"""
    # Returns: project details, funding amounts in GBP, outcomes
```

### 3. Intelligence & Analytics APIs

#### Federal Register
- **Role**: Early warning system for upcoming grants
- **Unique Value**: Notices BEFORE grants are posted
```python
def monitor_federal_register():
    """Catches grant announcements 30-60 days early"""
    # Search for: "notice of funding opportunity", "grant program"
    # Returns: future grant programs, policy changes
```

#### USAspending.gov
- **Role**: Historical grant award data for analytics
- **Unique Value**: See who won past grants and how much
```python
def analyze_past_awards():
    """Understand funding patterns and success rates"""
    # Returns: recipient details, award amounts, success patterns
```

#### OpenAlex
- **Role**: Extract grant information from research publications
- **Unique Value**: Discover grants mentioned in papers
```python
def extract_grant_intelligence():
    """Find grants from publication acknowledgments"""
    # Returns: funder names, grant numbers, research outcomes
```

### 4. Regional/Specialized APIs

#### World Bank Projects
- **Role**: International development grants
- **Coverage**: Developing countries worldwide
```python
def fetch_world_bank():
    """Development funding for international projects"""
    # Returns: project details, country, sector, funding
```

#### California Grants Portal
- **Role**: Model for state-level integration
- **Special Feature**: CKAN-based, replicable for other states
```python
def fetch_california_grants():
    """State-level grant opportunities"""
    # Returns: state agency grants, local opportunities
```

#### New York State Data
- **Role**: Historical grant analysis at state level
- **Limitation**: Historical data only, not current opportunities
```python
def analyze_ny_grants():
    """Historical patterns for state funding"""
    # Returns: past awards, recipient types, funding trends
```

### 5. Verification & Compliance API

#### SAM.gov Entity Management
- **Role**: Verify organization eligibility for US federal grants
- **Critical Feature**: Required for federal grant applications
```python
def verify_organization(org_name):
    """Check if org can receive federal grants"""
    # Returns: registration status, expiration, eligible purposes
    # Must have purpose codes: Z1, Z2, Z4, or Z5 for grants
```

## Integration Workflows

### Workflow 1: Comprehensive Grant Search

```python
async def search_all_grants(search_criteria):
    """
    User searches for "environmental research grants for nonprofits"
    """
    
    # Step 1: Parse search intent
    keywords = ["environmental", "research"]
    org_type = "nonprofit"
    
    # Step 2: Check organization eligibility (if US-based)
    if search_criteria.country == "US":
        org_eligible = await verify_with_sam_gov(search_criteria.org_name)
        if not org_eligible:
            return {"error": "Please register at SAM.gov first"}
    
    # Step 3: Query all relevant APIs in parallel
    results = await asyncio.gather(
        search_grants_gov(keywords, org_type),
        search_eu_portal(keywords) if search_criteria.include_eu else None,
        search_nih(keywords) if "health" in keywords else None,
        search_nsf(keywords) if "research" in keywords else None,
        search_canadian(keywords) if search_criteria.include_canada else None,
        search_ukri(keywords) if search_criteria.include_uk else None,
        search_world_bank(keywords) if search_criteria.include_international else None
    )
    
    # Step 4: Normalize and combine results
    all_grants = normalize_results(results)
    
    # Step 5: Filter by eligibility
    eligible_grants = filter_by_eligibility(all_grants, org_type)
    
    # Step 6: Enhance with intelligence
    enhanced_grants = await enhance_with_intelligence(eligible_grants)
    
    # Step 7: Rank by relevance and return
    return rank_results(enhanced_grants, search_criteria)
```

### Workflow 2: Intelligence Enhancement

```python
async def enhance_with_intelligence(grants):
    """
    Add historical success rates and insights to each grant
    """
    
    for grant in grants:
        # Get historical awards for this program
        past_awards = await query_usaspending(
            agency=grant.funding_agency,
            program=grant.program_name
        )
        
        grant.average_award = calculate_average(past_awards)
        grant.success_rate = calculate_success_rate(past_awards)
        grant.typical_recipients = get_recipient_types(past_awards)
        
        # Check for related research
        if grant.is_research:
            related_papers = await search_openalex(grant.keywords)
            grant.research_trends = extract_trends(related_papers)
            grant.successful_pis = extract_investigators(related_papers)
        
        # Add upcoming changes from Federal Register
        if grant.country == "US":
            future_changes = await check_federal_register(grant.program_name)
            grant.program_updates = future_changes
    
    return grants
```

### Workflow 3: Monitoring & Alerts

```python
async def daily_grant_monitoring():
    """
    Runs daily to find new opportunities and changes
    """
    
    # Check Federal Register for future opportunities
    future_grants = await scan_federal_register([
        "notice of funding opportunity",
        "funding announcement",
        "grant program"
    ])
    
    # Get latest grants from primary sources
    new_grants = await asyncio.gather(
        get_new_grants_gov(),
        get_new_eu_grants(),
        get_new_nih_grants(),
        get_new_canadian_grants()
    )
    
    # Check for deadline changes
    deadline_updates = await check_deadline_changes(existing_grants)
    
    # Send alerts to users
    await send_user_alerts(
        new_opportunities=new_grants,
        upcoming_opportunities=future_grants,
        deadline_changes=deadline_updates
    )
```

### Workflow 4: Geographic Routing

```python
def route_by_geography(user_location):
    """
    Automatically query relevant APIs based on user location
    """
    
    api_routing = {
        "US": [grants_gov, nsf, nih, federal_register, usaspending, california],
        "CA": [canadian_open_gov, grants_gov],  # Canadians can apply to some US grants
        "GB": [ukri_gateway, eu_portal],  # UK still has some EU access
        "EU": [eu_portal, world_bank],
        "OTHER": [world_bank, eu_portal]  # International opportunities
    }
    
    # Get primary APIs for user's country
    primary_apis = api_routing.get(user_location.country, api_routing["OTHER"])
    
    # Add specialized APIs based on organization type
    if user_location.org_type == "university":
        primary_apis.extend([nsf, nih, ukri_gateway])
    
    if user_location.org_type == "nonprofit":
        primary_apis.extend([world_bank])
    
    return primary_apis
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Search Query                        │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Query Processor                             │
│  • Parse intent  • Identify geography  • Check eligibility      │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Parallel API Queries                          │
├─────────────────────────────────────────────────────────────────┤
│  Grants.gov │ EU Portal │ NIH │ NSF │ Canadian │ UKRI │ World  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Normalization                           │
│  • Convert to unified schema  • Currency conversion             │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Intelligence Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  SAM.gov Verify │ USAspending Analytics │ Federal Register     │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ranking & Filtering                           │
│  • Eligibility  • Deadline  • Amount  • Relevance Score        │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Results to User                              │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling & Fallbacks

```python
class APIManager:
    def __init__(self):
        self.api_status = {
            'grants_gov': {'status': 'up', 'last_check': None},
            'eu_portal': {'status': 'up', 'last_check': None},
            # ... other APIs
        }
    
    async def fetch_with_fallback(self, api_name, fetch_function):
        try:
            result = await fetch_function()
            self.api_status[api_name]['status'] = 'up'
            return result
            
        except Exception as e:
            self.api_status[api_name]['status'] = 'down'
            
            # Use cached data if available
            cached = await get_cached_data(api_name)
            if cached and cache_age(cached) < timedelta(hours=24):
                return cached
                
            # Try alternative sources
            if api_name == 'grants_gov':
                # Federal Register might have some grant info
                return await fetch_federal_register_grants()
                
            elif api_name == 'eu_portal':
                # Individual country sources as fallback
                return await fetch_eu_country_grants()
                
            # Log failure for monitoring
            await log_api_failure(api_name, str(e))
            
            return []
```

## Performance Optimization

```python
class CachedAPIClient:
    def __init__(self):
        self.cache = {}
        self.cache_duration = {
            'grants_gov': timedelta(hours=4),
            'federal_register': timedelta(hours=1),
            'usaspending': timedelta(days=1),
            'openalex': timedelta(days=7),
            # ... other APIs
        }
    
    async def get_grants(self, api_name, fetch_func):
        # Check cache first
        if api_name in self.cache:
            cached_data, timestamp = self.cache[api_name]
            if datetime.now() - timestamp < self.cache_duration[api_name]:
                return cached_data
        
        # Fetch fresh data
        fresh_data = await fetch_func()
        self.cache[api_name] = (fresh_data, datetime.now())
        
        return fresh_data
```

## Conclusion

The 13 APIs work together to provide:

1. **Complete Coverage**: Every major grant source worldwide
2. **Intelligence**: Not just current grants but trends and insights
3. **Verification**: Ensure eligibility before showing opportunities
4. **Early Warning**: Know about grants before they're posted
5. **Analytics**: Learn from past success patterns

By orchestrating these APIs intelligently, the platform can answer complex questions like:
- "What environmental grants is my nonprofit eligible for?"
- "Which agencies fund projects like mine?"
- "What's the typical award size for my type of organization?"
- "Are there upcoming opportunities I should prepare for?"

This integrated approach transforms raw API data into actionable grant intelligence.