import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // Filter out certain errors
  beforeSend(event, hint) {
    // Filter out network errors
    if (hint.originalException && hint.originalException instanceof Error) {
      const error = hint.originalException;
      
      // Don't send cancelled requests
      if (error.name === 'AbortError') {
        return null;
      }
      
      // Don't send network timeouts
      if (error.message?.includes('NetworkError') || error.message?.includes('Failed to fetch')) {
        return null;
      }
    }
    
    // Remove sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    
    return event;
  },
  
  // Ignore certain transactions
  ignoreTransactions: ['/health', '/_next', '/api/health'],
});