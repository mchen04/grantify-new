import validator from 'validator';

// Type definitions for validation options
interface StringOptions {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  regex?: RegExp;
}

interface NumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  required?: boolean;
}

interface DateOptions {
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
}

/**
 * Sanitize and validate string input
 * @param input - Raw input string
 * @param options - Validation options
 * @returns Sanitized string or throws error
 */
export function validateString(input: any, options: StringOptions = {}): string | undefined {
  if (!input) {
    if (options.required) {
      throw new Error('Field is required');
    }
    return undefined;
  }
  
  // Convert to string and trim
  const str = String(input).trim();
  
  if (str.length === 0) {
    if (options.required) {
      throw new Error('Field cannot be empty');
    }
    return undefined;
  }
  
  // Check length constraints
  if (options.minLength && str.length < options.minLength) {
    throw new Error(`Must be at least ${options.minLength} characters`);
  }
  
  if (options.maxLength && str.length > options.maxLength) {
    throw new Error(`Must not exceed ${options.maxLength} characters`);
  }
  
  // Check regex pattern if provided
  if (options.regex && !options.regex.test(str)) {
    throw new Error('Invalid format');
  }
  
  // Escape HTML to prevent XSS
  return validator.escape(str);
}

/**
 * Validate email
 * @param email - Email string
 * @param required - Whether email is required
 * @returns Normalized email or throws error
 */
export function validateEmail(email: any, required = false): string | undefined {
  if (!email) {
    if (required) {
      throw new Error('Email is required');
    }
    return undefined;
  }
  
  const normalized = validator.normalizeEmail(String(email));
  if (!normalized || !validator.isEmail(normalized)) {
    throw new Error('Invalid email format');
  }
  
  return normalized;
}

/**
 * Validate UUID
 * @param uuid - UUID string
 * @param required - Whether UUID is required
 * @returns Validated UUID or throws error
 */
export function validateUUID(uuid: any, required = false): string | undefined {
  if (!uuid) {
    if (required) {
      throw new Error('UUID is required');
    }
    return undefined;
  }
  
  const uuidStr = String(uuid).trim();
  if (!validator.isUUID(uuidStr)) {
    throw new Error('Invalid UUID format');
  }
  
  return uuidStr;
}

/**
 * Validate number
 * @param input - Raw input
 * @param options - Validation options
 * @returns Validated number or throws error
 */
export function validateNumber(input: any, options: NumberOptions = {}): number | undefined {
  if (input === null || input === undefined || input === '') {
    if (options.required) {
      throw new Error('Number is required');
    }
    return undefined;
  }
  
  const num = Number(input);
  if (isNaN(num)) {
    throw new Error('Must be a valid number');
  }
  
  if (options.integer && !Number.isInteger(num)) {
    throw new Error('Must be an integer');
  }
  
  if (options.min !== undefined && num < options.min) {
    throw new Error(`Must be at least ${options.min}`);
  }
  
  if (options.max !== undefined && num > options.max) {
    throw new Error(`Must not exceed ${options.max}`);
  }
  
  return num;
}

/**
 * Validate date
 * @param input - Raw input
 * @param options - Validation options
 * @returns ISO date string or throws error
 */
export function validateDate(input: any, options: DateOptions = {}): string | undefined {
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
  
  // Handle string representations
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false;
    }
    throw new Error('Invalid boolean value');
  }
  
  return Boolean(input);
}

/**
 * Validate grant filters with the new schema
 * @param filters - Raw filter object
 * @returns Validated filters object
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
  
  // Organization filter (new field name)
  if (filters.funding_organization_name !== undefined) {
    validated.funding_organization_name = validateString(filters.funding_organization_name, { maxLength: 255 });
  }
  
  // Legacy support for agency_name (map to funding_organization_name)
  if (filters.agency_name !== undefined && filters.funding_organization_name === undefined) {
    validated.funding_organization_name = validateString(filters.agency_name, { maxLength: 255 });
  }
  
  // Funding range
  if (filters.funding_min !== undefined) {
    validated.funding_min = validateNumber(filters.funding_min, { min: 0, max: Number.MAX_SAFE_INTEGER });
  }
  
  if (filters.funding_max !== undefined) {
    const fundingMax = validateNumber(filters.funding_max, { min: 0, max: Number.MAX_SAFE_INTEGER });
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
  
  // Date filters
  if (filters.posted_date_start !== undefined) {
    validated.posted_date_start = validateDate(filters.posted_date_start);
  }
  
  if (filters.posted_date_end !== undefined) {
    validated.posted_date_end = validateDate(filters.posted_date_end);
  }
  
  if (filters.deadline_start !== undefined) {
    validated.deadline_start = validateDate(filters.deadline_start);
  }
  
  if (filters.deadline_end !== undefined) {
    validated.deadline_end = validateDate(filters.deadline_end);
  }
  
  // Status filter
  if (filters.status !== undefined) {
    if (Array.isArray(filters.status)) {
      validated.status = validateArray(
        filters.status,
        (item) => validateString(item, { maxLength: 50 }),
        { maxLength: 10 }
      );
    } else {
      validated.status = validateString(filters.status, { maxLength: 50 });
    }
  }
  
  // Grant type
  if (filters.grant_type !== undefined) {
    if (Array.isArray(filters.grant_type)) {
      validated.grant_type = validateArray(
        filters.grant_type,
        (item) => validateString(item, { maxLength: 100 }),
        { maxLength: 10 }
      );
    } else {
      validated.grant_type = validateString(filters.grant_type, { maxLength: 100 });
    }
  }
  
  // Funding instrument
  if (filters.funding_instrument !== undefined) {
    if (Array.isArray(filters.funding_instrument)) {
      validated.funding_instrument = validateArray(
        filters.funding_instrument,
        (item) => validateString(item, { maxLength: 100 }),
        { maxLength: 10 }
      );
    } else {
      validated.funding_instrument = validateString(filters.funding_instrument, { maxLength: 100 });
    }
  }
  
  // Geographic filters
  if (filters.geographic_scope !== undefined) {
    if (Array.isArray(filters.geographic_scope)) {
      validated.geographic_scope = validateArray(
        filters.geographic_scope,
        (item) => validateString(item, { maxLength: 50 }),
        { maxLength: 10 }
      );
    } else {
      validated.geographic_scope = validateString(filters.geographic_scope, { maxLength: 50 });
    }
  }
  
  if (filters.countries !== undefined) {
    if (Array.isArray(filters.countries)) {
      validated.countries = validateArray(
        filters.countries,
        (item) => validateString(item, { maxLength: 10 }),
        { maxLength: 50 }
      );
    } else {
      validated.countries = validateString(filters.countries, { maxLength: 10 });
    }
  }
  
  if (filters.states !== undefined) {
    if (Array.isArray(filters.states)) {
      validated.states = validateArray(
        filters.states,
        (item) => validateString(item, { maxLength: 10 }),
        { maxLength: 50 }
      );
    } else {
      validated.states = validateString(filters.states, { maxLength: 10 });
    }
  }
  
  // Other filters
  if (filters.cost_sharing_required !== undefined) {
    validated.cost_sharing_required = validateBoolean(filters.cost_sharing_required);
  }
  
  if (filters.cfda_numbers !== undefined) {
    if (Array.isArray(filters.cfda_numbers)) {
      validated.cfda_numbers = validateArray(
        filters.cfda_numbers,
        (item) => validateString(item, { maxLength: 20 }),
        { maxLength: 10 }
      );
    } else {
      validated.cfda_numbers = validateString(filters.cfda_numbers, { maxLength: 20 });
    }
  }
  
  if (filters.opportunity_number !== undefined) {
    validated.opportunity_number = validateString(filters.opportunity_number, { maxLength: 100 });
  }
  
  // Sorting and pagination
  if (filters.sort_by !== undefined) {
    const allowedSortFields = ['posted_date', 'application_deadline', 'funding_amount_max', 'created_at', 'title'];
    const sortBy = validateString(filters.sort_by, { maxLength: 50 });
    if (sortBy && allowedSortFields.includes(sortBy)) {
      validated.sort_by = sortBy;
    }
  }
  
  if (filters.sort_direction !== undefined) {
    const direction = validateString(filters.sort_direction, { maxLength: 4 });
    if (direction === 'asc' || direction === 'desc') {
      validated.sort_direction = direction;
    }
  }
  
  // Pagination
  if (filters.page !== undefined) {
    validated.page = validateNumber(filters.page, { min: 1, max: 1000, integer: true });
  }
  
  if (filters.limit !== undefined) {
    validated.limit = validateNumber(filters.limit, { min: 1, max: 100, integer: true });
  }
  
  // User interaction filters
  if (filters.user_id !== undefined) {
    validated.user_id = validateUUID(filters.user_id);
  }
  
  if (filters.exclude_interaction_types !== undefined) {
    validated.exclude_interaction_types = validateArray(
      filters.exclude_interaction_types,
      (item) => {
        const validTypes = ['saved', 'applied', 'ignored'];
        const type = validateString(item, { maxLength: 20 });
        if (type && validTypes.includes(type)) {
          return type;
        }
        throw new Error(`Invalid interaction type: ${type}`);
      },
      { maxLength: 3 }
    );
  }
  
  if (filters.exclude_id !== undefined) {
    validated.exclude_id = validateUUID(filters.exclude_id);
  }
  
  return validated;
}

/**
 * Validate pagination parameters
 * @param page - Page number
 * @param limit - Items per page
 * @returns Validated pagination object
 */
export function validatePagination(page: any, limit: any): { page: number; limit: number; offset: number } {
  const validatedPage = validateNumber(page, { min: 1, max: 1000, integer: true }) || 1;
  const validatedLimit = validateNumber(limit, { min: 1, max: 100, integer: true }) || 20;
  const offset = (validatedPage - 1) * validatedLimit;
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    offset
  };
}

/**
 * Validate user preferences
 * @param preferences - Raw preferences object
 * @returns Validated preferences
 */
export function validateUserPreferences(preferences: any): any {
  if (!preferences || typeof preferences !== 'object') {
    return {};
  }
  
  const validated: any = {};
  
  if (preferences.grant_categories !== undefined) {
    validated.grant_categories = validateArray(
      preferences.grant_categories,
      (item) => validateString(item, { maxLength: 100 }),
      { maxLength: 20 }
    );
  }
  
  if (preferences.agencies !== undefined) {
    validated.agencies = validateArray(
      preferences.agencies,
      (item) => validateString(item, { maxLength: 200 }),
      { maxLength: 10 }
    );
  }
  
  if (preferences.funding_min !== undefined) {
    validated.funding_min = validateNumber(preferences.funding_min, { min: 0 });
  }
  
  if (preferences.funding_max !== undefined) {
    validated.funding_max = validateNumber(preferences.funding_max, { min: 0 });
  }
  
  if (preferences.deadline_range !== undefined) {
    validated.deadline_range = validateNumber(preferences.deadline_range, { min: 1, max: 365, integer: true });
  }
  
  if (preferences.project_description_query !== undefined) {
    validated.project_description_query = validateString(preferences.project_description_query, { maxLength: 2000 });
  }
  
  return validated;
}