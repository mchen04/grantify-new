import crypto from 'crypto';
import { getServiceRoleClient } from '../../db/supabaseClient';
import logger from '../../utils/logger';

interface CSRFToken {
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Service for managing CSRF tokens with database persistence
 */
class CSRFService {
  private readonly TOKEN_EXPIRY_MS = 3600000; // 1 hour
  private readonly TOKEN_LENGTH = 32;

  /**
   * Generate a new CSRF token for a user
   */
  async generateToken(userId: string): Promise<string> {
    try {
      // Generate new token
      const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
      const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);

      // Use upsert to handle existing tokens
      const serviceClient = getServiceRoleClient();
      const { error } = await serviceClient
        .from('csrf_tokens')
        .upsert({
          user_id: userId,
          token: this.hashToken(token),
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Failed to store CSRF token', { error, userId });
        throw new Error('Failed to generate CSRF token');
      }

      return token;
    } catch (error) {
      logger.error('Error generating CSRF token', { error, userId });
      throw error;
    }
  }

  /**
   * Validate a CSRF token
   */
  async validateToken(userId: string, token: string): Promise<boolean> {
    try {
      const hashedToken = this.hashToken(token);
      
      // Get token from database using service role client
      const serviceClient = getServiceRoleClient();
      const { data, error } = await serviceClient
        .from('csrf_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('token', hashedToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return false;
      }

      // Token is valid
      return true;
    } catch (error) {
      logger.error('Error validating CSRF token', { error, userId });
      return false;
    }
  }

  /**
   * Delete all tokens for a user
   */
  async deleteUserTokens(userId: string): Promise<void> {
    try {
      const serviceClient = getServiceRoleClient();
      const { error } = await serviceClient
        .from('csrf_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete user CSRF tokens', { error, userId });
      }
    } catch (error) {
      logger.error('Error deleting user CSRF tokens', { error, userId });
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const serviceClient = getServiceRoleClient();
      const { error } = await serviceClient
        .from('csrf_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error('Failed to cleanup expired CSRF tokens', { error });
      }
    } catch (error) {
      logger.error('Error cleaning up expired CSRF tokens', { error });
    }
  }

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * Initialize cleanup job
   */
  startCleanupJob(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredTokens().catch(error => {
        logger.error('CSRF cleanup job failed', { error });
      });
    }, 3600000); // 1 hour

    // Run initial cleanup
    this.cleanupExpiredTokens().catch(error => {
      logger.error('Initial CSRF cleanup failed', { error });
    });
  }
}

export default new CSRFService();