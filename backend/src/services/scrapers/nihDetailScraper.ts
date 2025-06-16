import * as puppeteer from 'puppeteer';
import { Page, Browser } from 'puppeteer';
import { ScrapedGrantPage, DetailScraper } from './interfaces/scraperInterfaces';
import logger from '../../utils/logger';

export class NIHDetailScraper implements DetailScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setupBrowser(): Promise<void> {
    if (this.browser) return;
    
    logger.info("Setting up Puppeteer browser for detail scraping");
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
        ]
      });
      this.page = await this.browser.newPage();
      await this.page.setDefaultTimeout(30000);
      logger.info("Browser setup complete");
    } catch (error) {
      logger.error("Error setting up browser", { error: error instanceof Error ? error.message : error });
      throw new Error("Failed to setup browser");
    }
  }

  async scrapeGrantPage(grantId: string, url: string): Promise<ScrapedGrantPage> {
    logger.info("Scraping grant page", { grantId, url });
    
    try {
      if (!this.browser) {
        await this.setupBrowser();
      }
      
      if (!this.page) {
        throw new Error("Page not initialized");
      }

      await this.page.goto(url, { waitUntil: 'networkidle2' });
      
      // Get the full text content of the page
      const pageText = await this.page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get the text content
        return document.body.innerText || '';
      });
      
      // Get the page title
      const pageTitle = await this.page.title();
      
      logger.info(`Successfully scraped page for grant ${grantId}`);
      
      return {
        opportunity_id: grantId,
        source_url: url,
        page_text: pageText,
        page_title: pageTitle
      };

    } catch (error) {
      logger.error(`Error scraping grant ${grantId}:`, error);
      // Return minimal details on error
      return {
        opportunity_id: grantId,
        source_url: url,
        page_text: '',
        page_title: ''
      };
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      logger.info("Closing detail scraper browser...");
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info("Browser closed.");
    }
  }
}