import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { cacheConfigs } from '../middleware/cache.middleware';
import logger from '../utils/logger';
import supabaseClient from '../db/supabaseClient';
import { validateGrantFilters, validateUUID, validateNumber } from '../utils/inputValidator';
import { AppError, asyncHandler } from '../utils/ErrorHandler';

// Import both real and mock services
import grantsService from '../services/grants/grantsService';

const router = express.Router();

// Conditional auth middleware - only applies when user_id is provided for filtering
const conditionalAuthMiddleware = (req: Request, res: Response, next: any) => {
  // If user_id is provided in query and exclude_interaction_types is used, require auth
  if (req.query.user_id && req.query.exclude_interaction_types) {
    return authMiddleware(req, res, next);
  }
  // Otherwise, continue without authentication
  next();
};

// GET /api/grants - Get all grants with filtering
router.get('/',
  cacheConfigs.short,
  conditionalAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate and parse query parameters
    const validatedFilters = validateGrantFilters(req.query);
    
    logger.debug('Grants search request', {
      filters: validatedFilters,
      userId: req.user?.id || 'unauthenticated'
    });

    // Use authenticated client if available, otherwise use anonymous client
    const clientToUse = req.supabase || supabaseClient;
    
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
// Note: This route must be defined before the /:id route to avoid conflicts
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
      } as any);

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

// GET /api/grants/similar - Get similar grants using embeddings
router.get('/similar',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const grantId = req.query.exclude_id as string;
    if (!grantId) {
      throw new AppError('exclude_id parameter is required', 400);
    }

    // Validate UUID format
    try {
      validateUUID(grantId, true);
    } catch (error) {
      throw new AppError('Invalid grant ID format', 400);
    }

    const limit = validateNumber(req.query.limit, { min: 1, max: 20, integer: true }) || 3;
    const matchThreshold = validateNumber(req.query.match_threshold, { min: 0.001, max: 1 }) || 0.7;

    logger.debug('Similar grants request (embeddings-based)', {
      grantId,
      limit,
      matchThreshold,
      userId: req.user?.id || 'unauthenticated'
    });

    // First, get the embedding for the source grant
    const { data: sourceGrant, error: sourceError } = await supabaseClient
      .from('grants')
      .select('embeddings')
      .eq('id', grantId)
      .single();

    if (sourceError || !sourceGrant?.embeddings) {
      logger.warn('Source grant not found or has no embeddings', { grantId });
      // Fallback to category-based search if embeddings are not available
      const fallbackResult = await grantsService.getGrants({
        exclude_id: grantId,
        limit: limit
      });

      return res.json({
        message: 'Similar grants fetched successfully',
        grants: fallbackResult.grants,
        count: fallbackResult.grants.length,
        totalCount: fallbackResult.totalCount,
        method: 'category_fallback'
      });
    }

    // Use the guaranteed similarity function to ensure we get results
    const { data: similarGrants, error: similarError } = await supabaseClient
      .rpc('get_similar_grants_guaranteed', {
        query_embedding: sourceGrant.embeddings,
        match_threshold: matchThreshold,
        match_count: limit + 1 // Get one extra to account for excluding source grant
      });

    if (similarError) {
      logger.error('Error calling get_similar_grants RPC:', {
        error: similarError,
        grantId,
        hasEmbeddings: !!sourceGrant?.embeddings
      });
      
      // Fallback to category-based search on RPC error
      const fallbackResult = await grantsService.getGrants({
        exclude_id: grantId,
        limit: limit
      });

      return res.json({
        message: 'Similar grants fetched successfully',
        grants: fallbackResult.grants,
        count: fallbackResult.grants.length,
        totalCount: fallbackResult.totalCount,
        method: 'category_fallback'
      });
    }

    // Filter out the source grant and limit results
    const filteredGrants = (similarGrants || [])
      .filter((grant: any) => grant.id !== grantId)
      .slice(0, limit);

    // Transform the results to include contacts and calculate similarity scores
    const grantsWithContacts = await Promise.all(
      filteredGrants.map(async (grant: any, index: number) => {
        const { data: contacts } = await supabaseClient
          .from('grant_contacts')
          .select('*')
          .eq('grant_id', grant.id)
          .order('display_order');

        // Calculate a similarity score based on position (since grants are ordered by similarity)
        // The first result gets the highest score, decreasing for subsequent results
        const similarityScore = Math.max(0.6, 1 - (index * 0.1));

        return {
          ...grant,
          contacts: contacts || [],
          similarity_score: similarityScore
        };
      })
    );

    res.json({
      message: 'Similar grants fetched successfully',
      grants: grantsWithContacts,
      count: grantsWithContacts.length,
      totalCount: grantsWithContacts.length,
      method: 'embeddings',
      match_threshold: matchThreshold
    });
  })
);

// POST /api/grants/search-by-embedding - Search grants using provided embedding
router.post('/search-by-embedding',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { embedding, limit = 10, match_threshold = 0.6 } = req.body;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new AppError('Embedding array is required', 400);
    }

    const validLimit = validateNumber(limit, { min: 1, max: 50, integer: true }) || 10;
    const validThreshold = validateNumber(match_threshold, { min: 0.1, max: 1 }) || 0.6;

    logger.debug('Search by embedding request', {
      embeddingLength: embedding.length,
      limit: validLimit,
      matchThreshold: validThreshold
    });

    try {
      // Use the get_similar_grants RPC function with provided embedding
      const { data: similarGrants, error: similarError } = await supabaseClient
        .rpc('get_similar_grants', {
          query_embedding: embedding,
          match_threshold: validThreshold,
          match_count: validLimit
        });

      if (similarError) {
        logger.error('Error calling get_similar_grants RPC:', {
          error: similarError
        });
        throw new AppError('Failed to search grants', 500);
      }

      // Add contacts to each grant
      const grantsWithContacts = await Promise.all(
        (similarGrants || []).map(async (grant: any) => {
          const { data: contacts } = await supabaseClient
            .from('grant_contacts')
            .select('*')
            .eq('grant_id', grant.id)
            .order('display_order');

          return {
            ...grant,
            contacts: contacts || []
          };
        })
      );

      res.json({
        message: 'Semantic search completed successfully',
        grants: grantsWithContacts,
        count: grantsWithContacts.length,
        method: 'embeddings'
      });
    } catch (error) {
      logger.error('Error in search by embedding:', error);
      throw new AppError('Failed to search grants by embedding', 500);
    }
  })
);

// GET /api/grants/search-semantic - Search grants using semantic similarity
router.get('/search-semantic',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const searchQuery = req.query.query as string;
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw new AppError('Query parameter is required', 400);
    }

    const limit = validateNumber(req.query.limit, { min: 1, max: 50, integer: true }) || 10;
    const matchThreshold = validateNumber(req.query.match_threshold, { min: 0.001, max: 1 }) || 0.6;

    logger.debug('Semantic search request', {
      query: searchQuery,
      limit,
      matchThreshold,
      userId: req.user?.id || 'unauthenticated'
    });

    try {
      // Import the embedding service
      const { embeddingService } = await import('../services/ai/embeddingServiceWrapper');
      
      // Generate embedding for the search query
      logger.info('Generating embedding for search query:', { 
        query: searchQuery,
        type: typeof searchQuery,
        isArray: Array.isArray(searchQuery)
      });
      
      // Ensure searchQuery is a string
      const queryText = Array.isArray(searchQuery) ? searchQuery.join(' ') : String(searchQuery);
      const queryEmbedding = await embeddingService.generateEmbedding(queryText);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new AppError('Failed to generate embedding for search query', 500);
      }

      logger.info('Generated embedding with dimensions:', queryEmbedding.length);

      // Use the get_similar_grants_guaranteed RPC function to ensure we get results
      const { data: similarGrants, error: similarError } = await supabaseClient
        .rpc('get_similar_grants_guaranteed', {
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: limit
        });

      if (similarError) {
        logger.error('Error calling get_similar_grants RPC:', {
          error: similarError,
          query: searchQuery
        });
        throw new AppError('Failed to search grants', 500);
      }

      // Add contacts to each grant
      const grantsWithContacts = await Promise.all(
        (similarGrants || []).map(async (grant: any) => {
          const { data: contacts } = await supabaseClient
            .from('grant_contacts')
            .select('*')
            .eq('grant_id', grant.id)
            .order('display_order');

          return {
            ...grant,
            contacts: contacts || []
          };
        })
      );

      res.json({
        message: 'Semantic search completed successfully',
        grants: grantsWithContacts,
        count: grantsWithContacts.length,
        method: 'embeddings',
        query: searchQuery
      });
    } catch (error) {
      logger.error('Error in semantic search:', error);
      
      // Fallback to regular search if embedding fails
      const fallbackResult = await grantsService.getGrants({
        search: searchQuery,
        limit: limit
      });

      return res.json({
        message: 'Search completed successfully (fallback)',
        grants: fallbackResult.grants,
        count: fallbackResult.grants.length,
        totalCount: fallbackResult.totalCount,
        method: 'keyword_fallback'
      });
    }
  })
);

// GET /api/grants/metadata - Get all filter metadata options
router.get('/metadata', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('Fetching grant metadata for filters');
    
  // Fetch all distinct values for filter options in parallel
  const [
    agenciesResult,
    subdivisionsResult,
    grantTypesResult,
    activityCodesResult,
    activityCategoriesResult,
    announcementTypesResult,
    applicantTypesResult,
    dataSourcesResult,
    statusesResult
  ] = await Promise.all([
    // Agencies
    supabaseClient
      .from('grants')
      .select('agency_name')
      .not('agency_name', 'is', null)
      .order('agency_name', { ascending: true }),
    
    // Subdivisions
    supabaseClient
      .from('grants')
      .select('agency_subdivision')
      .not('agency_subdivision', 'is', null)
      .order('agency_subdivision', { ascending: true }),
    
    // Grant types
    supabaseClient
      .from('grants')
      .select('grant_type')
      .not('grant_type', 'is', null)
      .order('grant_type', { ascending: true }),
    
    // Activity codes
    supabaseClient
      .from('grants')
      .select('activity_code')
      .not('activity_code', 'is', null)
      .order('activity_code', { ascending: true }),
    
    // Activity categories (array field)
    supabaseClient
      .from('grants')
      .select('activity_category')
      .not('activity_category', 'is', null),
    
    // Announcement types
    supabaseClient
      .from('grants')
      .select('announcement_type')
      .not('announcement_type', 'is', null)
      .order('announcement_type', { ascending: true }),
    
    // Eligible applicant types (array field)
    supabaseClient
      .from('grants')
      .select('eligible_applicants')
      .not('eligible_applicants', 'is', null),
    
    // Data sources
    supabaseClient
      .from('grants')
      .select('data_source')
      .not('data_source', 'is', null)
      .order('data_source', { ascending: true }),
    
    // Status
    supabaseClient
      .from('grants')
      .select('status')
      .not('status', 'is', null)
      .order('status', { ascending: true })
  ]);

  // Check for errors
  const errors = [
    agenciesResult.error,
    subdivisionsResult.error,
    grantTypesResult.error,
    activityCodesResult.error,
    activityCategoriesResult.error,
    announcementTypesResult.error,
    applicantTypesResult.error,
    dataSourcesResult.error,
    statusesResult.error
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new AppError('Failed to fetch metadata', 500);
  }

  // Extract unique values
  const agencies = Array.from(new Set(agenciesResult.data?.map((item: any) => item.agency_name) || []));
  const subdivisions = Array.from(new Set(subdivisionsResult.data?.map((item: any) => item.agency_subdivision) || []));
  const grantTypes = Array.from(new Set(grantTypesResult.data?.map((item: any) => item.grant_type) || []));
  const activityCodes = Array.from(new Set(activityCodesResult.data?.map((item: any) => item.activity_code) || []));
  const announcementTypes = Array.from(new Set(announcementTypesResult.data?.map((item: any) => item.announcement_type) || []));
  const dataSources = Array.from(new Set(dataSourcesResult.data?.map((item: any) => item.data_source) || []));
  const statuses = Array.from(new Set(statusesResult.data?.map((item: any) => item.status) || []));

  // Process array fields
  const activityCategories = Array.from(new Set(
    activityCategoriesResult.data?.flatMap((item: any) => item.activity_category || []) || []
  )).sort();

  const applicantTypes = Array.from(new Set(
    applicantTypesResult.data?.flatMap((item: any) => item.eligible_applicants || []) || []
  )).sort();

  const metadata = {
    agencies,
    subdivisions,
    grantTypes,
    activityCodes,
    activityCategories,
    announcementTypes,
    applicantTypes,
    dataSources,
    statuses
  };

  res.json({
    message: 'Metadata fetched successfully',
    ...metadata
  });
}));

// POST /api/grants/batch - Get multiple grants by IDs
router.post('/batch',
  cacheConfigs.short, // Add caching for batch requests
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
    
    // Fetch grants using the batch service method
    const grants = await grantsService.getGrantsByIds(grant_ids, req.supabase || supabaseClient);
    
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

// GET /api/grants/agencies/list - Get all distinct grant agencies
router.get('/agencies/list', asyncHandler(async (req: Request, res: Response) => {
  logger.debug('Fetching distinct grant agencies');
  
  // Query to get distinct agency names, ordered alphabetically
  const { data, error } = await supabaseClient
    .from('grants')
    .select('agency_name')
    .not('agency_name', 'is', null)
    .order('agency_name', { ascending: true });

  if (error) {
    throw new AppError('Failed to fetch agencies', 500);
  }

  // Extract unique agency names
  const uniqueAgencies = Array.from(new Set(data?.map((item: any) => item.agency_name) || []));

  res.json({
    message: 'Agencies fetched successfully',
    agencies: uniqueAgencies,
    count: uniqueAgencies.length
  });
}));

// GET /api/grants/:id - Get a specific grant by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
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
  
  // Fetch the grant
  const { data: grantData, error: grantError } = await supabaseClient
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .single();

  if (grantError || !grantData) {
    throw new AppError('Grant not found', 404);
  }

  // Fetch the contacts for this grant
  const { data: contactsData, error: contactsError } = await supabaseClient
    .from('grant_contacts')
    .select('*')
    .eq('grant_id', grantId)
    .order('display_order', { ascending: true });

  if (contactsError) {
    logger.warn('Error fetching grant contacts', {
      grantId
    });
    // Continue without contacts rather than failing the whole request
  }

  // Combine grant data with contacts
  const grant = {
    ...grantData,
    contacts: contactsData || []
  };

  res.json({
    message: 'Grant fetched successfully',
    grant
  });
}));

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

    // Check if grant exists
    const { data: grant, error: grantError } = await supabaseClient
      .from('grants')
      .select('id')
      .eq('id', grantId)
      .single();

    if (grantError || !grant) {
      throw new AppError('Grant not found', 404);
    }

    // Insert or update the saved interaction
    const { data, error } = await supabaseClient
      .from('user_interactions')
      .upsert({
        user_id: userId,
        grant_id: grantId,
        action: 'saved',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,grant_id,action'
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to save grant', 500);
    }

    res.json({
      message: 'Grant saved successfully',
      interaction: data
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

    // Check if grant exists
    const { data: grant, error: grantError } = await supabaseClient
      .from('grants')
      .select('id')
      .eq('id', grantId)
      .single();

    if (grantError || !grant) {
      throw new AppError('Grant not found', 404);
    }

    // Insert or update the applied interaction
    const { data, error } = await supabaseClient
      .from('user_interactions')
      .upsert({
        user_id: userId,
        grant_id: grantId,
        action: 'applied',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,grant_id,action'
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to record application', 500);
    }

    res.json({
      message: 'Grant application recorded successfully',
      interaction: data
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

    // Check if grant exists
    const { data: grant, error: grantError } = await supabaseClient
      .from('grants')
      .select('id')
      .eq('id', grantId)
      .single();

    if (grantError || !grant) {
      throw new AppError('Grant not found', 404);
    }

    // Insert or update the ignored interaction
    const { data, error } = await supabaseClient
      .from('user_interactions')
      .upsert({
        user_id: userId,
        grant_id: grantId,
        action: 'ignored',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,grant_id,action'
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to record ignore action', 500);
    }

    res.json({
      message: 'Grant ignored successfully',
      interaction: data
    });
  })
);

export default router;