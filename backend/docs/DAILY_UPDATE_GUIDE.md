# Daily Grants Update System

## Overview

The daily update system automatically fetches new grants and updates existing ones from all configured APIs. It runs as a cron job and generates detailed reports of each update cycle.

## Features

- **Automatic Updates**: Fetches new grants and updates existing ones
- **Status Management**: Automatically marks expired grants as closed
- **Duplicate Prevention**: Uses source_identifier + data_source_id for deduplication
- **Error Handling**: Continues processing even if individual APIs fail
- **Detailed Logging**: Generates JSON reports and text logs for each run
- **Materialized View Refresh**: Updates the active_opportunities view after each run

## APIs Updated

1. **Grants.gov** - Both active and forecasted opportunities
2. **Federal Register** - Grant-related notices from federal agencies
3. **California Grants Portal** - State-level California grants
4. **World Bank** - International development projects
5. **NSF Awards** - National Science Foundation grants

## Installation

### 1. Set up the cron job (Recommended)

```bash
npm run cron:setup
```

This will:
- Create necessary directories
- Set up the runner script
- Configure the cron schedule
- Add the job to your system crontab

### 2. Manual Setup

If you prefer to set up manually:

```bash
# Make the setup script executable
chmod +x scripts/setup_daily_cron.sh

# Run the setup
./scripts/setup_daily_cron.sh
```

## Usage

### Run Update Manually

```bash
npm run update:grants
```

### Check Cron Status

```bash
# View all cron jobs
crontab -l

# Check if update is running
ps aux | grep daily_grants_update
```

### View Logs

Logs are stored in `backend/logs/`:
- `cron_*.log` - Text logs from cron runs
- `update_*.json` - Structured JSON reports

```bash
# View latest update report
cat logs/update_$(date +%Y-%m-%d).json | jq .

# View recent cron logs
tail -f logs/cron_*.log
```

## Update Process

1. **Mark Expired Grants**: Updates status of grants with passed deadlines
2. **Fetch New Data**: Queries each API for recent grants
3. **Deduplication**: Checks if grant already exists before inserting
4. **Update Existing**: Updates grants that already exist in database
5. **Refresh Views**: Updates the materialized view for performance
6. **Generate Report**: Creates JSON report with statistics

## Report Structure

```json
{
  "timestamp": "2024-12-27T02:00:00Z",
  "duration_seconds": 45,
  "totals": {
    "new": 125,
    "updated": 1203,
    "closed": 89,
    "errors": 0
  },
  "by_api": {
    "Grants.gov": {
      "new": 78,
      "updated": 892,
      "closed": 0,
      "errors": 0
    },
    // ... other APIs
  },
  "database_stats": {
    "total_grants": 3832,
    "active_grants": 2671,
    "forecasted_grants": 1161,
    "urgent_deadlines": 145,
    "grants_with_amounts": 367,
    "avg_funding_amount": 250000
  }
}
```

## Monitoring

### Check Last Run

```bash
# View last update time
ls -la logs/update_*.json | tail -1

# Check for errors in recent runs
grep -i error logs/cron_*.log | tail -20
```

### Set Up Alerts (Optional)

Edit the runner script to add email alerts:

```bash
vim scripts/run_daily_update.sh

# Uncomment and configure the email line
echo "Grant update failed" | mail -s "Alert" admin@example.com
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/run_daily_update.sh
   chmod +x scripts/setup_daily_cron.sh
   ```

2. **Node/NPM Not Found**
   - The script loads NVM automatically
   - Ensure Node.js is installed system-wide or via NVM

3. **Database Connection Failed**
   - Check `.env` file has correct Supabase credentials
   - Verify SUPABASE_URL and SUPABASE_SERVICE_KEY

4. **API Timeouts**
   - Individual API failures don't stop the entire update
   - Check logs for specific API errors

### Remove Cron Job

```bash
# Remove the daily update job
crontab -l | grep -v 'run_daily_update.sh' | crontab -
```

### Debug Mode

Run with verbose output:

```bash
NODE_ENV=development npm run update:grants
```

## Performance

- Average runtime: 30-60 seconds
- Data processed: ~1,000-2,000 grants per run
- Database impact: Minimal due to upsert operations
- Storage: ~1MB per day in logs (auto-rotated after 30 days)

## Best Practices

1. **Schedule during low-traffic hours** (2-6 AM recommended)
2. **Monitor disk space** for logs directory
3. **Review weekly reports** for anomalies
4. **Test after schema changes** to ensure compatibility
5. **Keep APIs documentation updated** in case of endpoint changes

## Extending the System

To add a new API:

1. Add the data source to `DATA_SOURCE_IDS`
2. Create an update function (e.g., `updateNewAPI()`)
3. Add to the Promise.allSettled() array in main()
4. Test thoroughly before deploying

Example:
```typescript
async function updateNewAPI() {
  const API_NAME = 'New API';
  console.log(`\n📥 Updating ${API_NAME}...`);
  
  try {
    // Fetch data
    // Process grants
    // Update database
    logApiResult(API_NAME, 'new', newCount);
  } catch (error) {
    logApiResult(API_NAME, 'errors', 1, error.message);
  }
}
```