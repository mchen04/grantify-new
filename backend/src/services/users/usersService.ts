import { SupabaseClient } from '@supabase/supabase-js';
import { User, UserPreferences, UserInteraction } from '../../models/user';
import logger, { logSecurityEvent } from '../../utils/logger';
 
 /**
  * Service for managing user operations in the database
 */
class UsersService {
  /**
   * Get a user's profile
   * @param userId - User ID
   * @returns User profile or null if not found
   */
  async getUserProfile(supabase: SupabaseClient, userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Handle not found gracefully
        throw error;
      }

      // If no profile exists yet, return a default structure or just the user_id
      return data || { user_id: userId };
    } catch (error) {
      logger.error('Error fetching user profile:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Update a user's profile
   * @param userId - User ID
   * @param profileData - Profile data to update
   * @returns Updated profile
   */
  async updateUserProfile(supabase: SupabaseClient, userId: string, profileData: Partial<User>): Promise<User> {
    try {
      // Use upsert to insert or update the profile
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updatedProfile;
    } catch (error) {
      logger.error('Error updating user profile:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Get a user's preferences
   * @param userId - User ID
   * @returns User preferences or default preferences if not found
   */
  async getUserPreferences(supabase: SupabaseClient, userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Ensure default structure if no data
      return data || {
        user_id: userId,
        filter_keywords: [], // Match UserPreferences structure
      };
    } catch (error) {
      logger.error('Error fetching user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Update a user's preferences
   * @param userId - User ID
   * @param preferencesUpdate - Preferences data to update
   * @returns Updated preferences
   */
  async updateUserPreferences(supabase: SupabaseClient, userId: string, preferencesUpdate: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      logger.info('updateUserPreferences called', {
        userId,
        hasProjectDescription: !!preferencesUpdate.project_description_query,
        projectDescriptionLength: preferencesUpdate.project_description_query?.length || 0
      });

      // Prepare the preferences data
      const preferencesData: any = {
        user_id: userId,
        // Include fields defined in UserPreferences model
        funding_min: preferencesUpdate.funding_min,
        funding_max: preferencesUpdate.funding_max,
        agencies: preferencesUpdate.agencies || [],
        deadline_range: preferencesUpdate.deadline_range,
        updated_at: new Date().toISOString()
      };

      // Handle project description
      if (preferencesUpdate.project_description_query !== undefined) {
        preferencesData.project_description_query = preferencesUpdate.project_description_query;
      }

      // Upsert the preferences
      const { data: updatedPrefs, error } = await supabase
        .from('user_preferences')
        .upsert(preferencesData, { onConflict: 'user_id' }) // Ensure constraint name is correct
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updatedPrefs;
    } catch (error) {
      logger.error('Error updating user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete a user's preferences
   * @param supabase - Supabase client
   * @param userId - User ID
   * @returns Promise<void>
   */
  async deleteUserPreferences(supabase: SupabaseClient, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) {
        // PGRST116 means no rows were found, which is acceptable for a delete.
        // If preferences didn't exist, deleting them is still a "successful" outcome.
        if (error.code === 'PGRST116') {
          logger.info(`No preferences found for user ${userId} to delete.`);
          return;
        }
        throw error;
      }
      logger.info(`Successfully deleted preferences for user ${userId}`);
    } catch (error) {
      logger.error('Error deleting user preferences:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Get user interactions
   * @param userId - User ID
   * @param action - Optional action filter
   * @returns User interactions and associated grants
   */
  async getUserInteractions(supabase: SupabaseClient, userId: string, action?: string, grant_id?: string): Promise<{ interactions: UserInteraction[], grants: any[] }> {
    try {
      // First, get the user interactions without joining with grants
      let query = supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId);

      if (action && ['saved', 'applied', 'ignored'].includes(action)) {
        query = query.eq('action', action);
      }
      
      if (grant_id) {
        query = query.eq('grant_id', grant_id);
      }

      query = query.order('created_at', { ascending: false });

      const { data: interactions, error } = await query;

      if (error) {
        throw error;
      }

      // Extract the interactions
      const interactionRecords = interactions?.map(i => ({
        id: i.id,
        user_id: i.user_id,
        grant_id: i.grant_id,
        action: i.action,
        notes: i.notes,
        timestamp: i.created_at, // Map created_at to timestamp for frontend compatibility
      })) || [];
      
      // Get the unique grant IDs from the interactions
      const grantIds = [...new Set(interactionRecords.map(i => i.grant_id))];
      
      // If there are grant IDs, fetch the grants separately
      let grantRecords: any[] = [];
      if (grantIds.length > 0) {
        // Import the service role client
        const { getServiceRoleClient } = await import('../../db/supabaseClient');
        
        // Use the service role client to fetch grants (bypassing RLS)
        const { data: grants } = await getServiceRoleClient()
          .from('grants')
          .select('*')
          .in('id', grantIds);
          
        grantRecords = grants || [];
      }

      return {
        interactions: interactionRecords,
        grants: grantRecords
      };
    } catch (error) {
      logger.error('Error fetching user interactions:', {
        error: error instanceof Error ? error.message : error,
        userId
      });
      throw error;
    }
  }

  /**
   * Record a user interaction
   * @param userId - User ID
   * @param interactionData - Interaction data
   * @returns Recorded interaction
   */
  async recordUserInteraction(supabase: SupabaseClient, userId: string, interactionData: Partial<UserInteraction>): Promise<UserInteraction> {
    try {
      // Create the interaction object with the authenticated user ID
      const interaction = {
        user_id: userId, // Use the userId parameter which comes from the authenticated request
        grant_id: interactionData.grant_id,
        action: interactionData.action,
        notes: interactionData.notes
        // created_at will be auto-generated by the database
      };

      // Manual upsert since database constraint doesn't exist
      // First, check if an interaction already exists for this user/grant combination
      const { data: existingInteraction } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('grant_id', interactionData.grant_id)
        .maybeSingle();

      let result: UserInteraction;

      if (existingInteraction) {
        // Update existing interaction
        const { data: updatedInteraction, error: updateError } = await supabase
          .from('user_interactions')
          .update({
            action: interaction.action,
            notes: interaction.notes
            // timestamp will be auto-updated
          })
          .eq('user_id', userId)
          .eq('grant_id', interactionData.grant_id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
        result = updatedInteraction;
      } else {
        // Insert new interaction
        const { data: newInteraction, error: insertError } = await supabase
          .from('user_interactions')
          .insert(interaction)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }
        result = newInteraction;
      }

      return result;
    } catch (error) {
      logger.error('Error recording user interaction:', {
        error: error instanceof Error ? error.message : error,
        userId,
        grantId: interactionData.grant_id,
        action: interactionData.action
      });
      throw error;
    }
  }
 
  /**
   * Delete a user interaction
   * @param interactionId - Interaction ID
   * @param userId - User ID (for authorization)
   * @returns True if deleted successfully
   */
  async deleteUserInteraction(supabase: SupabaseClient, interactionId: string, userId: string): Promise<boolean> {
    try {
      // Fetch the interaction to verify ownership before deleting
      const { data: interaction, error: fetchError } = await supabase
        .from('user_interactions')
        .select('user_id, grant_id')
        .eq('id', interactionId)
        .single();
 
      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Not found
          throw new Error('Interaction not found');
        }
        throw fetchError;
      }
 
      // Check if the interaction belongs to the authenticated user
      if (interaction.user_id !== userId) {
        logSecurityEvent(userId, 'unauthorized_access', {
          resource: 'interaction',
          resourceId: interactionId,
          action: 'delete'
        });
        throw new Error('You are not authorized to delete this interaction');
      }
 
      // Delete the interaction
      const { error: deleteError } = await supabase
        .from('user_interactions')
        .delete()
        .eq('id', interactionId);
 
      if (deleteError) {
        throw deleteError;
      }
 
      logSecurityEvent(userId, 'interaction_deleted', {
        interactionId,
        grantId: interaction.grant_id
      });
 
      return true;
    } catch (error) {
      logger.error('Error deleting user interaction:', {
        error: error instanceof Error ? error.message : error,
        userId,
        interactionId
      });
      throw error;
    }
  }
 
  /**
   * Delete a user interaction by user ID, grant ID, and action
   * @param userId - User ID
   * @param grantId - Grant ID
   * @param action - Interaction action (e.g., 'saved', 'applied', 'ignored')
   * @returns True if deleted successfully
   */
  async deleteUserInteractionByDetails(supabase: SupabaseClient, userId: string, grantId: string, action: string): Promise<boolean> {
    try {
      const { error: deleteError } = await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', userId)
        .eq('grant_id', grantId)
        .eq('action', action);
 
      if (deleteError) {
        throw deleteError;
      }
 
      logSecurityEvent(userId, 'interaction_deleted_by_details', {
        grantId,
        action
      });
 
      return true;
    } catch (error) {
      logger.error('Error deleting user interaction by details:', {
        error: error instanceof Error ? error.message : error,
        userId,
        grantId,
        action
      });
      throw error;
    }
  }
}
 
// Export a singleton instance
export default new UsersService();