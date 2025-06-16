import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedGrantPage, ModelConfig } from '../scrapers/interfaces/scraperInterfaces';
import { Grant, GrantContact } from '../../models/grant';
import logger from '../../utils/logger';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private models: ModelConfig[] = [
    { name: 'gemini-2.0-flash', rateLimits: { rpm: 15, tpm: 1000000, rpd: 1500 } },
    { name: 'gemini-2.0-flash-lite', rateLimits: { rpm: 30, tpm: 1000000, rpd: 1500 } },
    { name: 'gemini-1.5-pro', rateLimits: { rpm: 15, tpm: 250000, rpd: 500 } }, // Assuming conservative limits
    { name: 'gemini-1.5-flash', rateLimits: { rpm: 15, tpm: 250000, rpd: 500 } },
    { name: 'gemini-1.5-flash-8b', rateLimits: { rpm: 15, tpm: 250000, rpd: 500 } }
  ];
  private currentModelIndex: number = 0;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  getCurrentModelConfig(): ModelConfig {
    return this.models[this.currentModelIndex];
  }

  getModelConfigs(): ModelConfig[] {
    return this.models;
  }

  private inferDataSource(url: string): string {
    // Infer data source from URL patterns
    if (url.includes('grants.nih.gov') || url.includes('nih.gov')) {
      return 'NIH';
    } else if (url.includes('nsf.gov')) {
      return 'NSF';
    } else if (url.includes('grants.gov')) {
      return 'Grants.gov';
    } else if (url.includes('gatesfoundation.org')) {
      return 'Gates Foundation';
    } else if (url.includes('wellcome.org') || url.includes('wellcome.ac.uk')) {
      return 'Wellcome Trust';
    } else if (url.includes('mozilla.org')) {
      return 'Mozilla Foundation';
    } else if (url.includes('ford.org')) {
      return 'Ford Foundation';
    } else if (url.includes('rockefellerfoundation.org')) {
      return 'Rockefeller Foundation';
    } else if (url.includes('macfound.org')) {
      return 'MacArthur Foundation';
    } else if (url.includes('kff.org')) {
      return 'Kaiser Family Foundation';
    } else if (url.includes('rwjf.org')) {
      return 'Robert Wood Johnson Foundation';
    } else {
      // Extract domain as fallback
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch {
        return 'Unknown';
      }
    }
  }

  private createPrompt(grantPage: ScrapedGrantPage): string {
    return `
You are an AI assistant specialized in extracting and structuring grant information from web pages of various funding sources (NIH, NSF, private foundations, etc.).

GRANT PAGE CONTENT:
Opportunity ID: ${grantPage.opportunity_id}
URL: ${grantPage.source_url}
Page Title: ${grantPage.page_title}

FULL PAGE TEXT:
${grantPage.page_text}

INSTRUCTIONS:
Extract and structure the following information from the page content above. This grant could be from any funding source (government, private foundation, corporate, etc.). Be thorough in your extraction but only include information that is explicitly stated in the text. If a field is not found, set it to null.

Required fields to extract:
1. title - The grant title
2. opportunity_number - The opportunity number (often same as ID)
3. description_short - Generate a 2-3 sentence summary (max 200 words) of what this grant funds
4. description_full - Extract the full description/purpose/background sections
5. category - Determine the most appropriate category based on the grant's purpose and content
6. grant_type - Extract the specific grant type
7. activity_code - Extract activity code (e.g., R01, R21, K01)
8. activity_category - Extract activity categories as array
9. agency_name - Issuing organization name (government agency, foundation, corporation, etc.)
10. agency_subdivision - Division/Department/Program within the funding organization
11. agency_code - Organization or program code if mentioned
12. status - Determine as active/closed/upcoming based on dates
13. post_date - Posted/Release date
14. close_date - Application due date
15. loi_due_date - Letter of Intent due date
16. expiration_date - Expiration date
17. earliest_start_date - Earliest start date
18. total_funding - Total funding available
19. award_ceiling - Maximum award amount
20. award_floor - Minimum award amount
21. expected_award_count - Number of awards expected
22. project_period_max_years - Maximum project period in years
23. cost_sharing - Is cost sharing required (boolean)
24. eligible_applicants - Array of eligible applicant types
25. eligibility_pi - Principal Investigator eligibility requirements
26. announcement_type - Type of announcement
27. clinical_trial_allowed - Are clinical trials allowed (boolean)
28. contacts - Array of contact objects with the following structure:
    {
      contact_type: string (describe the type of contact, e.g., "Help Desk", "General Information", "Scientific Contact", "Program Officer", etc.),
      contact_name: string (optional),
      contact_role: string (optional),
      contact_organization: string (optional),
      email: string (optional),
      phone: string (optional),
      url: string (optional),
      display_order: number (optional),
      notes: string (optional)
    }
29. keywords - Extract or generate 5-10 relevant keywords
30. additional_notes - Any special instructions or important notes

IMPORTANT FORMATTING RULES:
- Dates should be in ISO format (YYYY-MM-DD) or null
- Numbers should be numeric values without currency symbols or commas
- Booleans should be true/false or null
- Arrays should be arrays even if empty
- All string values should be trimmed of extra whitespace

Respond ONLY with a JSON object containing all the fields above. Do not include any explanation or text outside the JSON.`;
  }

  async processGrantPage(grantPage: ScrapedGrantPage, dataSource?: string): Promise<Partial<Grant>> {
    const prompt = this.createPrompt(grantPage);
    let lastError: any = null;
    
    // Try each model in the fallback chain
    for (let i = 0; i < this.models.length; i++) {
      const modelConfig = this.models[i];
      
      try {
        logger.info(`Processing grant ${grantPage.opportunity_id} with ${modelConfig.name}...`);
        
        const model = this.genAI.getGenerativeModel({ model: modelConfig.name });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Extract JSON from the response
        let jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Gemini response');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Clean and validate the data
        const processedGrant: Partial<Grant> = {
        opportunity_id: grantPage.opportunity_id,
        opportunity_number: parsedData.opportunity_number || grantPage.opportunity_id,
        title: parsedData.title || grantPage.page_title || grantPage.opportunity_id,
        description_short: parsedData.description_short || 'Grant information available. Please see full description.',
        description_full: parsedData.description_full || grantPage.page_text.substring(0, 5000),
        category: parsedData.category || 'General Grant',
        grant_type: parsedData.grant_type || 'General Grant',
        activity_code: parsedData.activity_code || null,
        activity_category: Array.isArray(parsedData.activity_category) ? parsedData.activity_category : [],
        agency_name: parsedData.agency_name || 'Unknown Funding Organization',
        agency_subdivision: parsedData.agency_subdivision || null,
        agency_code: parsedData.agency_code || null,
        source_url: grantPage.source_url,
        data_source: dataSource || this.inferDataSource(grantPage.source_url),
        status: parsedData.status || 'active',
        post_date: this.parseDate(parsedData.post_date),
        close_date: this.parseDate(parsedData.close_date),
        loi_due_date: this.parseDate(parsedData.loi_due_date),
        expiration_date: this.parseDate(parsedData.expiration_date),
        earliest_start_date: this.parseDate(parsedData.earliest_start_date),
        total_funding: this.parseNumber(parsedData.total_funding),
        award_ceiling: this.parseNumber(parsedData.award_ceiling),
        award_floor: this.parseNumber(parsedData.award_floor),
        expected_award_count: this.parseNumber(parsedData.expected_award_count),
        project_period_max_years: this.parseNumber(parsedData.project_period_max_years),
        cost_sharing: parsedData.cost_sharing === true,
        eligible_applicants: this.standardizeEligibleApplicants(parsedData.eligible_applicants || []),
        eligibility_pi: parsedData.eligibility_pi || null,
        announcement_type: parsedData.announcement_type || null,
        clinical_trial_allowed: parsedData.clinical_trial_allowed === true ? true : (parsedData.clinical_trial_allowed === false ? false : undefined),
        contacts: this.parseContacts(parsedData.contacts),
        keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords : [],
        additional_notes: parsedData.additional_notes || null
      };
      
      logger.info(`Successfully processed grant ${grantPage.opportunity_id} with ${modelConfig.name}`);
      return processedGrant;
      
      } catch (error) {
        lastError = error;
        logger.warn(`Failed to process grant ${grantPage.opportunity_id} with ${modelConfig.name}:`, error);
        
        // Continue to next model in fallback chain
        if (i < this.models.length - 1) {
          logger.info(`Trying fallback model: ${this.models[i + 1].name}`);
          // Add a small delay before trying the next model
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // All models failed
    logger.error(`All models failed for grant ${grantPage.opportunity_id}:`, lastError);
    
    // Return minimal fallback data
    return {
        opportunity_id: grantPage.opportunity_id,
        title: grantPage.page_title || grantPage.opportunity_id,
        description_short: 'Grant information available. Error processing full details.',
        description_full: grantPage.page_text.substring(0, 5000),
        source_url: grantPage.source_url,
        data_source: dataSource || this.inferDataSource(grantPage.source_url),
        status: 'active',
        eligible_applicants: [],
        keywords: [],
        activity_category: []
      };
  }

  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    
    const num = Number(value);
    return isNaN(num) ? null : num;
  }


  private standardizeEligibleApplicants(applicants: any): string[] {
    if (!Array.isArray(applicants)) return [];
    
    const standardMapping: { [key: string]: string } = {
      'higher education': 'Higher Education Institutions',
      'university': 'Higher Education Institutions',
      'college': 'Higher Education Institutions',
      'nonprofit': 'Nonprofits',
      'non-profit': 'Nonprofits',
      'for-profit': 'For-profit organizations',
      'for profit': 'For-profit organizations',
      'small business': 'Small businesses',
      'state government': 'State governments',
      'local government': 'Local governments',
      'tribal government': 'Tribal governments',
      'school district': 'Independent school districts',
      'public housing': 'Public housing authorities',
      'native american': 'Native American tribal organizations',
      'faith-based': 'Faith-based organizations',
      'faith based': 'Faith-based organizations',
      'community-based': 'Community-based organizations',
      'community based': 'Community-based organizations',
      'regional': 'Regional organizations'
    };
    
    const standardized = new Set<string>();
    
    applicants.forEach((applicant: any) => {
      if (typeof applicant !== 'string') return;
      
      const lower = applicant.toLowerCase().trim();
      let matched = false;
      
      for (const [key, value] of Object.entries(standardMapping)) {
        if (lower.includes(key)) {
          standardized.add(value);
          matched = true;
        }
      }
      
      // If no mapping found, use the original (cleaned)
      if (!matched && applicant.trim()) {
        standardized.add(applicant.trim());
      }
    });
    
    return Array.from(standardized);
  }

  private parseContacts(contacts: any): GrantContact[] {
    if (!Array.isArray(contacts)) return [];
    
    return contacts.map((contact: any, index: number) => {
      const parsedContact: GrantContact = {
        contact_type: contact.contact_type || 'Contact',
        display_order: contact.display_order || index,
      };
      
      if (contact.contact_name) parsedContact.contact_name = contact.contact_name;
      if (contact.contact_role) parsedContact.contact_role = contact.contact_role;
      if (contact.contact_organization) parsedContact.contact_organization = contact.contact_organization;
      if (contact.email) parsedContact.email = contact.email;
      if (contact.phone) parsedContact.phone = contact.phone;
      if (contact.url) parsedContact.url = contact.url;
      if (contact.notes) parsedContact.notes = contact.notes;
      
      return parsedContact;
    });
  }

}