import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { cacheConfigs } from '../middleware/cache.middleware';
import logger from '../utils/logger';
import supabaseClient, { getServiceRoleClient } from '../db/supabaseClient';
import { validateGrantFilters, validateUUID, validateNumber } from '../utils/inputValidator';
import { AppError, asyncHandler } from '../utils/ErrorHandler';
import grantsService from '../services/grants/grantsService';
import usersService from '../services/users/usersService';

const router = express.Router();

// Optional auth middleware - sets up user context if token is present, but doesn't require it
const optionalAuthMiddleware = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // User is authenticated, set up user context
    return authMiddleware(req, res, next);
  }
  
  // No authentication provided, continue without user context
  next();
};

// GET /api/grants - Get all grants with filtering
router.get('/',
  cacheConfigs.short,
  optionalAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate and parse query parameters
    const validatedFilters = validateGrantFilters(req.query);
    
    logger.debug('Grants search request', {
      filters: validatedFilters,
      userId: req.user?.id || 'unauthenticated',
      hasAuth: !!req.user
    });

    // Use service role client for public grants access (bypasses RLS)
    // This allows both authenticated and unauthenticated users to see grants
    const clientToUse = getServiceRoleClient();
    
    // Use the grants service to fetch grants with validated filters
    const { grants, totalCount } = await grantsService.getGrants(validatedFilters, clientToUse);

    // Check if we got any grants back
    if (!grants || grants.length === 0) {
      logger.info('No grants found matching filters', { 
        filters: validatedFilters 
      });

      // Return empty array but with 200 status
      return res.json({
        message: 'No grants found matching criteria',
        grants: [],
        count: 0,
        totalCount: totalCount
      });
    }

    // Return successful response with grants
    res.json({
      message: 'Grants fetched successfully',
      grants,
      count: grants.length,
      totalCount: totalCount
    });
  })
);

// GET /api/grants/recommended - Get recommended grants for a user
router.get('/recommended',
  authMiddleware,
  cacheConfigs.recommendations,
  asyncHandler(async (req: Request, res: Response) => {
    // Use authenticated user ID from middleware
    const userId = req.user!.id;

    // Validate query parameters
    const exclude = req.query.exclude ? 
      (req.query.exclude as string).split(',').filter(id => id.length > 0) : [];
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 10), 50);

    logger.debug('Recommended grants request', {
      userId,
      exclude: exclude.length,
      limit
    });

    // Check if user exists in the database
    const { error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.warn('User not found in database when fetching recommended grants', {
        userId
      });
    }

    // Fetch the recommended grants
    const grants = await grantsService.getRecommendedGrants(req.supabase, userId, {
      exclude,
      limit
    });

    if (grants.length === 0) {
      logger.info('No recommended grants found for user', { userId });

      // Try to get some fallback grants if no recommendations were found
      const fallbackResult = await grantsService.getGrants({
        limit: limit,
        page: 1,
        sort_by: 'created_at',
        sort_direction: 'desc'
      });

      if (fallbackResult.grants.length > 0) {
        logger.info('Using fallback grants instead of recommendations', {
          userId,
          fallbackCount: fallbackResult.grants.length
        });

        return res.json({
          message: 'Fallback grants retrieved successfully',
          grants: fallbackResult.grants,
          count: fallbackResult.grants.length,
          totalCount: fallbackResult.totalCount,
          isFallback: true
        });
      }
    }

    res.json({
      message: 'Recommended grants retrieved successfully',
      grants,
      count: grants.length
    });
  })
);

// GET /api/grants/search - Search grants using full-text search
router.get('/search',
  cacheConfigs.short,
  optionalAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const searchQuery = req.query.q as string;
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new AppError('Search query is required', 400);
    }

    const limit = validateNumber(req.query.limit, { min: 1, max: 50, integer: true }) || 20;
    const page = validateNumber(req.query.page, { min: 1, integer: true }) || 1;

    logger.debug('Grant search request', {
      query: searchQuery,
      limit,
      page,
      userId: req.user?.id || 'unauthenticated'
    });

    // Use service role client so unauthenticated users can search grants
    const { grants, totalCount } = await grantsService.searchGrants(
      searchQuery,
      { limit, page },
      getServiceRoleClient()
    );

    res.json({
      message: 'Search completed successfully',
      grants,
      count: grants.length,
      totalCount,
      query: searchQuery
    });
  })
);

// GET /api/grants/metadata - Get all filter metadata options
router.get('/metadata', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('Fetching grant metadata for filters');
  
  // Use service role client to bypass RLS for public metadata
  const serviceClient = getServiceRoleClient();
    
  // Fetch all distinct values for filter options in parallel
  const [
    organizationsResult,
    grantTypesResult,
    fundingInstrumentsResult,
    geographicScopesResult,
    statusesResult,
    dataSourcesResult
  ] = await Promise.all([
    // Organizations
    serviceClient
      .from('grants')
      .select('funding_organization_name')
      .not('funding_organization_name', 'is', null)
      .order('funding_organization_name', { ascending: true }),
    
    // Grant types
    serviceClient
      .from('grants')
      .select('grant_type')
      .not('grant_type', 'is', null)
      .order('grant_type', { ascending: true }),
    
    // Funding instruments
    serviceClient
      .from('grants')
      .select('funding_instrument')
      .not('funding_instrument', 'is', null)
      .order('funding_instrument', { ascending: true }),
    
    // Geographic scopes
    serviceClient
      .from('grants')
      .select('geographic_scope')
      .not('geographic_scope', 'is', null)
      .order('geographic_scope', { ascending: true }),
    
    // Status
    serviceClient
      .from('grants')
      .select('status')
      .not('status', 'is', null)
      .order('status', { ascending: true }),
    
    // Data sources
    serviceClient
      .from('data_sources')
      .select('id, display_name, name')
      .order('display_name', { ascending: true })
  ]);

  // Check for errors
  const errors = [
    organizationsResult.error,
    grantTypesResult.error,
    fundingInstrumentsResult.error,
    geographicScopesResult.error,
    statusesResult.error,
    dataSourcesResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new AppError('Failed to fetch metadata', 500);
  }

  // Extract unique values
  const organizations = Array.from(new Set(organizationsResult.data?.map((item: any) => item.funding_organization_name) || []));
  const grantTypes = Array.from(new Set(grantTypesResult.data?.map((item: any) => item.grant_type) || []));
  const fundingInstruments = Array.from(new Set(fundingInstrumentsResult.data?.map((item: any) => item.funding_instrument) || []));
  const geographicScopes = Array.from(new Set(geographicScopesResult.data?.map((item: any) => item.geographic_scope) || []));
  const statuses = Array.from(new Set(statusesResult.data?.map((item: any) => item.status) || []));

  const metadata = {
    organizations,
    grantTypes,
    fundingInstruments,
    geographicScopes,
    statuses,
    dataSources: dataSourcesResult.data || []
  };

  res.json({
    message: 'Metadata fetched successfully',
    ...metadata
  });
}));

// POST /api/grants/batch - Get multiple grants by IDs
router.post('/batch',
  cacheConfigs.short,
  optionalAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { grant_ids } = req.body;
    
    // Validate input
    if (!grant_ids || !Array.isArray(grant_ids)) {
      throw new AppError('grant_ids must be an array', 400);
    }
    
    if (grant_ids.length === 0) {
      return res.json({
        message: 'No grants requested',
        grants: []
      });
    }
    
    if (grant_ids.length > 100) {
      throw new AppError('Maximum 100 grants can be fetched at once', 400);
    }
    
    // Validate each ID
    for (const id of grant_ids) {
      try {
        validateUUID(id, true);
      } catch (error) {
        throw new AppError(`Invalid grant ID format: ${id}`, 400);
      }
    }
    
    logger.debug('Batch grants request', {
      count: grant_ids.length,
      userId: req.user?.id || 'unauthenticated'
    });
    
    // Use service role client so unauthenticated users can fetch grants
    const grants = await grantsService.getGrantsByIds(grant_ids, getServiceRoleClient());
    
    res.json({
      message: 'Grants fetched successfully',
      grants,
      count: grants.length
    });
  })
);

// GET /api/grants/batch/interactions - Get multiple grants with their user interactions
router.post('/batch/interactions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { grant_ids } = req.body;
    
    // Validate input
    if (!grant_ids || !Array.isArray(grant_ids)) {
      throw new AppError('grant_ids must be an array', 400);
    }
    
    if (grant_ids.length === 0) {
      return res.json({
        message: 'No grants requested',
        results: {}
      });
    }
    
    if (grant_ids.length > 100) {
      throw new AppError('Maximum 100 grants can be fetched at once', 400);
    }
    
    // Validate each ID
    for (const id of grant_ids) {
      try {
        validateUUID(id, true);
      } catch (error) {
        throw new AppError(`Invalid grant ID format: ${id}`, 400);
      }
    }
    
    logger.debug('Batch grants with interactions request', {
      userId,
      count: grant_ids.length
    });
    
    // Fetch grants with interactions
    const grantsWithInteractions = await grantsService.getGrantsWithInteractions(
      userId, 
      grant_ids, 
      req.supabase || supabaseClient
    );
    
    // Convert Map to object for JSON response
    const results: Record<string, any> = {};
    grantsWithInteractions.forEach((value, key) => {
      results[key] = value;
    });
    
    res.json({
      message: 'Grants with interactions fetched successfully',
      results,
      count: grantsWithInteractions.size
    });
  })
);

// GET /api/grants/stats - Get grant statistics
router.get('/stats',
  cacheConfigs.medium,
  asyncHandler(async (req: Request, res: Response) => {
    logger.debug('Fetching grant statistics');
    
    // Use service role client to bypass RLS for public statistics
    const stats = await grantsService.getGrantStats(getServiceRoleClient());
    
    res.json({
      message: 'Statistics fetched successfully',
      stats
    });
  })
);

// GET /api/grants/:id - Get a specific grant by ID
router.get('/:id', 
  optionalAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const grantId = req.params.id;

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    logger.debug('Grant details request', {
      grantId,
      userId: req.user?.id || 'unauthenticated'
    });
    
    // Use service role client so unauthenticated users can view grant details
    const grant = await grantsService.getGrantById(grantId, getServiceRoleClient());

    if (!grant) {
      throw new AppError('Grant not found', 404);
    }

    res.json({
      message: 'Grant fetched successfully',
      grant
    });
  })
);

// POST /api/grants/:id/save - Save a grant for a user
router.post('/:id/save',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const grantId = req.params.id;
    const userId = req.user!.id;

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    logger.debug('Save grant request', { grantId, userId });

    // Check if grant exists using service role client
    const grant = await grantsService.getGrantById(grantId, getServiceRoleClient());
    
    if (!grant) {
      throw new AppError('Grant not found', 404);
    }

    // Use users service to record the interaction
    const interaction = await usersService.recordUserInteraction(supabaseClient, userId, {
      grant_id: grantId,
      action: 'saved'
    });

    res.json({
      message: 'Grant saved successfully',
      interaction
    });
  })
);

// DELETE /api/grants/:id/save - Remove saved grant for a user
router.delete('/:id/save',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const grantId = req.params.id;
    const userId = req.user!.id;

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    logger.debug('Remove saved grant request', { grantId, userId });

    // Delete the saved interaction
    const { error } = await supabaseClient
      .from('user_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('grant_id', grantId)
      .eq('action', 'saved');

    if (error) {
      throw new AppError('Failed to remove saved grant', 500);
    }

    res.json({
      message: 'Grant removed from saved list successfully'
    });
  })
);

// POST /api/grants/:id/apply - Mark grant as applied for a user
router.post('/:id/apply',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const grantId = req.params.id;
    const userId = req.user!.id;

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    logger.debug('Apply to grant request', { grantId, userId });

    // Check if grant exists using service role client
    const grant = await grantsService.getGrantById(grantId, getServiceRoleClient());
    
    if (!grant) {
      throw new AppError('Grant not found', 404);
    }

    // Use users service to record the interaction
    const interaction = await usersService.recordUserInteraction(supabaseClient, userId, {
      grant_id: grantId,
      action: 'applied'
    });

    res.json({
      message: 'Grant application recorded successfully',
      interaction
    });
  })
);

// POST /api/grants/:id/ignore - Mark grant as ignored for a user
router.post('/:id/ignore',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const grantId = req.params.id;
    const userId = req.user!.id;

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    logger.debug('Ignore grant request', { grantId, userId });

    // Check if grant exists using service role client
    const grant = await grantsService.getGrantById(grantId, getServiceRoleClient());
    
    if (!grant) {
      throw new AppError('Grant not found', 404);
    }

    // Use users service to record the interaction
    const interaction = await usersService.recordUserInteraction(supabaseClient, userId, {
      grant_id: grantId,
      action: 'ignored'
    });

    res.json({
      message: 'Grant ignored successfully',
      interaction
    });
  })
);

export default router;