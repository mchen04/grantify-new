import winston from 'winston';
import 'dotenv/config';

/**
 * Custom logger configuration using Winston
 * Provides structured logging with different levels based on environment
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'grantify-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 50000000, // 50MB
      maxFiles: 5,
      tailable: true
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 50000000, // 50MB
      maxFiles: 10,
      tailable: true
    }),
  ]
});

// If we're not in production, also log to the console with colorized output
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log security-related events
 * @param userId - The ID of the user involved (if applicable)
 * @param action - The action being performed
 * @param details - Additional details about the event
 */
export const logSecurityEvent = (userId: string | null, action: string, details: any) => {
  logger.info('Security event', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log API requests
 * @param req - Express request object
 * @param res - Express response object
 */
export const logApiRequest = (req: any, res: any) => {
  const { method, originalUrl, ip, headers, body } = req;
  
  // Don't log sensitive information like passwords
  const sanitizedBody = { ...body };
  if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
  if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[REDACTED]';
  
  logger.debug('API Request', {
    method,
    url: originalUrl,
    ip,
    userAgent: headers['user-agent'],
    body: sanitizedBody,
    timestamp: new Date().toISOString()
  });
};

export default logger;