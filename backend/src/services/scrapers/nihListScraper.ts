import * as puppeteer from 'puppeteer';
import { Page, Browser } from 'puppeteer';
import { GrantLink, ListScraper } from './interfaces/scraperInterfaces';
import logger from '../../utils/logger';

// Configuration
const START_URL = "https://grants.nih.gov/funding/nih-guide-for-grants-and-contracts";
// Regex to identify NIH grant/notice identifiers in link text
// Handles both PREFIX-CODE-YY-NNN and PREFIX-YY-NNN structures
const LINK_TEXT_PATTERN = /^(PAR|RFA|NOT|PAS|PA)-(?:(?:\w{2,}-\d{2,})|(?:\d{2,}))-\d{3,}$/i;
// Base URL part to check in the href
const HREF_BASE_PATTERN = "https://grants.nih.gov/grants/guide/";
const WAIT_TIMEOUT = 20000; // Max milliseconds to wait for elements to load
const POST_CLICK_WAIT = 3000; // Milliseconds to wait after clicking 'Next'

export class NIHListScraper implements ListScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async setupBrowser(): Promise<void> {
    logger.info("Setting up Puppeteer browser");
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
      await this.page.setDefaultTimeout(WAIT_TIMEOUT + 10000);
      logger.info("Browser setup complete.");
    } catch (error) {
      logger.error("Error setting up browser:", error);
      throw new Error("Failed to setup browser");
    }
  }

  private async waitForContentLoad(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Wait for a link within a table cell
      await this.page.waitForSelector('#root table tbody tr td a', { timeout: WAIT_TIMEOUT });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small buffer
      return true;
    } catch (error) {
      logger.warn(`Timed out after ${WAIT_TIMEOUT}ms waiting for grant list content.`);
      const pageContent = await this.page.content();
      if (pageContent.includes("No results found")) {
        logger.info("Detected 'No results found' message.");
        return true; // Treat as loaded, but empty
      }
      return false;
    }
  }

  private async extractLinksFromCurrentPage(): Promise<Set<string>> {
    if (!this.page) return new Set();

    const extractedLinks = new Set<string>();
    logger.info("  Parsing page content...");
    
    // Evaluate within the page context to extract links
    const links = await this.page.evaluate(() => {
      const results: Array<{href: string, text: string}> = [];
      const contentArea = document.querySelector('#root');
      if (!contentArea) return results;

      const dataLinks = contentArea.querySelectorAll('table td a[href]');
      dataLinks.forEach(link => {
        const anchor = link as HTMLAnchorElement;
        results.push({
          href: anchor.href,
          text: anchor.textContent?.trim() || ''
        });
      });
      return results;
    });

    logger.info(`  Found ${links.length} links within table data cells. Filtering...`);

    for (const link of links) {
      const isNihGrantUrl = link.href.startsWith(HREF_BASE_PATTERN);
      const matchesPattern = LINK_TEXT_PATTERN.test(link.text);

      if (isNihGrantUrl && matchesPattern) {
        logger.info(`    [PASS] Adding link: Text='${link.text}', Href='${link.href}'`);
        extractedLinks.add(link.href);
      } else {
        // Debug output for failed links
        if (!isNihGrantUrl && matchesPattern) {
          logger.info(`    [FAIL] Href rejected (but text matched): Text='${link.text}', Href='${link.href}'`);
        } else if (isNihGrantUrl && !matchesPattern) {
          logger.info(`    [FAIL] Text rejected (but href matched): Text='${link.text}', Href='${link.href}'`);
        }
      }
    }

    logger.info(`  Finished filtering. Extracted ${extractedLinks.size} valid links from this page.`);
    return extractedLinks;
  }

  private async goToNextPage(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Use CSS Selector targeting the aria-label and ensuring it's not disabled
      const nextButtonSelector = "a[aria-label='Next page'][aria-disabled='false']";
      
      // Check if button exists and is clickable
      const nextButton = await this.page.$(nextButtonSelector);
      if (!nextButton) {
        logger.info("Could not find enabled 'Next' page button. Assuming end of results.");
        return false;
      }

      // Click the button
      await this.page.click(nextButtonSelector);
      logger.info("Clicked 'Next' button.");
      await new Promise(resolve => setTimeout(resolve, POST_CLICK_WAIT));
      return true;
    } catch (error) {
      logger.info("Error clicking 'Next' button:", error);
      return false;
    }
  }

  async scrapeGrantList(): Promise<GrantLink[]> {
    return this.scrapeAllNIHLinks();
  }

  async scrapeAllNIHLinks(): Promise<GrantLink[]> {
    const allFoundLinks = new Set<string>();
    let pageCount = 1;

    try {
      if (!this.browser) {
        await this.setupBrowser();
      }
      
      if (!this.page) {
        throw new Error("Page not initialized");
      }

      logger.info(`Navigating to start URL: ${START_URL}`);
      await this.page.goto(START_URL, { waitUntil: 'networkidle2' });

      while (true) {
        logger.info(`\n--- Processing Page ${pageCount} ---`);

        logger.info("Waiting for page content to load...");
        if (!await this.waitForContentLoad()) {
          logger.info("Content did not load properly. Stopping.");
          break;
        }

        logger.info("Extracting links from current page...");
        const linksOnPage = await this.extractLinksFromCurrentPage();
        const newLinksCount = Array.from(linksOnPage).filter(link => !allFoundLinks.has(link)).length;

        if (newLinksCount > 0) {
          logger.info(`Added ${newLinksCount} new unique link(s) to the total set.`);
          linksOnPage.forEach(link => allFoundLinks.add(link));
        } else {
          logger.info("No new unique links found on this page to add to the set.");
        }

        logger.info("Checking for 'Next' page...");
        if (await this.goToNextPage()) {
          pageCount++;
        } else {
          break; // Exit the loop if 'Next' not found/clicked
        }
      }
    } catch (error) {
      logger.error("\nAn unexpected error occurred during scraping:", error);
      throw error;
    } finally {
      await this.closeBrowser();
    }

    // Convert links to GrantLink objects
    logger.info("\n--- Scraping Complete ---");
    const grantLinks: GrantLink[] = [];
    
    if (allFoundLinks.size > 0) {
      logger.info(`Found a total of ${allFoundLinks.size} unique grant links across ${pageCount} page(s).`);
      const sortedLinks = Array.from(allFoundLinks).sort();
      
      sortedLinks.forEach((link, index) => {
        // Extract grant ID from URL
        const match = link.match(/\/(PAR|RFA|NOT|PAS|PA)-[\w-]+-\d+\.html$/i);
        if (match) {
          const id = match[0].replace('.html', '').substring(1); // Remove leading slash and .html
          grantLinks.push({ id, url: link });
          logger.info(`${index + 1}. ID: ${id}, URL: ${link}`);
        }
      });
    } else {
      logger.info(`No grant links matching the criteria were found after checking ${pageCount} page(s).`);
    }

    return grantLinks;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      logger.info("\nClosing browser...");
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info("Browser closed.");
    }
  }
}