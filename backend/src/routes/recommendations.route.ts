import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import recommendationService from '../services/ai/recommendationService';
import logger from '../utils/logger';

const router = express.Router();

// GET /api/recommendations - Get grant recommendations using semantic search
router.get('/',
  authMiddleware,
  cacheMiddleware({ 
    duration: 10 * 60 * 1000, // Cache for 10 minutes
    keyGenerator: (req) => `recommendations:${req.user.id}:${req.query.limit || 20}:${req.query.offset || 0}:${req.query.includeFilters !== 'false'}`
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const includeFilters = req.query.includeFilters !== 'false';

      logger.debug('Fetching recommendations', {
        userId,
        limit,
        offset,
        includeFilters
      });

      const result = await recommendationService.getRecommendations(req.supabase, {
        userId,
        limit,
        offset,
        includeFilters
      });

      res.json({
        message: 'Recommendations fetched successfully',
        grants: result.grants,
        total: result.total,
        limit,
        offset
      });
    } catch (error) {
      logger.error('Error fetching recommendations:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      });

      res.status(500).json({
        message: 'Failed to fetch recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;