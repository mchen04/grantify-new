# Backend Scripts

This directory contains operational and utility scripts for the Grantify.ai backend.

## Directory Structure

### `/cli` - Command Line Tools
- **grants-cli.ts** - CLI tool for managing grants (search, sync, etc.)
- **monitoring.ts** - System monitoring and health check scripts

### `/database` - Database Management
- **add-missing-constraint.js** - Adds missing database constraints
- **test-user-interactions-constraint.ts** - Tests user interaction constraints

### `/grants-updates` - Grant Synchronization
- **update_grants.ts** - Main grant update script
- **daily_grants_update.ts** - Daily automated grant sync
- **update-grants-scheduler.ts** - Scheduler for grant updates
- **setup_daily_cron.sh** - Sets up cron job for daily updates

### `/utils` - Utility Scripts
- **kill-backend.sh** - Stops backend processes
- **setup-logs.js** - Initializes logging directory structure

### Root Level Scripts

#### Monitoring & Testing
- **check-funding-coverage.ts** - Checks funding data coverage across all data sources
- **test-api-sync-funding.ts** - Comprehensive test suite for API sync and funding extraction

## Important Notes

### Funding Extraction
All API clients now include proper funding extraction:
- **World Bank**: Multiplies `curr_total_commitment` by 1,000,000 (values are in millions)
- **EU Portal**: Extracts from `cftEstimatedTotalProcedureValue`, `budgetOverview`, and `additionalInfos`
- **Federal Register**: Text extraction from descriptions handled by separate scripts

### Running Scripts

```bash
# Check funding coverage
npx ts-node scripts/check-funding-coverage.ts

# Test API sync functionality
npx ts-node scripts/test-api-sync-funding.ts

# Update grants
npx ts-node scripts/grants-updates/update_grants.ts

# Use CLI tool
npx ts-node scripts/cli/grants-cli.ts --help
```

### Daily Updates
The daily grant update is configured to run via cron. To set it up:
```bash
cd scripts/grants-updates
./setup_daily_cron.sh
```

## Maintenance

All temporary fix scripts have been removed after successful application. The funding extraction logic is now integrated directly into the API clients for automatic extraction during sync operations.