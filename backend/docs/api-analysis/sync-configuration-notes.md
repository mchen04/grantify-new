# Grant Sync Configuration Notes

## Environment Variables

The grant sync scripts require proper Supabase credentials. Make sure your `.env` file has:

```bash
# Required for sync operations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important**: The sync scripts use `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`) for database operations with elevated permissions.

## Running Manual Sync

To manually sync grants from specific sources:

```bash
# From the backend directory
cd /Users/michaelchen/Desktop/Grantify.ai/backend

# Sync all sources
npx ts-node scripts/grants-updates/update_grants.ts

# Check funding coverage
npx ts-node scripts/check-funding-coverage.ts

# Test API sync functionality
npx ts-node scripts/test-api-sync-funding.ts
```

## Automated Daily Sync

The daily sync is configured via cron job:
```bash
cd scripts/grants-updates
./setup_daily_cron.sh
```

This will sync grants daily at 2 AM local time.

## Funding Extraction

All API clients now automatically extract funding during sync:

- **World Bank**: Multiplies `curr_total_commitment` by 1,000,000
- **EU Portal**: Extracts from metadata fields
- **Federal Register**: Description text contains funding (extracted post-sync)
- **Grants.gov**: No funding data available (API limitation)

## Monitoring

Check sync logs in:
- `backend/logs/update-error.log` - Errors only
- `backend/logs/update-combined.log` - All sync activity

## Troubleshooting

1. **Permission Denied Errors**: Ensure you're using `SUPABASE_SERVICE_ROLE_KEY`
2. **Rate Limiting**: Some APIs have rate limits, sync will pause automatically
3. **Missing Funding**: Check if the API actually provides funding data

## Current Coverage

As of December 26, 2024:
- World Bank: 83% funding coverage ✅
- EU Portal: 47.1% funding coverage ✅
- Federal Register: 22.4% funding coverage ✅
- Grants.gov: 0% (no data available) ❌