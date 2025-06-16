// Generic interfaces for grant scrapers - extensible for any funding source

export interface GrantLink {
  id: string;
  url: string;
  source?: string; // e.g., 'NIH', 'NSF', 'Gates Foundation'
}

export interface ScrapedGrantPage {
  opportunity_id: string;
  source_url: string;
  page_text: string;
  page_title: string;
  data_source?: string; // Will be inferred if not provided
}

export interface ScraperConfig {
  geminiApiKey: string;
  maxConcurrentScrapes?: number;
  delayBetweenRequests?: number;
  testMode?: boolean;
  testLimit?: number;
  dataSource?: string; // Override auto-detection
}

// Base interface for list scrapers (scrape grant listings)
export interface ListScraper {
  scrapeGrantList(): Promise<GrantLink[]>;
  closeBrowser(): Promise<void>;
}

// Base interface for detail scrapers (scrape individual grant pages)
export interface DetailScraper {
  scrapeGrantPage(grantId: string, url: string): Promise<ScrapedGrantPage>;
  closeBrowser(): Promise<void>;
}

// Base interface for scraper pipelines (orchestrate the full process)
export interface ScraperPipeline {
  runPipeline(): Promise<{ success: number; failed: number; errors: string[] }>;
  scrapeSingleGrant(grantId: string): Promise<void>;
}

// Supported data sources - add new sources here
export enum DataSource {
  NIH = 'NIH',
  NSF = 'NSF',
  GRANTS_GOV = 'Grants.gov',
  GATES_FOUNDATION = 'Gates Foundation',
  WELLCOME_TRUST = 'Wellcome Trust',
  MOZILLA_FOUNDATION = 'Mozilla Foundation',
  FORD_FOUNDATION = 'Ford Foundation',
  ROCKEFELLER_FOUNDATION = 'Rockefeller Foundation',
  MACARTHUR_FOUNDATION = 'MacArthur Foundation',
  KAISER_FAMILY_FOUNDATION = 'Kaiser Family Foundation',
  ROBERT_WOOD_JOHNSON_FOUNDATION = 'Robert Wood Johnson Foundation'
}

// Rate limiting configuration per model
export interface ModelRateLimits {
  rpm: number; // requests per minute
  tpm: number; // tokens per minute
  rpd: number; // requests per day
}

export interface ModelConfig {
  name: string;
  rateLimits: ModelRateLimits;
}