# Quick Start - Loading All Grants

## Prerequisites

1. **Environment Variables**
   Create a `.env` file in the backend directory with:
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Build TypeScript**
   ```bash
   npm run build
   ```

## Step 1: Initial Grant Load

Load all grants from all 13+ API sources:

```bash
npm run grants:load-all
```

This will:
- Connect to all configured API sources
- Load grants in batches for optimal performance
- Automatically handle rate limiting
- Normalize data to the unified schema
- Show real-time progress for each API
- Take approximately 1-2 hours to complete

## Step 2: Set Up Automatic Updates

### Option A: Manual Daily Updates
Run the daily update script:
```bash
npm run update:daily
```

### Option B: Automated Scheduler
Start the automated scheduler that runs updates based on each API's optimal schedule:
```bash
npm run grants:scheduler
```

### Option C: Cron Job Setup
Set up system cron jobs for automatic daily updates:
```bash
npm run cron:setup
```

## Step 3: Monitor the System

### Check Grant Status
```bash
npm run grants:status
```

### Start Monitoring Service
```bash
npm run monitoring
```

### Access Health Endpoints
- Health check: http://localhost:3001/api/health
- Analytics: http://localhost:3001/api/analytics/dashboard

## What Each Command Does

- **grants:load-all** - Performs full load from all APIs (initial setup)
- **grants:update** - Incremental update (last 7 days)
- **grants:status** - Shows current database statistics
- **grants:load-source [name]** - Load from specific source
- **grants:scheduler** - Runs automated scheduler
- **update:daily** - Daily incremental update
- **monitoring** - Real-time system monitoring

## Database Queries for Monitoring

```sql
-- Check recent sync activity
SELECT 
  ds.display_name,
  asl.status,
  asl.records_fetched,
  asl.records_created,
  asl.duration_seconds,
  asl.started_at
FROM api_sync_logs asl
JOIN data_sources ds ON asl.data_source_id = ds.id
ORDER BY asl.started_at DESC 
LIMIT 10;

-- Check grant counts by source
SELECT 
  ds.display_name,
  COUNT(g.id) as grant_count,
  MAX(g.created_at) as latest_grant
FROM grants g
JOIN data_sources ds ON g.data_source_id = ds.id
GROUP BY ds.display_name
ORDER BY grant_count DESC;

-- Check grants with deadlines in next 30 days
SELECT 
  COUNT(*) as urgent_grants
FROM grants
WHERE application_deadline BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND status = 'active';
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` has full access
   - Check RLS policies aren't blocking service role

2. **Rate Limiting**
   ```sql
   -- Check rate limit status
   SELECT * FROM api_rate_limits 
   WHERE window_start > NOW() - INTERVAL '1 hour'
   ORDER BY window_start DESC;
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   NODE_OPTIONS="--max-old-space-size=4096" npm run grants:load-all
   ```

4. **API Errors**
   - Check API credentials in environment variables
   - Verify API endpoints are accessible
   - Review error logs in `api_sync_logs` table

### Check Logs

```bash
# View application logs
tail -f logs/combined.log

# View error logs only
tail -f logs/error.log
```

## Performance Tips

1. **Initial Load**
   - Run during off-peak hours
   - Monitor memory usage
   - Consider loading sources individually if needed

2. **Updates**
   - Use incremental updates for daily operations
   - Full syncs only weekly or as needed
   - Monitor API rate limits

3. **Database**
   - Ensure indexes are properly created
   - Run `VACUUM ANALYZE grants;` after large loads
   - Monitor query performance

## Next Steps

After successful loading:

1. **Verify Data**
   - Check grant counts match expectations
   - Verify data quality with sample queries
   - Test search functionality

2. **Configure Frontend**
   - Update frontend environment variables
   - Test grant display and filtering
   - Verify user interactions work

3. **Set Up Monitoring**
   - Configure Sentry for error tracking
   - Set up alerts for sync failures
   - Monitor API usage and costs

4. **Production Deployment**
   - Enable Redis for caching
   - Configure proper rate limits
   - Set up backup procedures