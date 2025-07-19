# Backend Scripts Directory

This directory contains utility scripts for managing the Grantify.ai backend, including grant data loading, database maintenance, and monitoring tasks.

## Grant Management Scripts

### 1. `grants-cli.ts`
Unified CLI tool for loading and managing grant data from multiple APIs.

**Usage:**
```bash
# Load all grants from all APIs (full load)
npm run grants:load-all

# Run incremental update (last 7 days only)
npm run grants:update

# Check database status
npm run grants:status

# Load grants from a specific source
npm run grants:load-source [source-name]
```

**Supported Data Sources:**
- Grants.gov
- Federal Register
- NIH RePORTER
- NSF Awards
- California Grants Portal
- SAM.gov
- USAspending
- Canadian Open Government
- EU Funding Portal
- UKRI Gateway
- World Bank
- NY State Grants
- OpenAlex

### 2. `update-grants-scheduler.ts`
Automated scheduler that runs grant updates based on each API's update frequency.

**Usage:**
```bash
# Start the automated scheduler
npm run grants:scheduler
```

The scheduler is configured in the database via the `api_sync_schedules` table and runs updates based on cron expressions for each data source.

### 3. `daily_grants_update.ts`
Daily update script for incremental grant loading.

**Usage:**
```bash
# Run daily incremental update
npm run update:daily
```

### 4. `update_grants.ts`
Service for running grant updates with configurable options.

**Usage:**
```bash
# Run update service
npm run update:service
```

## Monitoring Scripts

### `monitoring.ts`
System monitoring script that tracks:
- Memory usage
- Active processes
- Database connections
- API sync status

**Usage:**
```bash
npm run monitoring
```

## Utility Scripts

### `setup-logs.js`
Creates the necessary logging directories for the application.
- Automatically runs before `npm start` or `npm run dev`
- Creates `logs/` directory if it doesn't exist

### `kill-backend.sh`
Safely terminates backend processes and frees up port 3001.

**Usage:**
```bash
npm run kill
# Or directly:
./scripts/kill-backend.sh
```

### `setup_daily_cron.sh`
Sets up daily cron jobs for automated grant updates.

**Usage:**
```bash
npm run cron:setup
```

## Configuration

All scripts use environment variables from `.env`:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for full database access
- `SUPABASE_ANON_KEY`: Anonymous key for client operations

## Database Schema

The scripts work with the optimized schema:

### Main Tables
- `grants`: Core grant records with optimized fields
  - `data_source_id`: Links to data source
  - `source_identifier`: Unique ID from source
  - `funding_organization_name`: Funding agency
  - `funding_amount_min/max`: Funding range
  - `application_deadline`: Submission deadline
  - `search_vector`: Full-text search optimization

### Supporting Tables
- `data_sources`: API configuration and metadata
- `api_sync_logs`: Sync history and monitoring
- `api_sync_schedules`: Automated sync configuration
- `api_rate_limits`: Rate limit tracking
- `user_interactions`: User grant interactions
- `user_preferences`: User search preferences

## Error Handling

- All errors are logged using Winston logger
- Failed grants are tracked but don't stop the entire process
- Sync logs are maintained in the database for monitoring
- Rate limiting is automatically handled for all APIs
- Automatic retry with exponential backoff

## Monitoring

Check sync status and logs:
```sql
-- Recent sync logs
SELECT 
  ds.display_name,
  asl.status,
  asl.records_fetched,
  asl.records_created,
  asl.records_updated,
  asl.duration_seconds,
  asl.started_at
FROM api_sync_logs asl
JOIN data_sources ds ON asl.data_source_id = ds.id
ORDER BY asl.started_at DESC 
LIMIT 20;

-- Data source status
SELECT 
  name,
  display_name,
  last_successful_sync,
  is_active
FROM data_sources
ORDER BY last_successful_sync DESC;

-- Grant statistics
SELECT * FROM get_grant_statistics();
```

## Troubleshooting

1. **TypeScript compilation errors**: 
   - Run `npm run build` first
   - Check for missing dependencies

2. **Permission errors**: 
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Verify the service role has proper permissions

3. **Rate limiting**: 
   - Scripts automatically handle rate limits
   - Check `api_rate_limits` table for current usage

4. **Memory issues**: 
   - Adjust batch sizes in grant loader
   - Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

5. **Sync failures**:
   - Check `api_sync_logs` for error messages
   - Verify API credentials are valid
   - Check network connectivity

## Performance Tips

- Use incremental updates during regular operations
- Run full syncs only during off-peak hours
- Monitor memory usage with `npm run monitoring`
- Batch operations are optimized for 50-100 records at a time
- Enable Redis for better caching performance

## Adding New Data Sources

1. Create a new API client in `src/services/api-integrations/clients/`
2. Extend `BaseApiClient` and implement required methods:
   - `fetchGrants()`: Retrieve grants from API
   - `transformGrant()`: Convert to normalized format
   - `sync()`: Orchestrate the sync process
3. Register the client in `ApiScheduler.ts`
4. Add data source record to database:
   ```sql
   INSERT INTO data_sources (name, display_name, api_url, is_active)
   VALUES ('new_source', 'New Source Name', 'https://api.example.com', true);
   ```
5. Configure sync schedule in `api_sync_schedules`

## Best Practices

1. **Always test with small batches first**
2. **Monitor logs during initial runs**
3. **Use dry-run options when available**
4. **Keep API credentials secure**
5. **Document any custom transformations**
6. **Regular backups before major updates**