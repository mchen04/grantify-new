-- Unified Grant Database Schema
-- Designed to store grants from all 13 API sources
-- Optimized for search, filtering, and user experience

-- Main grants table
CREATE TABLE grants (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id VARCHAR(100) NOT NULL,  -- Original ID from API
    source_api VARCHAR(50) NOT NULL,  -- 'grants_gov', 'eu_portal', etc.
    
    -- Basic grant information
    title TEXT NOT NULL,
    description TEXT,
    funding_organization VARCHAR(500) NOT NULL,
    funding_agency VARCHAR(500),  -- Sub-agency if applicable
    
    -- Financial information
    amount_min DECIMAL(15,2),
    amount_max DECIMAL(15,2),
    amount_currency CHAR(3) DEFAULT 'USD',
    total_funding_available DECIMAL(15,2),
    award_floor DECIMAL(15,2),  -- Minimum award amount
    award_ceiling DECIMAL(15,2),  -- Maximum award amount
    
    -- Critical dates
    posted_date DATE,
    deadline_date TIMESTAMP WITH TIME ZONE,
    expected_start_date DATE,
    project_period_months INTEGER,
    
    -- Eligibility and categories
    eligible_applicants TEXT[],  -- ['nonprofit', 'university', 'small_business', 'individual']
    eligibility_codes VARCHAR(50)[],  -- Original eligibility codes from source
    categories TEXT[],  -- ['research', 'health', 'education', 'environment']
    keywords TEXT[],  -- For improved search
    
    -- Geographic information
    country_code CHAR(2),  -- ISO country code: 'US', 'GB', 'CA'
    state_province VARCHAR(100),
    city VARCHAR(200),
    geographic_scope VARCHAR(50),  -- 'local', 'state', 'national', 'international'
    
    -- Application information
    application_url TEXT,
    how_to_apply TEXT,
    contact_email VARCHAR(200),
    contact_phone VARCHAR(50),
    
    -- Status and metadata
    status VARCHAR(50) DEFAULT 'active',  -- 'active', 'closed', 'awarded'
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance optimization
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    -- Unique constraint to prevent duplicates
    UNIQUE(source_api, source_id)
);

-- Indexes for performance
CREATE INDEX idx_grants_deadline ON grants(deadline_date) WHERE status = 'active';
CREATE INDEX idx_grants_amount ON grants(amount_max);
CREATE INDEX idx_grants_country ON grants(country_code);
CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_posted ON grants(posted_date DESC);
CREATE INDEX idx_grants_categories ON grants USING GIN(categories);
CREATE INDEX idx_grants_eligible ON grants USING GIN(eligible_applicants);

-- Full text search
CREATE INDEX idx_grants_search ON grants USING GIN(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(funding_organization, '')
    )
);

-- Organization verification table (from SAM.gov)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    uei_sam VARCHAR(12) UNIQUE,  -- Unique Entity ID from SAM.gov
    duns_number VARCHAR(9),  -- Legacy DUNS
    ein VARCHAR(20),  -- Tax ID
    
    -- Registration details
    registration_status VARCHAR(50),  -- 'active', 'expired', 'not_registered'
    registration_expires DATE,
    purpose_of_registration VARCHAR(10)[],  -- ['Z1', 'Z2'] for grant eligibility
    
    -- Organization details
    organization_type VARCHAR(100),  -- 'nonprofit', 'university', 'government'
    year_established INTEGER,
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    
    -- Certifications
    certifications TEXT[],  -- ['501c3', '8a', 'woman_owned', 'minority_owned']
    
    -- Contact information
    primary_email VARCHAR(200),
    primary_phone VARCHAR(50),
    website_url TEXT,
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2),
    
    -- Metadata
    verified_date TIMESTAMP WITH TIME ZONE,
    last_checked TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_uei ON organizations(uei_sam);
CREATE INDEX idx_org_name ON organizations(name);
CREATE INDEX idx_org_type ON organizations(organization_type);

-- User accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(200),
    organization_id UUID REFERENCES organizations(id),
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{"email": true, "deadline_days": 7}',
    search_preferences JSONB DEFAULT '{}',
    
    -- Account status
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(20) DEFAULT 'free',  -- 'free', 'premium', 'enterprise'
    subscription_expires DATE,
    
    -- Metadata
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org ON users(organization_id);

-- Saved searches and alerts
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Search details
    name VARCHAR(200) NOT NULL,
    search_criteria JSONB NOT NULL,  -- Stores all search parameters
    
    -- Alert configuration
    alert_enabled BOOLEAN DEFAULT TRUE,
    alert_frequency VARCHAR(20) DEFAULT 'weekly',  -- 'instant', 'daily', 'weekly'
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert ON saved_searches(alert_enabled, alert_frequency);

-- Track user interactions
CREATE TABLE user_grant_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    
    -- Interaction types
    viewed BOOLEAN DEFAULT FALSE,
    saved BOOLEAN DEFAULT FALSE,
    applied BOOLEAN DEFAULT FALSE,
    hidden BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    saved_date TIMESTAMP WITH TIME ZONE,
    applied_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    user_notes TEXT,
    application_status VARCHAR(50),  -- 'preparing', 'submitted', 'awarded', 'rejected'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, grant_id)
);

CREATE INDEX idx_interactions_user ON user_grant_interactions(user_id);
CREATE INDEX idx_interactions_grant ON user_grant_interactions(grant_id);
CREATE INDEX idx_interactions_saved ON user_grant_interactions(user_id, saved) WHERE saved = TRUE;

-- API sync tracking
CREATE TABLE api_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_name VARCHAR(50) NOT NULL,
    
    -- Sync details
    sync_start TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_end TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20),  -- 'running', 'success', 'failed'
    
    -- Results
    records_fetched INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_api ON api_sync_log(api_name, sync_start DESC);

-- Search analytics
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Search details
    search_query TEXT,
    search_filters JSONB,
    results_count INTEGER,
    
    -- User behavior
    results_clicked INTEGER DEFAULT 0,
    search_refined BOOLEAN DEFAULT FALSE,
    search_saved BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_date ON search_analytics(created_at DESC);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grants_updated_at BEFORE UPDATE ON grants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for eligible_applicants
COMMENT ON COLUMN grants.eligible_applicants IS 'Common values: nonprofit, forprofit, university, government, tribal, individual, small_business';

-- Sample data for categories
COMMENT ON COLUMN grants.categories IS 'Common values: research, health, education, environment, arts, community, technology, agriculture';

-- Sample data for geographic_scope
COMMENT ON COLUMN grants.geographic_scope IS 'Values: local, state, national, international';

-- Sample data for organization_type
COMMENT ON COLUMN organizations.organization_type IS 'Values: nonprofit, university, government, forprofit, individual, tribal';