import { NIHListScraper } from './nihListScraper';
import { NIHDetailScraper } from './nihDetailScraper';
import { GrantLink, ScraperPipeline, ScraperConfig } from './interfaces/scraperInterfaces';
import { GeminiService } from '../ai/geminiService';
import { embeddingService } from '../ai/embeddingServiceWrapper';
import supabase from '../../db/supabaseClient';
import { Grant } from '../../models/grant';
import logger from '../../utils/logger';

export class NIHScraperPipeline implements ScraperPipeline {
  private listScraper: NIHListScraper;
  private detailScraper: NIHDetailScraper;
  private geminiService: GeminiService;
  private config: ScraperConfig;
  private geminiRequestCount: number = 0;
  private dailyRequestCount: number = 0;
  private lastRequestTime: number = 0;
  private dailyResetTime: number = Date.now();

  constructor(config: ScraperConfig) {
    this.config = {
      maxConcurrentScrapes: 3,
      delayBetweenRequests: 2000, // 2 seconds between requests
      testMode: false,
      testLimit: 5,
      dataSource: 'NIH', // Default for NIH pipeline
      ...config
    };
    
    this.listScraper = new NIHListScraper();
    this.detailScraper = new NIHDetailScraper();
    this.geminiService = new GeminiService(config.geminiApiKey);
  }

  async runPipeline(): Promise<{ success: number; failed: number; errors: string[] }> {
    const stats = { success: 0, failed: 0, errors: [] as string[] };
    
    try {
      // Step 1: Start pipeline run
      logger.info('Starting NIH scraper pipeline');
      await this.recordPipelineRun('started');

      // Step 2: Scrape list of grants
      logger.info('Scraping NIH grant list...');
      const grantLinks = await this.listScraper.scrapeAllNIHLinks();
      logger.info(`Found ${grantLinks.length} grant links`);

      // Limit grants based on test mode or rate limits
      let maxGrants = grantLinks.length;
      
      if (this.config.testMode) {
        maxGrants = this.config.testLimit!;
      } else {
        // Get the most conservative daily limit across all models
        const modelConfigs = this.geminiService.getModelConfigs();
        const minDailyLimit = Math.min(...modelConfigs.map(m => m.rateLimits.rpd));
        
        // Calculate max grants per run based on the most restrictive model
        // For 8 runs per day (every 3 hours), divide by 8 with some buffer
        const maxPerRun = Math.floor(minDailyLimit / 8 * 0.9); // 90% to leave buffer
        const remainingDailyLimit = minDailyLimit - this.dailyRequestCount;
        
        maxGrants = Math.min(maxGrants, maxPerRun, remainingDailyLimit);
        
        if (maxGrants < grantLinks.length) {
          logger.info(`Limiting run to ${maxGrants} grants to respect Gemini daily rate limits (min limit: ${minDailyLimit})`);
        }
      }
      
      const grantsToProcess = grantLinks.slice(0, maxGrants);

      // Step 3: Process each grant
      for (let i = 0; i < grantsToProcess.length; i++) {
        const grant = grantsToProcess[i];
        logger.info(`Processing grant ${i + 1}/${grantsToProcess.length}: ${grant.id}`);
        
        try {
          await this.processGrant(grant);
          stats.success++;
          
          // Add delay between requests to avoid rate limiting
          if (i < grantsToProcess.length - 1) {
            await this.delay(this.config.delayBetweenRequests!);
          }
        } catch (error) {
          logger.error(`Failed to process grant ${grant.id}:`, error);
          stats.failed++;
          stats.errors.push(`${grant.id}: ${error}`);
        }
      }

      // Step 4: Close browsers
      await this.listScraper.closeBrowser();
      await this.detailScraper.closeBrowser();

      // Step 5: Record completion
      await this.recordPipelineRun('completed', stats);
      logger.info(`Pipeline completed. Success: ${stats.success}, Failed: ${stats.failed}`);

    } catch (error) {
      logger.error('Pipeline failed:', error);
      await this.recordPipelineRun('failed', { error: String(error) });
      throw error;
    }

    return stats;
  }

  private async processGrant(grantLink: GrantLink): Promise<void> {
    try {
      // Check if grant already exists
      const existing = await this.checkExistingGrant(grantLink.id);
      if (existing && !this.shouldUpdateGrant(existing)) {
        logger.info(`Grant ${grantLink.id} already exists and is up to date, skipping`);
        return;
      }

      // Step 1: Scrape grant page
      logger.info(`Scraping details for grant ${grantLink.id}`);
      const scrapedPage = await this.detailScraper.scrapeGrantPage(grantLink.id, grantLink.url);
      
      if (!scrapedPage.page_text || scrapedPage.page_text.length < 100) {
        throw new Error('Page content too short or empty');
      }

      // Step 2: Apply rate limiting before Gemini API call
      await this.enforceGeminiRateLimit();

      // Step 3: Process with Gemini AI
      logger.info(`Processing grant ${grantLink.id} with Gemini AI`);
      const processedGrant = await this.geminiService.processGrantPage(scrapedPage, this.config.dataSource);

      // Step 3: Generate embeddings
      logger.info(`Generating embeddings for grant ${grantLink.id}`);
      const embeddingText = this.createEmbeddingText(processedGrant);
      const embeddings = await embeddingService.generateEmbedding(embeddingText);

      // Step 4: Save to database
      logger.info(`Saving grant ${grantLink.id} to database`);
      await this.saveGrant(processedGrant, embeddings);

    } catch (error) {
      logger.error(`Error processing grant ${grantLink.id}:`, error);
      throw error;
    }
  }

  private createEmbeddingText(grant: Partial<Grant>): string {
    // Combine key fields for embedding generation
    const parts = [
      grant.title || '',
      grant.description_short || '',
      grant.category || '',
      grant.grant_type || '',
      grant.agency_name || '',
      grant.agency_subdivision || '',
      ...(grant.keywords || []),
      ...(grant.eligible_applicants || []),
      grant.eligibility_pi || ''
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async checkExistingGrant(opportunityId: string): Promise<any> {
    const { data, error } = await supabase
      .from('grants')
      .select('id, updated_at')
      .eq('opportunity_id', opportunityId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error(`Error checking existing grant ${opportunityId}:`, error);
    }

    return data;
  }

  private shouldUpdateGrant(existingGrant: any): boolean {
    // Update grants older than 7 days
    const lastUpdate = new Date(existingGrant.updated_at);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 7;
  }

  private async saveGrant(grant: Partial<Grant>, embeddings: number[]): Promise<void> {
    // Prepare grant data with embeddings
    const grantData = {
      ...grant,
      embeddings: JSON.stringify(embeddings), // Supabase expects embeddings as JSON string
      updated_at: new Date().toISOString()
    };

    // Upsert grant (insert or update)
    const { error } = await supabase
      .from('grants')
      .upsert(grantData, {
        onConflict: 'opportunity_id'
      });

    if (error) {
      logger.error(`Error saving grant ${grant.opportunity_id}:`, error);
      throw error;
    }

    logger.info(`Successfully saved grant ${grant.opportunity_id}`);
  }

  private async recordPipelineRun(status: string, details: any = {}): Promise<void> {
    const { error } = await supabase
      .from('pipeline_runs')
      .insert({
        status,
        details,
        timestamp: new Date().toISOString()
      });

    if (error) {
      logger.error('Error recording pipeline run:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceGeminiRateLimit(): Promise<void> {
    // Get the current model's rate limits dynamically
    const currentModel = this.geminiService.getCurrentModelConfig();
    const limits = {
      maxRequestsPerMinute: currentModel.rateLimits.rpm,
      maxTokensPerMinute: currentModel.rateLimits.tpm,
      maxRequestsPerDay: currentModel.rateLimits.rpd
    };
    
    // Check daily limit
    const now = Date.now();
    if (now - this.dailyResetTime > 24 * 60 * 60 * 1000) {
      // Reset daily counter after 24 hours
      this.dailyResetTime = now;
      this.dailyRequestCount = 0;
    }
    
    if (this.dailyRequestCount >= limits.maxRequestsPerDay!) {
      const remainingTime = (this.dailyResetTime + 24 * 60 * 60 * 1000) - now;
      logger.warn(`Daily Gemini rate limit reached (${limits.maxRequestsPerDay} requests). Waiting ${Math.ceil(remainingTime / 1000 / 60)} minutes...`);
      await this.delay(remainingTime);
      this.dailyRequestCount = 0;
      this.dailyResetTime = Date.now();
    }
    
    // Check minute rate limit
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = 60000 / limits.maxRequestsPerMinute!; // 60s / 30 RPM = 2s minimum
    
    if (timeSinceLastRequest < minTimeBetweenRequests) {
      const waitTime = minTimeBetweenRequests - timeSinceLastRequest;
      logger.info(`Rate limiting: waiting ${Math.ceil(waitTime / 1000)}s before next Gemini request`);
      await this.delay(waitTime);
    }
    
    // Update counters
    this.lastRequestTime = Date.now();
    this.geminiRequestCount++;
    this.dailyRequestCount++;
    
    // Log rate limit status every 10 requests
    if (this.dailyRequestCount % 10 === 0) {
      logger.info(`Gemini API usage: ${this.dailyRequestCount}/${limits.maxRequestsPerDay} daily requests`);
    }
  }

  // Manual scrape method for testing a single grant
  async scrapeSingleGrant(grantId: string): Promise<void> {
    try {
      logger.info(`Manually scraping grant ${grantId}`);
      
      // Construct URL based on grant ID pattern
      const url = `https://grants.nih.gov/grants/guide/pa-files/${grantId}.html`;
      const grantLink: GrantLink = { id: grantId, url };
      
      await this.processGrant(grantLink);
      
      // Clean up
      await this.detailScraper.closeBrowser();
      
      logger.info(`Successfully scraped grant ${grantId}`);
    } catch (error) {
      logger.error(`Failed to scrape grant ${grantId}:`, error);
      throw error;
    }
  }
}