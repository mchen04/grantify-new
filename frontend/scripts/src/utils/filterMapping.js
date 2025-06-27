"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPECIAL_FILTER_PRESETS = void 0;
exports.mapFiltersToApi = mapFiltersToApi;
const constants_1 = require("./constants");
/**
 * Maps frontend filter values to backend API format
 * Handles all special cases for funding amounts, deadlines, and other filters
 */
function mapFiltersToApi(filter) {
    const apiFilters = {};
    // Basic filters
    if (filter.searchTerm) {
        apiFilters.search = filter.searchTerm;
    }
    apiFilters.limit = filter.limit || 20;
    apiFilters.page = filter.page || 1;
    // Data sources filter
    if (filter.data_source_ids && filter.data_source_ids.length > 0) {
        apiFilters.data_sources = filter.data_source_ids.join(',');
    }
    else if (filter.sources && filter.sources.length > 0) {
        // Legacy support
        apiFilters.data_sources = filter.sources.join(',');
    }
    // Sort by
    if (filter.sortBy) {
        // Map frontend sort values to backend values
        const sortMapping = {
            'relevance': { sort_by: 'created_at', sort_direction: 'desc' },
            'recent': { sort_by: 'created_at', sort_direction: 'desc' },
            'deadline': { sort_by: 'application_deadline', sort_direction: 'asc' },
            'deadline_latest': { sort_by: 'application_deadline', sort_direction: 'desc' },
            'amount': { sort_by: 'funding_amount_max', sort_direction: 'desc' },
            'amount_asc': { sort_by: 'funding_amount_max', sort_direction: 'asc' },
            'title_asc': { sort_by: 'title', sort_direction: 'asc' },
            'title_desc': { sort_by: 'title', sort_direction: 'desc' },
            'available': { sort_by: 'created_at', sort_direction: 'desc' },
            'popular': { sort_by: 'view_count', sort_direction: 'desc' }
        };
        const sortConfig = sortMapping[filter.sortBy];
        if (sortConfig) {
            apiFilters.sort_by = sortConfig.sort_by;
            apiFilters.sort_direction = sortConfig.sort_direction;
        }
        else {
            apiFilters.sort_by = filter.sortBy;
        }
    }
    // Deadline filters
    if (filter.onlyNoDeadline) {
        apiFilters.deadline_null = true;
    }
    else {
        // Handle deadline range in days
        if (filter.deadlineMinDays !== undefined) {
            const minDate = new Date();
            minDate.setDate(minDate.getDate() + filter.deadlineMinDays);
            apiFilters.deadline_start = minDate.toISOString();
        }
        if (filter.deadlineMaxDays !== undefined && filter.deadlineMaxDays < Number.MAX_SAFE_INTEGER) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + filter.deadlineMaxDays);
            apiFilters.deadline_end = maxDate.toISOString();
        }
        // Include no deadline option
        if (filter.deadlineMinDays !== undefined || filter.deadlineMaxDays !== undefined) {
            apiFilters.include_no_deadline = filter.includeNoDeadline;
        }
    }
    // Funding filters with special handling
    if (filter.onlyNoFunding) {
        apiFilters.funding_null = true;
    }
    else {
        // Handle funding range
        let sendFundingFilters = false;
        if (filter.fundingMin !== undefined) {
            // Special case: "Any Amount" (fundingMin=0 and no fundingMax)
            if (filter.fundingMin === 0 && filter.fundingMax === undefined) {
                // Don't send any funding filters for "Any Amount"
            }
            else {
                apiFilters.funding_min = filter.fundingMin;
                sendFundingFilters = true;
            }
        }
        if (filter.fundingMax !== undefined) {
            // Special case: $100M+ 
            if (filter.fundingMax >= 100000000) {
                // For $100M+, use MAX_SAFE_INTEGER
                apiFilters.funding_max = Number.MAX_SAFE_INTEGER;
            }
            else {
                apiFilters.funding_max = filter.fundingMax;
            }
            sendFundingFilters = true;
        }
        // Only send include_no_funding if we're actually filtering
        if (sendFundingFilters) {
            apiFilters.include_no_funding = filter.includeFundingNull;
        }
    }
    // Boolean filters
    if (filter.costSharingRequired !== undefined && filter.costSharingRequired !== null) {
        apiFilters.cost_sharing_required = filter.costSharingRequired;
    }
    // Show overdue grants
    if (filter.showOverdue !== undefined) {
        apiFilters.show_overdue = filter.showOverdue;
    }
    // Status filters
    if (filter.statuses && filter.statuses.length > 0) {
        apiFilters.status = filter.statuses;
    }
    // Currency filters
    if (filter.currencies && filter.currencies.length > 0) {
        apiFilters.currency = filter.currencies;
    }
    // Featured filter
    if (filter.onlyFeatured) {
        apiFilters.is_featured = true;
    }
    // Posted date filters
    if (filter.postDateFrom) {
        apiFilters.posted_date_start = filter.postDateFrom;
    }
    if (filter.postDateTo) {
        apiFilters.posted_date_end = filter.postDateTo;
    }
    // Geographic filters
    if (filter.geographic_scope) {
        apiFilters.geographic_scope = filter.geographic_scope;
    }
    if (filter.countries && filter.countries.length > 0) {
        apiFilters.countries = filter.countries;
    }
    if (filter.states && filter.states.length > 0) {
        apiFilters.states = filter.states;
    }
    // Grant type filters
    if (filter.grant_types && filter.grant_types.length > 0) {
        apiFilters.grant_type = filter.grant_types;
    }
    // Organization filters
    if (filter.organizations && filter.organizations.length > 0) {
        apiFilters.funding_organization_name = filter.organizations;
    }
    // CFDA numbers
    if (filter.cfda_numbers && filter.cfda_numbers.length > 0) {
        apiFilters.cfda_numbers = filter.cfda_numbers;
    }
    // Opportunity number
    if (filter.opportunity_number) {
        apiFilters.opportunity_number = filter.opportunity_number;
    }
    // Popularity filters
    if (filter.minViewCount !== undefined) {
        apiFilters.min_view_count = filter.minViewCount;
    }
    if (filter.minSaveCount !== undefined) {
        apiFilters.min_save_count = filter.minSaveCount;
    }
    // User-specific filters
    if (filter.eligible_applicant_types && filter.eligible_applicant_types.length > 0) {
        apiFilters.eligible_applicant_types = filter.eligible_applicant_types;
    }
    return apiFilters;
}
/**
 * Special filter presets that need custom handling
 */
exports.SPECIAL_FILTER_PRESETS = {
    FUNDING: {
        ANY: { min: undefined, max: undefined },
        ZERO: { min: 0, max: 0 },
        UNDER_50K: { min: 0, max: 50000 },
        '50K_100K': { min: 50000, max: 100000 },
        '100K_500K': { min: 100000, max: 500000 },
        '500K_1M': { min: 500000, max: 1000000 },
        '1M_5M': { min: 1000000, max: 5000000 },
        '5M_10M': { min: 5000000, max: 10000000 },
        '10M_PLUS': { min: 10000000, max: constants_1.MAX_FUNDING },
        '100M_PLUS': { min: 100000000, max: Number.MAX_SAFE_INTEGER }
    },
    DEADLINE: {
        ANY: { min: undefined, max: undefined },
        OVERDUE: { min: constants_1.MIN_DEADLINE_DAYS, max: -1 },
        NEXT_7_DAYS: { min: 0, max: 7 },
        NEXT_30_DAYS: { min: 0, max: 30 },
        NEXT_3_MONTHS: { min: 0, max: 90 },
        NEXT_6_MONTHS: { min: 0, max: 180 },
        THIS_YEAR: { min: 0, max: 365 },
        '90D_OVERDUE': { min: -90, max: -1 },
        '1_YEAR': { min: 0, max: 365 }
    }
};
