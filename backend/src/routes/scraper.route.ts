import express, { Request, Response } from 'express';
import { scraperScheduler } from '../services/scrapers/scraperScheduler';
import { authMiddleware } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rate-limit.middleware';
import logger from '../utils/logger';

const router = express.Router();

// Protect scraper endpoints - only authenticated admins can access
const adminAuth = [authMiddleware, (req: Request, res: Response, next: any) => {
  // Check if user has admin role - for now just check if authenticated
  // TODO: Implement proper role checking
  if (!req.user) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}];

/**
 * @route GET /api/scraper/status
 * @desc Get the current status of the scraper
 * @access Admin
 */
router.get('/status', adminAuth, (req: Request, res: Response) => {
  try {
    const status = scraperScheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting scraper status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scraper status'
    });
  }
});

/**
 * @route POST /api/scraper/run
 * @desc Manually trigger a full scraper run
 * @access Admin
 */
router.post('/run', adminAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    // Start the scraper asynchronously
    res.json({
      success: true,
      message: 'Scraper started. Check status endpoint for progress.'
    });

    // Run scraper in background
    scraperScheduler.runManualScrape()
      .then(result => {
        logger.info('Manual scraper run completed:', result);
      })
      .catch(error => {
        logger.error('Manual scraper run failed:', error);
      });

  } catch (error: any) {
    logger.error('Error starting scraper:', error);
    
    if (error.message?.includes('already running')) {
      res.status(409).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to start scraper'
      });
    }
  }
});

/**
 * @route POST /api/scraper/test/:grantId
 * @desc Test scraper with a single grant
 * @access Admin
 */
router.post('/test/:grantId', adminAuth, apiLimiter, async (req: Request, res: Response) => {
  try {
    const { grantId } = req.params;
    
    if (!grantId || !grantId.match(/^(PAR|RFA|NOT|PAS|PA)-[\w-]+-\d+$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid grant ID format. Expected format: PAR-XX-XXX'
      });
    }

    // Start test scrape asynchronously
    res.json({
      success: true,
      message: `Test scrape started for grant ${grantId}`
    });

    // Run test in background
    scraperScheduler.runTestScrape(grantId)
      .then(() => {
        logger.info(`Test scrape completed for grant ${grantId}`);
      })
      .catch(error => {
        logger.error(`Test scrape failed for grant ${grantId}:`, error);
      });

  } catch (error: any) {
    logger.error('Error starting test scrape:', error);
    
    if (error.message?.includes('already running')) {
      res.status(409).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to start test scrape'
      });
    }
  }
});

/**
 * @route POST /api/scraper/schedule/start
 * @desc Start the scheduled scraper (runs every 3 hours)
 * @access Admin
 */
router.post('/schedule/start', adminAuth, (req: Request, res: Response) => {
  try {
    scraperScheduler.startScheduledScraping();
    const status = scraperScheduler.getStatus();
    
    res.json({
      success: true,
      message: 'Scheduled scraping started',
      data: status
    });
  } catch (error) {
    logger.error('Error starting scheduled scraper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduled scraping'
    });
  }
});

/**
 * @route POST /api/scraper/schedule/stop
 * @desc Stop the scheduled scraper
 * @access Admin
 */
router.post('/schedule/stop', adminAuth, (req: Request, res: Response) => {
  try {
    scraperScheduler.stopScheduledScraping();
    
    res.json({
      success: true,
      message: 'Scheduled scraping stopped'
    });
  } catch (error) {
    logger.error('Error stopping scheduled scraper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduled scraping'
    });
  }
});

export default router;