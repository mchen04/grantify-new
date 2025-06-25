import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import grantsRouter from './routes/grants.route';
import usersRouter from './routes/users.route';
import recommendationsRouter from './routes/recommendations.route';
import analyticsRouter from './routes/analytics.route';
import maintenanceRouter from './routes/maintenance';
import logger, { logApiRequest } from './utils/logger';
import { errorHandler, notFoundHandler } from './utils/ErrorHandler';
import { apiLimiter, authLimiter } from './middleware/rate-limit.middleware';
import { generateCSRFToken } from './middleware/csrf.middleware';
import { securityMiddleware, additionalSecurityHeaders } from './middleware/security.middleware';
import { monitorRateLimit } from './middleware/audit.middleware';
import { authMiddleware, requireAdmin } from './middleware/auth.middleware';
import { performanceMiddleware, healthCheckEndpoint, startMemoryMonitoring } from './middleware/performance.middleware';
import config from './config/config';
import path from 'path';
import fs from 'fs';
import apiSyncRouter, { apiScheduler } from './routes/api-sync.route';

// Create Express server
const app = express();
const port = process.env.PORT || 3001;


// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Global exception handlers for production safety
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception - Server will shut down', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection - Server will shut down', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
  
  // Give time for logs to be written
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');
  
  // Stop API scheduler (disabled)
  // if (apiScheduler) {
  //   apiScheduler.stop();
  // }
  
  // Give time for cleanup
  setTimeout(() => {
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Middleware
// Apply CORS with production-ready configuration
app.use(cors(config.server.cors));

// Apply security headers
app.use(securityMiddleware);
app.use(additionalSecurityHeaders);

// Logging
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply rate limiting to all routes
app.use(apiLimiter);
app.use(monitorRateLimit);

// Performance monitoring
app.use(performanceMiddleware);

// Custom request logger
app.use((req, res, next) => {
  logApiRequest(req, res);
  next();
});

// Note: CSRF protection is applied selectively in routes that need it
// after authentication middleware has run


// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Grantify.ai API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', healthCheckEndpoint);

// CSRF token endpoint
app.get('/api/csrf-token', authMiddleware, generateCSRFToken);

// API routes
app.use('/api/grants', grantsRouter);
app.use('/api/users', usersRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/sync', apiSyncRouter);

// Admin routes with stricter rate limiting and authentication
const adminRouter = express.Router();
app.use('/api/admin', authLimiter, adminRouter);

// Admin routes for grants pipeline (protected with proper RBAC)
adminRouter.get('/pipeline/status', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  logger.info('Admin accessed pipeline status', { userId: req.user.id });
  
  res.json({
    message: 'Pipeline status',
    status: 'idle',
    lastRun: null
  });
});

adminRouter.post('/pipeline/run', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  logger.info('Admin triggered pipeline run', { userId: req.user.id });
  
  // This would trigger a manual run of the grants pipeline
  // For now, just return a success message
  res.json({
    message: 'Pipeline run triggered',
    status: 'running'
  });
});

// 404 handler - must be after all routes
app.use('*', notFoundHandler);

// Global error handling middleware - must be last
app.use(errorHandler);

// Start server
app.listen(port, async () => {
  logger.info(`Server running on port ${port}`, {
    environment: process.env.NODE_ENV || 'development',
    port,
    timestamp: new Date().toISOString()
  });
  
  // Start memory monitoring
  startMemoryMonitoring();
  
  // Initialize API scheduler (disabled - not needed for core functionality)
  // try {
  //   await apiScheduler.initialize();
  //   logger.info('API Scheduler initialized successfully');
  // } catch (error) {
  //   logger.error('Failed to initialize API Scheduler', error);
  // }
});

export default app;