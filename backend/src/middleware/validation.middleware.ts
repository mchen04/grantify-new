import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Validation errors detected
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: errors.array(),
      debug: true 
    });
  }
  next();
};

/**
 * Validation rules for user preferences
 */
export const userPreferencesValidation = [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.project_description_query').optional({ nullable: true }).isString().withMessage('Project description must be a string'),
  body('preferences.funding_min').optional({ nullable: true }).isNumeric().withMessage('Funding minimum must be a number'),
  body('preferences.funding_max').optional({ nullable: true }).isNumeric().withMessage('Funding maximum must be a number'),
  body('preferences.agencies').optional({ nullable: true }).isArray().withMessage('Agencies must be an array'),
  body('preferences.deadline_range').optional({ nullable: true }).isString().withMessage('Deadline range must be a string'),
  body('preferences.project_period_min_years').optional({ nullable: true }).isNumeric().withMessage('Project period minimum must be a number'),
  body('preferences.project_period_max_years').optional({ nullable: true }).isNumeric().withMessage('Project period maximum must be a number'),
  validateRequest
];

/**
 * Validation rules for user interactions
 */
export const userInteractionValidation = [
  body('grant_id').isUUID().withMessage('Grant ID must be a valid UUID'),
  body('action').isIn(['saved', 'applied', 'ignored']).withMessage('Action must be one of: saved, applied, ignored'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validateRequest
];

/**
 * Validation rules for grant filters
 */
export const grantFilterValidation = [
  query('search').optional().isString().withMessage('Search must be a string'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('agency_name').optional().isString().withMessage('Agency name must be a string'),
  query('funding_min').optional().isInt({ min: 0 }).withMessage('Funding minimum must be a positive integer'),
  query('funding_max').optional().isInt({ min: 0 }).withMessage('Funding maximum must be a positive integer'),
  query('funding_min').optional().custom((value, { req }) => {
    if (req.query?.funding_max && parseInt(value) > parseInt(req.query.funding_max as string)) {
      throw new Error('Funding minimum cannot be greater than funding maximum');
    }
    return true;
  }),
  query('activity_categories').optional().isString().withMessage('Activity categories must be a comma-separated string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validateRequest
];

