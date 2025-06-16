import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import logger from '../../utils/logger';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
}

export function initializeSentry(app: Express, config?: SentryConfig): void {
  const dsn = config?.dsn || process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.warn('Sentry DSN not provided - monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      integrations: [
        // Express integration
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        // Profiling integration
        nodeProfilingIntegration(),
        // Additional integrations
        Sentry.requestDataIntegration({
          include: {
            data: true,
            headers: true,
            query_string: true,
            url: true,
          },
        }),
        Sentry.consoleIntegration(),
        Sentry.linkedErrorsIntegration(),
      ],
      
      // Environment configuration
      environment: config?.environment || process.env.NODE_ENV || 'development',
      release: config?.release || process.env.APP_VERSION || 'unknown',
      
      // Performance monitoring
      tracesSampleRate: config?.tracesSampleRate ?? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: config?.profilesSampleRate ?? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      
      // Error sampling
      sampleRate: config?.sampleRate ?? parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
      
      // Additional options
      debug: config?.debug || process.env.SENTRY_DEBUG === 'true',
      attachStacktrace: true,
      
      // Before send hook for filtering
      beforeSend(event, hint) {
        // Filter out specific errors
        if (hint.originalException) {
          const error = hint.originalException as Error;
          
          // Don't send validation errors
          if (error.name === 'ValidationError') {
            return null;
          }
          
          // Don't send 404 errors
          if (error.message?.includes('Not Found')) {
            return null;
          }
        }
        
        // Remove sensitive data
        if (event.request) {
          // Remove authorization headers
          if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-api-key'];
          }
          
          // Remove sensitive body data
          if (event.request.data && typeof event.request.data === 'object') {
            const data = event.request.data as Record<string, any>;
            const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
            sensitiveFields.forEach(field => {
              if (field in data) {
                data[field] = '[REDACTED]';
              }
            });
          }
        }
        
        return event;
      },
      
      // Before send transaction hook
      beforeSendTransaction(transaction) {
        // Filter out health check transactions
        if (transaction.transaction_info?.source === 'url' && 
            transaction.transaction?.includes('/health')) {
          return null;
        }
        
        return transaction;
      },
    });

    logger.info('Sentry initialized successfully', {
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', error);
  }
}

// Custom error context enrichment
export function setSentryUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}

// Add custom context
export function addSentryContext(key: string, context: Record<string, any>): void {
  Sentry.setContext(key, context);
}

// Add breadcrumb
export function addSentryBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

// Capture custom events
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('additional', context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

// Performance monitoring - using startSpan in v9
export function startTransaction(name: string, op: string): any {
  return Sentry.startSpan({
    name,
    op,
  }, () => {
    // Span callback - actual work would go here
  });
}

// Export Sentry for advanced usage
export { Sentry };