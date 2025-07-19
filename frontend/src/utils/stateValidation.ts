/**
 * State validation utilities to prevent race conditions and ensure data consistency
 * Provides validation, sanitization, and state integrity checks
 */

export interface StateValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: StateValidationError[];
  warnings: StateValidationError[];
  sanitizedValue?: any;
}

/**
 * Base validator interface
 */
export interface StateValidator<T> {
  validate: (value: T, context?: any) => ValidationResult;
  sanitize?: (value: T) => T;
  dependencies?: string[];
}

/**
 * Interaction status validator
 */
export const interactionStatusValidator: StateValidator<string> = {
  validate: (value: string): ValidationResult => {
    const validStatuses = ['saved', 'applied', 'ignored'];
    const errors: StateValidationError[] = [];
    const warnings: StateValidationError[] = [];

    if (!value) {
      errors.push({
        field: 'interactionStatus',
        message: 'Interaction status is required',
        code: 'REQUIRED',
        severity: 'error'
      });
    } else if (!validStatuses.includes(value)) {
      errors.push({
        field: 'interactionStatus',
        message: `Invalid interaction status: ${value}. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: validStatuses.includes(value) ? value : undefined
    };
  },

  sanitize: (value: string): string => {
    return value?.trim()?.toLowerCase() || '';
  }
};

/**
 * Grant ID validator
 */
export const grantIdValidator: StateValidator<string> = {
  validate: (value: string): ValidationResult => {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationError[] = [];

    if (!value) {
      errors.push({
        field: 'grantId',
        message: 'Grant ID is required',
        code: 'REQUIRED',
        severity: 'error'
      });
    } else if (typeof value !== 'string') {
      errors.push({
        field: 'grantId',
        message: 'Grant ID must be a string',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (value.length < 3) {
      errors.push({
        field: 'grantId',
        message: 'Grant ID must be at least 3 characters long',
        code: 'TOO_SHORT',
        severity: 'error'
      });
    } else if (value.length > 50) {
      warnings.push({
        field: 'grantId',
        message: 'Grant ID is unusually long',
        code: 'UNUSUALLY_LONG',
        severity: 'warning'
      });
    }

    // Check for potentially unsafe characters
    if (value && !/^[a-zA-Z0-9\-_]+$/.test(value)) {
      warnings.push({
        field: 'grantId',
        message: 'Grant ID contains special characters',
        code: 'SPECIAL_CHARACTERS',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: errors.length === 0 ? value : undefined
    };
  },

  sanitize: (value: string): string => {
    return value?.trim() || '';
  }
};

/**
 * Interactions map validator
 */
export const interactionsMapValidator: StateValidator<Record<string, string>> = {
  validate: (value: Record<string, string>): ValidationResult => {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationError[] = [];

    if (!value || typeof value !== 'object') {
      errors.push({
        field: 'interactionsMap',
        message: 'Interactions map must be an object',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    const sanitizedMap: Record<string, string> = {};
    let hasValidEntries = false;

    for (const [grantId, status] of Object.entries(value)) {
      // Validate grant ID
      const grantIdResult = grantIdValidator.validate(grantId);
      if (!grantIdResult.isValid) {
        errors.push(...grantIdResult.errors.map(err => ({
          ...err,
          field: `interactionsMap.${grantId}`,
          message: `Invalid grant ID in interactions map: ${err.message}`
        })));
        continue;
      }

      // Validate interaction status
      const statusResult = interactionStatusValidator.validate(status);
      if (!statusResult.isValid) {
        errors.push(...statusResult.errors.map(err => ({
          ...err,
          field: `interactionsMap.${grantId}`,
          message: `Invalid status for grant ${grantId}: ${err.message}`
        })));
        continue;
      }

      // Add to sanitized map if valid
      if (grantIdResult.sanitizedValue && statusResult.sanitizedValue) {
        sanitizedMap[grantIdResult.sanitizedValue] = statusResult.sanitizedValue;
        hasValidEntries = true;
      }
    }

    // Warn about large maps that might cause performance issues
    const entryCount = Object.keys(sanitizedMap).length;
    if (entryCount > 1000) {
      warnings.push({
        field: 'interactionsMap',
        message: `Large interactions map (${entryCount} entries) may cause performance issues`,
        code: 'LARGE_MAP',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: hasValidEntries ? sanitizedMap : {}
    };
  },

  sanitize: (value: Record<string, string>): Record<string, string> => {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const sanitized: Record<string, string> = {};
    for (const [grantId, status] of Object.entries(value)) {
      const cleanGrantId = grantIdValidator.sanitize?.(grantId) || grantId;
      const cleanStatus = interactionStatusValidator.sanitize?.(status) || status;
      
      if (cleanGrantId && cleanStatus) {
        sanitized[cleanGrantId] = cleanStatus;
      }
    }

    return sanitized;
  }
};

/**
 * Timestamp validator
 */
export const timestampValidator: StateValidator<number> = {
  validate: (value: number): ValidationResult => {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationError[] = [];

    if (value === undefined || value === null) {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp is required',
        code: 'REQUIRED',
        severity: 'error'
      });
    } else if (typeof value !== 'number') {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp must be a number',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    } else if (!Number.isInteger(value) || value < 0) {
      errors.push({
        field: 'timestamp',
        message: 'Timestamp must be a positive integer',
        code: 'INVALID_VALUE',
        severity: 'error'
      });
    } else {
      // Check if timestamp is reasonable (not too far in past or future)
      const now = Date.now();
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
      const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

      if (value < oneYearAgo) {
        warnings.push({
          field: 'timestamp',
          message: 'Timestamp is more than a year old',
          code: 'OLD_TIMESTAMP',
          severity: 'warning'
        });
      } else if (value > oneYearFromNow) {
        warnings.push({
          field: 'timestamp',
          message: 'Timestamp is more than a year in the future',
          code: 'FUTURE_TIMESTAMP',
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: errors.length === 0 ? value : Date.now()
    };
  },

  sanitize: (value: number): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      return Date.now();
    }
    return value;
  }
};

/**
 * Composite validator for interaction state
 */
export const interactionStateValidator: StateValidator<{
  interactionsMap: Record<string, string>;
  lastInteractionTimestamp: number;
  error: string | null;
}> = {
  validate: (value): ValidationResult => {
    const errors: StateValidationError[] = [];
    const warnings: StateValidationError[] = [];

    if (!value || typeof value !== 'object') {
      errors.push({
        field: 'interactionState',
        message: 'Interaction state must be an object',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate interactions map
    const mapResult = interactionsMapValidator.validate(value.interactionsMap);
    errors.push(...mapResult.errors);
    warnings.push(...mapResult.warnings);

    // Validate timestamp
    const timestampResult = timestampValidator.validate(value.lastInteractionTimestamp);
    errors.push(...timestampResult.errors);
    warnings.push(...timestampResult.warnings);

    // Validate error field
    if (value.error !== null && typeof value.error !== 'string') {
      errors.push({
        field: 'interactionState.error',
        message: 'Error field must be null or string',
        code: 'INVALID_TYPE',
        severity: 'error'
      });
    }

    const sanitizedValue = errors.length === 0 ? {
      interactionsMap: mapResult.sanitizedValue || {},
      lastInteractionTimestamp: timestampResult.sanitizedValue || Date.now(),
      error: value.error
    } : undefined;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue
    };
  },

  sanitize: (value): any => {
    if (!value || typeof value !== 'object') {
      return {
        interactionsMap: {},
        lastInteractionTimestamp: Date.now(),
        error: null
      };
    }

    return {
      interactionsMap: interactionsMapValidator.sanitize?.(value.interactionsMap) || {},
      lastInteractionTimestamp: timestampValidator.sanitize?.(value.lastInteractionTimestamp) || Date.now(),
      error: typeof value.error === 'string' ? value.error : null
    };
  },

  dependencies: ['interactionsMap', 'lastInteractionTimestamp']
};

/**
 * State validation coordinator
 */
export class StateValidationCoordinator {
  private validators: Map<string, StateValidator<any>> = new Map();
  private validationHistory: Array<{
    field: string;
    timestamp: number;
    result: ValidationResult;
  }> = [];

  constructor() {
    // Register default validators
    this.registerValidator('interactionStatus', interactionStatusValidator);
    this.registerValidator('grantId', grantIdValidator);
    this.registerValidator('interactionsMap', interactionsMapValidator);
    this.registerValidator('timestamp', timestampValidator);
    this.registerValidator('interactionState', interactionStateValidator);
  }

  /**
   * Register a validator for a specific field
   */
  registerValidator<T>(field: string, validator: StateValidator<T>): void {
    this.validators.set(field, validator);
  }

  /**
   * Validate a single field
   */
  validateField(field: string, value: any, context?: any): ValidationResult {
    const validator = this.validators.get(field);
    if (!validator) {
      return {
        isValid: false,
        errors: [{
          field,
          message: `No validator found for field: ${field}`,
          code: 'NO_VALIDATOR',
          severity: 'error'
        }],
        warnings: []
      };
    }

    const result = validator.validate(value, context);
    
    // Store validation history (keep last 100 entries)
    this.validationHistory.push({
      field,
      timestamp: Date.now(),
      result
    });
    
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }

    return result;
  }

  /**
   * Validate an entire object
   */
  validateObject(obj: Record<string, any>, fields?: string[]): ValidationResult {
    const fieldsToValidate = fields || Object.keys(obj);
    const allErrors: StateValidationError[] = [];
    const allWarnings: StateValidationError[] = [];
    const sanitizedObj: Record<string, any> = {};

    let isValid = true;

    for (const field of fieldsToValidate) {
      if (obj.hasOwnProperty(field)) {
        const result = this.validateField(field, obj[field]);
        
        if (!result.isValid) {
          isValid = false;
        }
        
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        
        if (result.sanitizedValue !== undefined) {
          sanitizedObj[field] = result.sanitizedValue;
        }
      }
    }

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      sanitizedValue: isValid ? sanitizedObj : undefined
    };
  }

  /**
   * Get validation history for debugging
   */
  getValidationHistory(field?: string, limit: number = 10): Array<{
    field: string;
    timestamp: number;
    result: ValidationResult;
  }> {
    let history = this.validationHistory;
    
    if (field) {
      history = history.filter(entry => entry.field === field);
    }
    
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory = [];
  }
}

// Export singleton instance
export const stateValidationCoordinator = new StateValidationCoordinator();