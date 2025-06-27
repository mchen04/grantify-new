export interface NormalizedGrant {
  // Core fields
  data_source_id: string;
  source_identifier: string;
  source_url?: string;
  title: string;
  status: 'open' | 'active' | 'closed' | 'awarded' | 'forecasted' | 'archived';
  
  // Organization
  funding_organization_name?: string;
  funding_organization_code?: string;
  
  // Funding
  currency?: string;
  funding_amount_min?: number;
  funding_amount_max?: number;
  total_funding_available?: number;
  expected_awards_count?: number;
  
  // Dates
  posted_date?: Date;
  application_deadline?: Date;
  start_date?: Date;
  end_date?: Date;
  last_updated_date?: Date;
  
  // Classification
  grant_type?: string;
  funding_instrument?: string;
  activity_code?: string;
  
  // Raw data
  raw_data?: any;
}

export interface GrantDetails {
  grant_id?: string;
  language_code?: string;
  description?: string;
  abstract?: string;
  purpose?: string;
  expected_results?: string;
  special_requirements?: string;
  application_process?: string;
  evaluation_criteria?: string;
  additional_information?: any;
}

export interface GrantLocation {
  grant_id?: string;
  location_type: 'eligible' | 'target' | 'excluded';
  country_code?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  region?: string;
  geographic_description?: string;
}

export interface GrantCategory {
  grant_id?: string;
  category_type: 'subject' | 'topic' | 'theme' | 'cfda' | 'sector' | 'research_area' | 'sdg' | 'custom';
  category_code?: string;
  category_name: string;
  category_hierarchy?: string;
}

export interface GrantEligibility {
  grant_id?: string;
  eligibility_type: 'organization_type' | 'individual' | 'geographic' | 'sector' | 'size' | 'experience' | 'other';
  eligibility_code?: string;
  eligibility_value?: string;
  eligibility_description?: string;
  is_required?: boolean;
}

export interface GrantKeyword {
  grant_id?: string;
  keyword: string;
  keyword_source: 'api_provided' | 'extracted' | 'manual' | 'ai_generated';
  relevance_score?: number;
}

export interface GrantContact {
  grant_id?: string;
  contact_type: 'program' | 'technical' | 'administrative' | 'general' | 'submission';
  contact_name?: string;
  contact_title?: string;
  organization?: string;
  email?: string;
  phone?: string;
  fax?: string;
  address?: string;
  url?: string;
  notes?: string;
  display_order?: number;
}

export interface NormalizedGrantData {
  grant: NormalizedGrant;
  details?: GrantDetails;
  locations?: GrantLocation[];
  categories?: GrantCategory[];
  eligibility?: GrantEligibility[];
  keywords?: GrantKeyword[];
  contacts?: GrantContact[];
}

export class GrantNormalizer {
  static normalizeStatus(status: string): NormalizedGrant['status'] {
    const statusMap: Record<string, NormalizedGrant['status']> = {
      // Common status mappings
      'open': 'open',
      'active': 'active',
      'closed': 'closed',
      'awarded': 'awarded',
      'forecast': 'forecasted',
      'forecasted': 'forecasted',
      'archived': 'archived',
      'posted': 'open',
      'accepting applications': 'open',
      'accepting proposals': 'open',
      'deadline passed': 'closed',
      'completed': 'closed',
      'upcoming': 'forecasted',
      'announced': 'forecasted'
    };

    return statusMap[status.toLowerCase()] || 'active';
  }

  static normalizeAmount(amount: any): number | undefined {
    if (!amount) return undefined;
    
    // Handle string amounts with currency symbols and commas
    if (typeof amount === 'string') {
      // First remove currency symbols and spaces, but keep commas, dots, and numbers
      let cleaned = amount.replace(/[^0-9,.-]/g, '');
      
      // Handle comma as thousands separator (e.g., "1,000,000")
      if (cleaned.includes(',')) {
        // If there's a dot after commas, it's likely European format (1.234.567,89)
        // Otherwise, it's likely US format (1,234,567.89)
        const lastCommaIndex = cleaned.lastIndexOf(',');
        const lastDotIndex = cleaned.lastIndexOf('.');
        
        if (lastDotIndex > lastCommaIndex) {
          // US format: comma is thousands separator
          cleaned = cleaned.replace(/,/g, '');
        } else if (lastCommaIndex > lastDotIndex) {
          // European format: comma is decimal separator
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
          // Only commas, assume thousands separator
          cleaned = cleaned.replace(/,/g, '');
        }
      }
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    return typeof amount === 'number' ? amount : undefined;
  }

  static normalizeDate(date: any): Date | undefined {
    if (!date) return undefined;
    
    try {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }

  static extractKeywords(text: string, source: GrantKeyword['keyword_source'] = 'extracted'): GrantKeyword[] {
    if (!text) return [];
    
    // Simple keyword extraction - can be improved with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'will', 'can'].includes(word));
    
    const uniqueWords = [...new Set(words)];
    
    return uniqueWords.slice(0, 20).map(word => ({
      keyword: word,
      keyword_source: source
    }));
  }

  static extractCFDANumber(text: string): string | undefined {
    if (!text) return undefined;
    
    // CFDA pattern: XX.XXX
    const match = text.match(/\b\d{2}\.\d{3}\b/);
    return match ? match[0] : undefined;
  }

  static normalizeCurrency(currency?: string): string {
    if (!currency) return 'USD';
    
    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      'C$': 'CAD',
      'CA$': 'CAD',
      'USD': 'USD',
      'GBP': 'GBP',
      'EUR': 'EUR',
      'CAD': 'CAD'
    };
    
    return currencyMap[currency.toUpperCase()] || currency.toUpperCase();
  }

  static parseEligibility(eligibilityText: string): GrantEligibility[] {
    if (!eligibilityText) return [];
    
    const eligibility: GrantEligibility[] = [];
    
    // Look for organization types
    const orgTypes = [
      'nonprofit', 'non-profit', 'university', 'college', 'government',
      'state', 'local', 'tribal', 'for-profit', 'small business',
      'individual', 'consortium', 'public', 'private'
    ];
    
    orgTypes.forEach(type => {
      if (eligibilityText.toLowerCase().includes(type)) {
        eligibility.push({
          eligibility_type: 'organization_type',
          eligibility_value: type,
          eligibility_description: eligibilityText,
          is_required: true
        });
      }
    });
    
    return eligibility;
  }
}