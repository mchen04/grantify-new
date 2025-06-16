/**
 * Input validation utilities for type safety and security
 * 
 * This module provides validation without modifying the input data.
 * Supabase uses parameterized queries, so we don't need to sanitize SQL.
 * Instead, we validate data types and formats.
 */

import validator from 'validator';

/**
 * Validate string input
 * @param input - Raw input
 * @param options - Validation options
 * @returns Validated string or throws error
 */
export function validateString(
  input: any, 
  options: {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    required?: boolean;
  } = {}
): string {
  if (input === null || input === undefined) {
    if (options.required) {
      throw new Error('String value is required');
    }
    return '';
  }
  
  if (typeof input !== 'string') {
    throw new Error('Value must be a string');
  }
  
  if (options.minLength && input.length < options.minLength) {
    throw new Error(`String must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength && input.length > options.maxLength) {
    throw new Error(`String must not exceed ${options.maxLength} characters`);
  }
  
  if (options.pattern && !options.pattern.test(input)) {
    throw new Error('String format is invalid');
  }
  
  return input;
}

/**
 * Validate numeric input
 * @param input - Raw input
 * @param options - Validation options
 * @returns Validated number or throws error
 */
export function validateNumber(
  input: any,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  } = {}
): number | undefined {
  if (input === null || input === undefined) {
    if (options.required) {
      throw new Error('Number value is required');
    }
    return undefined;
  }
  
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Value must be a valid number');
  }
  
  if (options.integer && !Number.isInteger(num)) {
    throw new Error('Value must be an integer');
  }
  
  if (options.min !== undefined && num < options.min) {
    throw new Error(`Number must be at least ${options.min}`);
  }
  
  if (options.max !== undefined && num > options.max) {
    throw new Error(`Number must not exceed ${options.max}`);
  }
  
  return num;
}

/**
 * Validate UUID
 * @param input - Raw input
 * @param required - Whether the field is required
 * @returns Validated UUID or throws error
 */
export function validateUUID(input: any, required = false): string | undefined {
  if (!input) {
    if (required) {
      throw new Error('UUID is required');
    }
    return undefined;
  }
  
  const uuid = String(input);
  if (!validator.isUUID(uuid)) {
    throw new Error('Invalid UUID format');
  }
  
  return uuid;
}

/**
 * Validate date
 * @param input - Raw input
 * @param options - Validation options
 * @returns Validated ISO date string or throws error
 */
export function validateDate(
  input: any,
  options: {
    minDate?: Date;
    maxDate?: Date;
    required?: boolean;
  } = {}
): string | undefined {
  if (!input) {
    if (options.required) {
      throw new Error('Date is required');
    }
    return undefined;
  }
  
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (options.minDate && date < options.minDate) {
    throw new Error(`Date must be after ${options.minDate.toISOString()}`);
  }
  
  if (options.maxDate && date > options.maxDate) {
    throw new Error(`Date must be before ${options.maxDate.toISOString()}`);
  }
  
  return date.toISOString();
}

/**
 * Validate array
 * @param input - Raw input
 * @param options - Validation options
 * @returns Validated array or throws error
 */
export function validateArray<T>(
  input: any,
  itemValidator: (item: any) => T,
  options: {
    maxLength?: number;
    minLength?: number;
    required?: boolean;
  } = {}
): T[] {
  if (!input) {
    if (options.required) {
      throw new Error('Array is required');
    }
    return [];
  }
  
  // Handle string input (comma-separated values)
  let arrayInput: any[];
  if (typeof input === 'string') {
    arrayInput = input.split(',').map(item => item.trim()).filter(item => item.length > 0);
  } else if (Array.isArray(input)) {
    arrayInput = input;
  } else {
    throw new Error('Value must be an array or comma-separated string');
  }
  
  if (options.minLength && arrayInput.length < options.minLength) {
    throw new Error(`Array must have at least ${options.minLength} items`);
  }
  
  if (options.maxLength && arrayInput.length > options.maxLength) {
    throw new Error(`Array must not exceed ${options.maxLength} items`);
  }
  
  return arrayInput.map((item, index) => {
    try {
      return itemValidator(item);
    } catch (error) {
      throw new Error(`Invalid array item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * Validate boolean
 * @param input - Raw input
 * @param required - Whether the field is required
 * @returns Boolean value
 */
export function validateBoolean(input: any, required = false): boolean | undefined {
  if (input === null || input === undefined) {
    if (required) {
      throw new Error('Boolean value is required');
    }
    return undefined;
  }
  
  if (typeof input === 'boolean') {
    return input;
  }
  
  if (input === 'true' || input === '1') {
    return true;
  }
  
  if (input === 'false' || input === '0') {
    return false;
  }
  
  throw new Error('Value must be a boolean');
}

/**
 * Validate grant filters
 * @param filters - Raw filters object
 * @returns Validated filters
 */
export function validateGrantFilters(filters: any): any {
  if (!filters || typeof filters !== 'object') {
    return {};
  }
  
  const validated: any = {};
  
  // Text search
  if (filters.search !== undefined) {
    validated.search = validateString(filters.search, { maxLength: 200 });
  }
  
  // Category and agency filters
  if (filters.category !== undefined) {
    validated.category = validateString(filters.category, { maxLength: 100 });
  }
  
  if (filters.agency_name !== undefined) {
    validated.agency_name = validateString(filters.agency_name, { maxLength: 200 });
  }
  
  if (filters.agency_subdivision !== undefined) {
    validated.agency_subdivision = validateString(filters.agency_subdivision, { maxLength: 200 });
  }
  
  // Funding range
  if (filters.funding_min !== undefined) {
    validated.funding_min = validateNumber(filters.funding_min, { min: 0, max: Number.MAX_SAFE_INTEGER });
  }
  
  if (filters.funding_max !== undefined) {
    // Handle the case where frontend sends Number.MAX_SAFE_INTEGER as "no upper limit"
    const fundingMax = validateNumber(filters.funding_max, { min: 0, max: Number.MAX_SAFE_INTEGER });
    // If it's MAX_SAFE_INTEGER, treat it as "no limit" and don't include in query
    if (fundingMax !== undefined && fundingMax < Number.MAX_SAFE_INTEGER) {
      validated.funding_max = fundingMax;
    }
  }
  
  // Validate funding range consistency
  if (validated.funding_min !== undefined && validated.funding_max !== undefined) {
    if (validated.funding_min > validated.funding_max) {
      throw new Error('Funding minimum cannot be greater than funding maximum');
    }
  }
  
  // Arrays with limited size
  if (filters.activity_categories !== undefined) {
    validated.activity_categories = validateArray(
      filters.activity_categories,
      (item) => validateString(item, { maxLength: 100 }),
      { maxLength: 20 }
    );
  }
  
  if (filters.eligible_applicant_types !== undefined) {
    validated.eligible_applicant_types = validateArray(
      filters.eligible_applicant_types,
      (item) => validateString(item, { maxLength: 100 }),
      { maxLength: 20 }
    );
  }
  
  if (filters.keywords !== undefined) {
    validated.keywords = validateArray(
      filters.keywords,
      (item) => validateString(item, { maxLength: 50 }),
      { maxLength: 10 }
    );
  }
  
  // Grant type and status
  if (filters.grant_type !== undefined) {
    validated.grant_type = validateString(filters.grant_type, { maxLength: 50 });
  }
  
  // Grant types array (for frontend compatibility)
  if (filters.grant_types !== undefined) {
    validated.grant_types = validateArray(
      filters.grant_types,
      (item) => validateString(item, { maxLength: 100 }),
      { maxLength: 10 }
    );
  }
  
  // Agencies array
  if (filters.agencies !== undefined) {
    validated.agencies = validateArray(
      filters.agencies,
      (item) => validateString(item, { maxLength: 200 }),
      { maxLength: 5 }
    );
  }
  
  // Status filter removed - no longer filtering by status to show all grants
  // if (filters.status !== undefined) {
  //   validated.status = validateString(filters.status, { maxLength: 50 });
  // }
  
  // Pagination
  if (filters.page !== undefined) {
    validated.page = validateNumber(filters.page, { min: 1, max: 1000, integer: true });
  }
  
  if (filters.limit !== undefined) {
    validated.limit = validateNumber(filters.limit, { min: 1, max: 100, integer: true });
  }
  
  // Date filters
  if (filters.deadline_min !== undefined) {
    validated.deadline_min = validateDate(filters.deadline_min);
  }
  
  if (filters.deadline_max !== undefined) {
    validated.deadline_max = validateDate(filters.deadline_max);
  }
  
  // Validate deadline range consistency
  if (validated.deadline_min && validated.deadline_max) {
    const minDate = new Date(validated.deadline_min);
    const maxDate = new Date(validated.deadline_max);
    if (minDate > maxDate) {
      throw new Error('Deadline minimum cannot be later than deadline maximum');
    }
  }
  
  // Boolean filters
  if (filters.deadline_null !== undefined) {
    validated.deadline_null = validateBoolean(filters.deadline_null);
  }
  
  if (filters.include_no_deadline !== undefined) {
    validated.include_no_deadline = validateBoolean(filters.include_no_deadline);
  }
  
  if (filters.funding_null !== undefined) {
    validated.funding_null = validateBoolean(filters.funding_null);
  }
  
  if (filters.include_no_funding !== undefined) {
    validated.include_no_funding = validateBoolean(filters.include_no_funding);
  }
  
  // UUIDs
  if (filters.exclude_id !== undefined) {
    validated.exclude_id = validateUUID(filters.exclude_id);
  }
  
  if (filters.user_id !== undefined) {
    validated.user_id = validateUUID(filters.user_id);
  }
  
  // Interaction types enum
  if (filters.exclude_interaction_types !== undefined) {
    const validTypes = ['saved', 'applied', 'ignored'];
    validated.exclude_interaction_types = validateArray(
      filters.exclude_interaction_types,
      (item) => {
        const type = validateString(item, { maxLength: 20 });
        if (!validTypes.includes(type)) {
          throw new Error(`Invalid interaction type: ${type}`);
        }
        return type;
      },
      { maxLength: 3 }
    );
  }
  
  // Data sources filter
  if (filters.data_sources !== undefined) {
    validated.data_sources = validateArray(
      filters.data_sources,
      (item) => validateString(item, { maxLength: 50 }),
      { maxLength: 10 }
    );
  }
  
  // Show overdue grants filter
  if (filters.show_overdue !== undefined) {
    validated.show_overdue = validateBoolean(filters.show_overdue);
  }
  
  // Boolean filters for grant characteristics
  if (filters.cost_sharing !== undefined) {
    validated.cost_sharing = validateBoolean(filters.cost_sharing);
  }
  
  if (filters.clinical_trial_allowed !== undefined) {
    validated.clinical_trial_allowed = validateBoolean(filters.clinical_trial_allowed);
  }
  
  // Sort parameters
  if (filters.sort_by !== undefined) {
    const validSortOptions = [
      'relevance',
      'recent',
      'deadline',
      'deadline_latest',
      'amount',
      'amount_asc',
      'title_asc',
      'title_desc'
    ];
    const sortBy = validateString(filters.sort_by, { maxLength: 20 });
    if (!validSortOptions.includes(sortBy)) {
      throw new Error(`Invalid sort_by option: ${sortBy}`);
    }
    validated.sort_by = sortBy;
  }
  
  return validated;
}

