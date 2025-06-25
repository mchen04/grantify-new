# SAM.gov API Comprehensive Report for Grant Recommending Platform

**Date**: 2025-06-22  
**API Key Status**: ✅ Active and Working  
**Base URL**: `https://api.sam.gov`

## Executive Summary

After comprehensive testing with your SAM.gov API key, I've identified several valuable capabilities for your grant platform, though SAM.gov is primarily designed for federal contracting rather than grants. The API provides crucial entity verification, compliance checking, and some grant-adjacent opportunities that can enhance your platform's value proposition.

## Working API Endpoints

### 1. Entity Information API ✅
**Endpoint**: `https://api.sam.gov/entity-information/v2/entities`

**Capabilities**:
- Search for registered entities by name, UEI, CAGE code, or DUNS
- Verify organization eligibility for federal funding
- Check registration status and expiration dates
- Access organization details including addresses and business types

**Sample Response Fields**:
```json
{
  "entityRegistration": {
    "samRegistered": "Yes",
    "ueiSAM": "TRXBCZ38CQY1",
    "legalBusinessName": "ORGANIZATION NAME",
    "registrationStatus": "Active",
    "registrationExpirationDate": "2026-01-02",
    "purposeOfRegistrationDesc": "Federal Assistance Awards"
  }
}
```

### 2. Contract Opportunities API ✅
**Endpoint**: `https://api.sam.gov/opportunities/v2/search`

**Important Discovery**: This API is for CONTRACTS, not grants. However, it includes:
- Some cooperative agreements
- Research opportunities that may lead to grants
- Early notices about upcoming grant programs

**Notice Types Available**:
- `p` = Pre-solicitation
- `r` = Sources Sought (good for early intelligence)
- `s` = Special Notice (may include grant announcements)
- `o` = Solicitation
- `k` = Combined Synopsis/Solicitation

### 3. Exclusions API ❌ (Not accessible with current permissions)
Would provide debarment/suspension data if accessible.

## Key Insights for Grant Platform

### 1. Entity Verification Use Case 🎯
**High Value Feature**: Verify if grant applicants are properly registered with the federal government.

```python
def verify_organization_eligibility(org_name):
    """Check if organization can receive federal grants"""
    # Search SAM.gov for organization
    # Check registrationStatus = "Active"
    # Verify purposeOfRegistrationDesc includes "Federal Assistance Awards"
    # Check registration isn't expired
    return eligibility_status
```

### 2. Purpose of Registration Codes
Organizations register for different purposes:
- **Z1** = Federal Assistance Awards (GRANTS!)
- **Z2** = All Awards (Contracts and Grants)
- **Z4** = Federal Assistance Awards & IGT
- **Z5** = All Awards & IGT

**Filter for grant-eligible entities**: Look for Z1, Z2, Z4, or Z5 codes.

### 3. Complementing Grants.gov
While SAM.gov doesn't have grant opportunities, it provides:
- **Organization verification** before applying
- **Compliance status** checking
- **Entity details** for auto-filling applications
- **Historical performance** data

## Recommended Implementation

### Phase 1: Entity Verification Service
```python
class SAMEntityVerifier:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.sam.gov/entity-information/v2/entities"
    
    def verify_grant_eligibility(self, org_name=None, uei=None):
        """
        Returns:
        - eligible: bool
        - registration_status: str
        - expiration_date: date
        - issues: list of problems
        """
        params = {
            "api_key": self.api_key,
            "samRegistered": "Yes",
            "registrationStatus": "Active"
        }
        
        if uei:
            params["ueiSAM"] = uei
        elif org_name:
            params["legalBusinessName"] = org_name
            
        # Check registration
        # Verify purpose includes grants
        # Check expiration
        # Return comprehensive status
```

### Phase 2: Intelligence Gathering
Monitor Special Notices and Sources Sought for:
- Upcoming grant programs
- Changes to grant policies
- New funding initiatives
- Agency priorities

### Phase 3: Data Enrichment
Use entity data to:
- Pre-fill application forms
- Show organization size/type
- Display certifications (8(a), HUBZone, etc.)
- Provide location verification

## API Limits & Performance

### Rate Limits
- **Federal Users**: Higher limits
- **Non-Federal Users**: Standard limits
- **Your Status**: Non-federal (standard limits apply)

### Best Practices
1. Cache entity data (24-hour TTL recommended)
2. Batch verification requests
3. Store UEI numbers for faster lookups
4. Monitor rate limit headers

## Integration Architecture

```
┌─────────────────────────┐
│   Grant Platform UI     │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   Verification Layer    │
├─────────────────────────┤
│ • Check SAM.gov Entity  │
│ • Verify Active Status  │
│ • Confirm Grant Purpose │
│ • Check Expiration      │
└────────────┬────────────┘
             │
┌────────────▼────────────┐     ┌─────────────────┐
│    SAM.gov API         │     │  Grants.gov API │
│ • Entity Data          │     │ • Opportunities │
│ • Registration Status  │     │ • Applications  │
│ • Compliance           │     │ • Deadlines     │
└────────────────────────┘     └─────────────────┘
```

## Value Proposition for Your Platform

### 1. **Trust & Verification** ✅
"We verify every organization's federal eligibility before showing grants"

### 2. **Reduced Application Friction** ⚡
"Pre-populated organization data from official government sources"

### 3. **Compliance Assurance** 🛡️
"Automated checks ensure you're eligible before you apply"

### 4. **Intelligent Matching** 🎯
"Match grants to your organization type and certifications"

## Implementation Priorities

### Must Have
1. Entity search and verification
2. Registration status checking
3. Grant eligibility confirmation

### Nice to Have
1. Opportunity monitoring for grant-adjacent notices
2. Organization data pre-population
3. Expiration alerts

### Future Enhancements
1. Exclusions checking (if access granted)
2. Historical award analysis
3. Subcontractor relationships

## Code Examples

### Basic Entity Search
```python
import requests
from datetime import datetime

def search_organization(api_key, org_name):
    url = "https://api.sam.gov/entity-information/v2/entities"
    params = {
        "api_key": api_key,
        "legalBusinessName": org_name,
        "samRegistered": "Yes",
        "registrationStatus": "Active"
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data.get("totalRecords", 0) > 0:
        entity = data["entityData"][0]
        return {
            "found": True,
            "uei": entity["entityRegistration"]["ueiSAM"],
            "name": entity["entityRegistration"]["legalBusinessName"],
            "status": entity["entityRegistration"]["registrationStatus"],
            "expires": entity["entityRegistration"]["registrationExpirationDate"],
            "can_receive_grants": check_grant_eligibility(entity)
        }
    return {"found": False}

def check_grant_eligibility(entity):
    purpose_code = entity["entityRegistration"]["purposeOfRegistrationCode"]
    return purpose_code in ["Z1", "Z2", "Z4", "Z5"]
```

### Integration with Grant Search
```python
class GrantPlatform:
    def __init__(self, sam_api_key):
        self.sam_verifier = SAMEntityVerifier(sam_api_key)
        
    def search_grants(self, organization_name):
        # First, verify organization
        org_status = self.sam_verifier.verify_grant_eligibility(
            org_name=organization_name
        )
        
        if not org_status["eligible"]:
            return {
                "error": "Organization not registered or eligible for federal grants",
                "registration_url": "https://sam.gov/content/entity-registration"
            }
        
        # If eligible, search for grants
        grants = self.search_grants_gov(
            org_type=org_status["organization_type"],
            certifications=org_status["certifications"]
        )
        
        return {
            "organization": org_status,
            "eligible_grants": grants
        }
```

## Limitations & Workarounds

### What SAM.gov API Does NOT Provide
1. **Grant opportunities** → Use Grants.gov API
2. **Grant deadlines** → Use Grants.gov API
3. **Application status** → Check with specific agencies

### Workarounds
1. Monitor "Special Notices" for grant announcements
2. Track agencies that post grants as "Sources Sought" first
3. Use entity data to improve Grants.gov searches

## Conclusion

While SAM.gov is not a primary source for grant opportunities, it provides essential infrastructure for a professional grant platform:

1. **Entity Verification**: Ensure applicants are eligible
2. **Compliance Checking**: Avoid wasted applications
3. **Data Enrichment**: Improve user experience
4. **Trust Building**: Government-verified data

**Recommendation**: Implement SAM.gov API as a verification layer that runs before showing grant results. This positions your platform as more professional and trustworthy than competitors who only show opportunities without verification.

## Next Steps

1. Implement entity verification endpoint
2. Create eligibility checking logic
3. Build caching layer for performance
4. Design UI for verification status
5. Test with real organizations
6. Monitor API usage and limits

Your SAM.gov API key opens the door to building a more sophisticated grant platform that goes beyond simple opportunity listing to provide genuine value through verification and compliance checking.