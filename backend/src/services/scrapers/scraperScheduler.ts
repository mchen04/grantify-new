import * as cron from 'node-cron';
import { NIHScraperPipeline } from './nihScraperPipeline';
import logger from '../../utils/logger';

export class ScraperScheduler {
  private nihPipeline: NIHScraperPipeline;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.nihPipeline = new NIHScraperPipeline({
      geminiApiKey,
      maxConcurrentScrapes: 3,
      delayBetweenRequests: 2000,
      testMode: process.env.NODE_ENV === 'development',
      testLimit: 5,
      // Rate limits will be dynamically managed based on the current model
      // Starting with Gemini 2.0 Flash as primary model
    });
  }

  /**
   * Start the scheduled scraper (runs every 3 hours)
   */
  startScheduledScraping(): void {
    if (this.cronJob) {
      logger.warn('Scraper scheduler is already running');
      return;
    }

    // Schedule to run every 3 hours
    // Cron expression: '0 */3 * * *' means at minute 0 of every 3rd hour
    this.cronJob = cron.schedule('0 */3 * * *', async () => {
      await this.runScraper();
    });

    logger.info('Scraper scheduler started - will run every 3 hours');
  }

  /**
   * Stop the scheduled scraper
   */
  stopScheduledScraping(): void {
    if (!this.cronJob) {
      logger.warn('Scraper scheduler is not running');
      return;
    }

    this.cronJob.stop();
    this.cronJob = null;
    logger.info('Scraper scheduler stopped');
  }

  /**
   * Run the scraper manually (can be called from API endpoint)
   */
  async runManualScrape(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.isRunning) {
      throw new Error('Scraper is already running. Please wait for it to complete.');
    }

    return await this.runScraper();
  }

  /**
   * Run a test scrape with a single grant
   */
  async runTestScrape(grantId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scraper is already running. Please wait for it to complete.');
    }

    this.isRunning = true;
    try {
      logger.info(`Running test scrape for grant ${grantId}`);
      await this.nihPipeline.scrapeSingleGrant(grantId);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get scraper status
   */
  getStatus(): { isRunning: boolean; isScheduled: boolean; nextRun: Date | null } {
    let nextRun: Date | null = null;
    
    if (this.cronJob) {
      // Calculate next run time (every 3 hours from start)
      const now = new Date();
      const nextHour = Math.ceil(now.getHours() / 3) * 3;
      nextRun = new Date(now);
      nextRun.setHours(nextHour, 0, 0, 0);
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 3);
      }
    }

    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      nextRun
    };
  }

  private async runScraper(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.isRunning) {
      logger.warn('Scraper is already running, skipping this scheduled run');
      return { success: 0, failed: 0, errors: ['Scraper already running'] };
    }

    this.isRunning = true;
    try {
      logger.info('Starting scheduled NIH scraper run');
      const result = await this.nihPipeline.runPipeline();
      logger.info(`Scheduled scraper run completed. Success: ${result.success}, Failed: ${result.failed}`);
      return result;
    } catch (error) {
      logger.error('Scheduled scraper run failed:', error);
      return { success: 0, failed: 0, errors: [String(error)] };
    } finally {
      this.isRunning = false;
    }
  }
}

// Create singleton instance
export const scraperScheduler = new ScraperScheduler();