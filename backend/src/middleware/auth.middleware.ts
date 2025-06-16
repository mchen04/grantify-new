import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import logger, { logSecurityEvent } from '../utils/logger'; // Import the logger
 
 // Extend Express Request type to include user
 declare global {
   namespace Express {
     interface Request {
       user?: any;
       session?: any; // Add session object
       accessToken?: string; // Add access token string
       supabase?: any; // Add user-authenticated supabase client to request
     }
   }
 }
 
 const supabaseUrl = process.env.SUPABASE_URL!;
 const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
 const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

 // Simple in-memory cache for authentication tokens
 interface CachedAuth {
   user: any;
   timestamp: number;
 }

 const authCache = new Map<string, CachedAuth>();
 const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

 // Clean expired cache entries periodically
 setInterval(() => {
   const now = Date.now();
   for (const [token, cached] of authCache.entries()) {
     if (now - cached.timestamp > AUTH_CACHE_TTL) {
       authCache.delete(token);
     }
   }
 }, 60 * 1000); // Clean every minute
 
 /**
  * Middleware to verify Supabase JWT tokens, extract user information,
  * and create a user-authenticated Supabase client instance
  * This ensures that all protected routes have access to the authenticated user
  */
 export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
   try {
     const authHeader = req.headers.authorization;
     
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
     }
     
     const token = authHeader.split(' ')[1];
 
     logger.debug('Token received for validation'); // Don't log actual token content
 
     // Check cache first
     const cached = authCache.get(token);
     const now = Date.now();
     
     let userData;
     if (cached && (now - cached.timestamp) < AUTH_CACHE_TTL) {
       // Use cached user data
       userData = { data: { user: cached.user }, error: null };
       logger.debug('Using cached authentication data');
     } else {
       // Create a temporary client with the service key to verify the token
       const tempSupabase = createClient(supabaseUrl, supabaseServiceKey);
       userData = await tempSupabase.auth.getUser(token);
       
       logger.debug('Supabase auth.getUser completed', { hasUser: !!userData.data?.user, hasError: !!userData.error });
       
       // Cache valid user data
       if (!userData.error && userData.data.user) {
         authCache.set(token, {
           user: userData.data.user,
           timestamp: now
         });
       }
     }
 
     if (userData.error || !userData.data.user) {
       logger.error('Token validation failed in authMiddleware', { 
         error: userData.error?.message,
         errorCode: userData.error?.code,
         errorStatus: userData.error?.status
       });
       return res.status(401).json({ message: 'Unauthorized: Invalid token' });
     }
     
     // Log successful authentication without PII
     logger.debug('User authenticated successfully', {
       userId: userData.data.user.id,
       provider: userData.data.user.app_metadata?.provider || 'email'
      });


     // Add user and access token to request object
     req.user = userData.data.user;
     req.accessToken = token; // Attach the access token directly

     // Create a new Supabase client instance with the user's access token
     // IMPORTANT: Do NOT use the service key here. The client should operate with the user's privileges.
     req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
       auth: {
         persistSession: false,
       },
       global: {
         headers: {
           Authorization: `Bearer ${token}`,
         },
       },
     });
     
     // For OAuth users, ensure they have proper database records
     if (userData.data.user.app_metadata?.provider === 'google') {
       logger.debug('Google OAuth user detected', { userId: userData.data.user.id });
     }

     next();
   } catch (error) {
     logger.error('Auth middleware error:', error instanceof Error ? error.message : error);
     res.status(500).json({ message: 'Internal server error' });
   }
 };
 
 /**
  * Middleware to verify that the authenticated user matches the requested user ID
  * This prevents users from accessing or modifying other users' data
  */
 export const authorizeUserMiddleware = (req: Request, res: Response, next: NextFunction) => {
   const requestedUserId = req.params.userId || req.query.userId || req.body.userId;
   
   if (!req.user) {
     return res.status(401).json({ message: 'Unauthorized: Authentication required' });
   }
   
   if (requestedUserId && req.user.id !== requestedUserId) {
     return res.status(403).json({ message: 'Forbidden: You can only access your own data' });
   }
   
   next();
 };

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (requiredRole: 'admin' | 'moderator' | 'user') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    if (!req.supabase) {
      return res.status(500).json({ message: 'Internal server error: Database client not initialized' });
    }

    try {
      // Check if user has the required role
      const { data: hasRole, error } = await req.supabase
        .rpc('has_role', {
          check_user_id: req.user.id,
          check_role: requiredRole
        });

      if (error) {
        logger.error('Error checking user role:', error);
        return res.status(500).json({ message: 'Error checking permissions' });
      }

      if (!hasRole) {
        // Log unauthorized access attempt
        logSecurityEvent(req.user.id, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
          requiredRole,
          endpoint: req.originalUrl,
          method: req.method
        });
        return res.status(403).json({ message: `Forbidden: ${requiredRole} role required` });
      }

      next();
    } catch (error) {
      logger.error('Error in role check middleware:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
};

/**
 * Middleware specifically for admin routes
 */
export const requireAdmin = requireRole('admin');

