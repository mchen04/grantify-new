import express, { Request, Response } from 'express';
import { UserPreferences, UserInteraction } from '../models/user';
import { authMiddleware, authorizeUserMiddleware } from '../middleware/auth.middleware';
import { userPreferencesValidation, userInteractionValidation } from '../middleware/validation.middleware';
import { userPreferencesLimiter } from '../middleware/rate-limit.middleware';
import { validateCSRFToken } from '../middleware/csrf.middleware';
import logger, { logSecurityEvent } from '../utils/logger';
import usersService from '../services/users/usersService';

const router = express.Router();

// GET /api/users/preferences - Get user preferences
router.get('/preferences',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Use authenticated user ID from middleware
      const userId = req.user.id;
      
      logSecurityEvent(userId, 'preferences_access', { method: 'GET' });
      
      // Use users service to fetch user preferences
      const preferences = await usersService.getUserPreferences(req.supabase, userId);
      
      res.json({
        message: `Preferences for user: ${userId}`,
        preferences
      });
    } catch (error) {
      logger.error('Error fetching user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// PUT /api/users/preferences - Update user preferences
router.put('/preferences',
  authMiddleware,
  validateCSRFToken,
  userPreferencesLimiter,
  userPreferencesValidation, // Re-enabled with corrected validation
  async (req: Request, res: Response) => {
    try {
      // Use authenticated user ID from middleware
      const userId = req.user.id;
      const preferences = req.body.preferences as UserPreferences;
      
      logger.info('PUT /api/users/preferences called', {
        userId,
        hasPreferences: !!preferences,
        hasProjectDescription: !!preferences?.project_description_query,
        projectDescriptionLength: preferences?.project_description_query?.length || 0
      });
      
      logSecurityEvent(userId, 'preferences_update', {
        method: 'PUT',
        preferencesUpdated: Object.keys(preferences)
      });
      
      // Use users service to update user preferences
      const updatedPreferences = await usersService.updateUserPreferences(req.supabase, userId, preferences);
      
      res.json({
        message: `Updated preferences for user: ${userId}`,
        preferences: updatedPreferences
      });
    } catch (error) {
      logger.error('Error updating user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        stack: error instanceof Error ? error.stack : undefined,
        preferences: req.body.preferences,
        errorCode: error && typeof error === 'object' && 'code' in error ? error.code : undefined
      });
      
      // Return generic error in production, detailed error in development
      const response: any = { message: 'Internal server error' };
      if (process.env.NODE_ENV !== 'production') {
        response.debug = true;
        response.details = error instanceof Error ? error.message : 'Unknown error';
      }
      res.status(500).json(response);
    }
  }
);

// DELETE /api/users/preferences - Delete user preferences
router.delete('/preferences',
  authMiddleware,
  validateCSRFToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      
      logSecurityEvent(userId, 'preferences_delete', { method: 'DELETE' });
      
      await usersService.deleteUserPreferences(req.supabase, userId);
      
      res.status(204).send(); // No content response for successful deletion
    } catch (error) {
      logger.error('Error deleting user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// POST /api/users/interactions - Record user interaction with a grant
router.post('/interactions',
  authMiddleware,
  validateCSRFToken,
  userInteractionValidation,
  async (req: Request, res: Response) => {
    try {
      // Create interaction with authenticated user ID
      const interaction: UserInteraction = {
        ...req.body,
        user_id: req.user.id
      };
      
      logSecurityEvent(req.user.id, 'grant_interaction', {
        action: interaction.action,
        grantId: interaction.grant_id
      });
      
      // Use users service to record user interaction, passing the access token
      // Access the access token directly from the request object attached by authMiddleware
      const accessToken = req.accessToken;
      
      if (!accessToken) {
        // This case should ideally not happen if authMiddleware succeeded, but as a safeguard:
        logSecurityEvent(req.user.id, 'interaction_failed_no_token_in_route', {
          grantId: interaction.grant_id,
          action: interaction.action
        });
        return res.status(500).json({ message: 'Authentication token not available in route handler.' });
      }

      const recordedInteraction = await usersService.recordUserInteraction(req.supabase, req.user.id, interaction);
      
      res.json({
        message: `Recorded interaction for user: ${interaction.user_id}`,
        interaction: recordedInteraction
      });
    } catch (error) {
      logger.error('Error recording user interaction:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        grantId: req.body.grant_id,
        action: req.body.action
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// GET /api/users/interactions - Get user interactions with grants
router.get('/interactions',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Use authenticated user ID from middleware
      const userId = req.user.id;
      const action = req.query.action as string | undefined;
      const grant_id = req.query.grant_id as string | undefined;
      
      // Use users service to fetch interactions
      const result = await usersService.getUserInteractions(req.supabase, userId, action, grant_id);
      
      res.json({
        message: `User interactions for user: ${userId}`,
        interactions: result.interactions || []
      });
    } catch (error) {
      logger.error('Error fetching user interactions:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// DELETE /api/users/interactions/delete - Delete user interaction
router.delete('/interactions/delete',
  authMiddleware,
  validateCSRFToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { grant_id, action } = req.body;

      if (!grant_id || !action) {
        return res.status(400).json({ message: 'Missing grant_id or action in request body' });
      }

      logSecurityEvent(userId, 'grant_interaction_delete', {
        action,
        grantId: grant_id
      });

      await usersService.deleteUserInteractionByDetails(req.supabase, userId, grant_id, action);

      res.json({
        message: `Deleted interaction for user: ${userId}, grant: ${grant_id}, action: ${action}`
      });
    } catch (error) {
      logger.error('Error deleting user interaction:', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id,
        grantId: req.body.grant_id,
        action: req.body.action
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;