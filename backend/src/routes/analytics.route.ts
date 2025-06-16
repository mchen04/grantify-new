import express, { Request, Response } from 'express';
import { asyncHandler } from '../utils/ErrorHandler';
import AnalyticsService from '../services/analytics/analyticsService';
import { authMiddleware } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const router = express.Router();

/**
 * @route GET /api/analytics/dashboard
 * @desc Get comprehensive dashboard analytics
 * @access Private (Admin only)
 */
router.get('/dashboard', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Note: In production, you might want to add admin role checking here
  const result = await AnalyticsService.getDashboardAnalytics();
  
  logger.info('Dashboard analytics requested', {
    userId: req.user?.id,
    success: result.success
  });
  
  res.json(result);
}));

/**
 * @route GET /api/analytics/grants/statistics
 * @desc Get overall grant statistics
 * @access Private
 */
router.get('/grants/statistics', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsService.getGrantStatistics();
  res.json(result);
}));

/**
 * @route GET /api/analytics/agencies
 * @desc Get agency analytics
 * @access Private
 */
router.get('/agencies', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await AnalyticsService.getAgencyAnalytics(limit);
  res.json(result);
}));

/**
 * @route GET /api/analytics/users/interactions
 * @desc Get user interaction analytics
 * @access Private
 */
router.get('/users/interactions', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const result = await AnalyticsService.getUserInteractionAnalytics(days);
  res.json(result);
}));

/**
 * @route GET /api/analytics/grants/top-performing
 * @desc Get top performing grants
 * @access Private
 */
router.get('/grants/top-performing', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const result = await AnalyticsService.getTopPerformingGrants(limit);
  res.json(result);
}));

/**
 * @route GET /api/analytics/system/metrics
 * @desc Get system performance metrics
 * @access Private (Admin only)
 */
router.get('/system/metrics', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Note: In production, you might want to add admin role checking here
  const result = await AnalyticsService.getSystemMetrics();
  res.json(result);
}));

/**
 * @route GET /api/analytics/search/trends
 * @desc Get search analytics and trends
 * @access Private
 */
router.get('/search/trends', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const result = await AnalyticsService.getSearchAnalytics(hours);
  res.json(result);
}));

/**
 * @route POST /api/analytics/refresh
 * @desc Refresh analytics materialized views
 * @access Private (Admin only)
 */
router.post('/refresh', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Note: In production, you might want to add admin role checking here
  const result = await AnalyticsService.refreshAnalyticsViews();
  
  logger.info('Analytics views refresh requested', {
    userId: req.user?.id,
    success: result.success
  });
  
  res.json(result);
}));

/**
 * @route GET /api/analytics/health
 * @desc Analytics service health check
 * @access Public
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Quick test of analytics service
    const systemMetrics = await AnalyticsService.getSystemMetrics();
    
    res.json({
      success: true,
      message: 'Analytics service is healthy',
      timestamp: new Date().toISOString(),
      systemStatus: {
        analyticsViews: 'operational',
        lastDataUpdate: systemMetrics.data.snapshotTime
      }
    });
  } catch (error) {
    logger.error('Analytics health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Analytics service unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;