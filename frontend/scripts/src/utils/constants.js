"use strict";
/**
 * Application-wide constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FILTER_VALUES = exports.GRANTS_PER_PAGE = exports.DASHBOARD_GRANTS_PER_PAGE = exports.SEARCH_GRANTS_PER_PAGE = exports.MAX_DEADLINE_DAYS = exports.MIN_DEADLINE_DAYS = exports.MAX_FUNDING = exports.isDevelopment = void 0;
// Environment check
exports.isDevelopment = process.env.NODE_ENV === 'development';
// Maximum funding amount for grant filters
exports.MAX_FUNDING = 100000000; // $100,000,000 (100 million) - reasonable maximum
// Deadline days range for grant filters
exports.MIN_DEADLINE_DAYS = -90; // Show overdue grants up to 90 days back
exports.MAX_DEADLINE_DAYS = 365; // 1 year
// Number of grants to show per page
exports.SEARCH_GRANTS_PER_PAGE = 6;
exports.DASHBOARD_GRANTS_PER_PAGE = 10;
// Legacy constant for backward compatibility
exports.GRANTS_PER_PAGE = exports.SEARCH_GRANTS_PER_PAGE;
// Default filter values for search functionality
exports.DEFAULT_FILTER_VALUES = {
    searchTerm: '',
    sortBy: 'relevance',
    page: 1,
    limit: 20,
    fundingMin: null,
    fundingMax: null,
    deadlineMinDays: null,
    deadlineMaxDays: null
};
