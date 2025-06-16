import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response structure
 */
interface ErrorResponse {
  message: string;
  error?: {
    code?: string;
    details?: any;
  };
}

/**
 * Map of safe error messages for production
 */
const SAFE_ERROR_MESSAGES: { [key: string]: string } = {
  'ValidationError': 'Invalid input data provided',
  'CastError': 'Invalid data format',
  'MongoError': 'Database operation failed',
  'JsonWebTokenError': 'Authentication failed',
  'TokenExpiredError': 'Session expired, please login again',
  'MulterError': 'File upload failed',
  'SyntaxError': 'Invalid request format'
};

/**
 * Send error response in production
 */
const sendErrorProd = (err: AppError, req: Request, res: Response): void => {
  // Log full error details server-side
  logger.error('Production error', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    userAgent: req.get('user-agent')
  });

  // Operational, trusted error: send safe message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: 'Request Failed',
      message: err.message,
      statusCode: err.statusCode
    });
  } else {
    // Programming or other unknown error: send generic message
    const safeMessage = SAFE_ERROR_MESSAGES[err.name] || 'An unexpected error occurred';
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: safeMessage,
      statusCode: 500
    });
  }
};

/**
 * Send error response in development
 */
const sendErrorDev = (err: AppError, req: Request, res: Response): void => {
  const { statusCode, message, stack, code, isOperational, name } = err;
  
  // Log error in development too
  logger.error('Development error', {
    message,
    statusCode,
    stack,
    code,
    name,
    path: req.path,
    method: req.method
  });
  
  res.status(statusCode).json({
    error: name || 'Error',
    message,
    statusCode,
    details: {
      status: statusCode.toString().startsWith('4') ? 'fail' : 'error',
      stack,
      code,
      isOperational,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

/**
 * Handle database constraint errors
 */
const handleDBConstraintError = (err: any): AppError => {
  // Don't expose database structure in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'This operation violates data integrity rules'
    : `Database constraint violation: ${err.detail || err.message}`;
  return new AppError(message, 409, true, 'CONSTRAINT_ERROR');
};

/**
 * Handle database connection errors
 */
const handleDBConnectionError = (): AppError => {
  const message = 'Service temporarily unavailable. Please try again later';
  return new AppError(message, 503, false, 'DB_CONNECTION_ERROR');
};

/**
 * Handle JWT errors
 */
const handleJWTError = (): AppError =>
  new AppError('Authentication failed. Please log in again', 401, true, 'JWT_ERROR');

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = (): AppError =>
  new AppError('Your session has expired. Please log in again', 401, true, 'JWT_EXPIRED');

/**
 * Handle validation errors
 */
const handleValidationError = (err: any): AppError => {
  if (process.env.NODE_ENV === 'production') {
    // Generic message in production
    return new AppError('Invalid input data', 400, true, 'VALIDATION_ERROR');
  }
  
  // Detailed errors in development
  const errors = err.errors 
    ? Object.values(err.errors).map((el: any) => el.message)
    : [err.message];
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, true, 'VALIDATION_ERROR');
};

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error('Error handler caught:', {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Handle specific error types
  if (error.code === '23505') error = handleDBConstraintError(error);
  if (error.code === '23503') error = handleDBConstraintError(error); // Foreign key violation
  if (error.code === '23502') error = handleDBConstraintError(error); // Not null violation
  if (error.code === 'ECONNREFUSED') error = handleDBConnectionError();
  if (error.code === 'ETIMEDOUT') error = handleDBConnectionError();
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.name === 'CastError') error = handleValidationError(error);
  if (error.type === 'entity.parse.failed') {
    error = new AppError('Invalid JSON in request body', 400, true, 'PARSE_ERROR');
  }

  // Convert non-AppError errors to AppError
  if (!(error instanceof AppError)) {
    const appError = new AppError(
      error.message || 'Unknown error occurred',
      error.statusCode || 500,
      false
    );
    appError.stack = error.stack;
    appError.name = error.name;
    error = appError;
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, req, res);
  } else {
    sendErrorDev(error, req, res);
  }
};

/**
 * Handle async route errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const message = process.env.NODE_ENV === 'production'
    ? 'Resource not found'
    : `Can't find ${req.originalUrl} on this server`;
    
  res.status(404).json({
    error: 'Not Found',
    message,
    statusCode: 404
  });
};

