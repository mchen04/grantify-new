# Grant Data Integration System

This directory contains the comprehensive grant data integration system for Grantify.ai, which aggregates grant opportunities from 13+ APIs worldwide.

## Overview

The system integrates the following data sources:

### Primary Grant APIs (High Priority)
- **Grants.gov** - 15,000+ US federal grants (updates every 4 hours)
- **EU Funding Portal** - 70,000+ European Union grants (updates twice daily)
- **NIH RePORTER** - 500,000+ biomedical research grants (daily updates)
- **NSF Awards** - 50,000+ STEM grants annually (daily updates)

### Intelligence & Early Warning
- **Federal Register** - Catches grant announcements 30-60 days early (every 6 hours)
- **USAspending** - Historical award data for pattern analysis (every 2 days)

### Regional Sources
- **Canadian Open Government** - Canadian federal grants (daily)
- **UKRI Gateway** - UK research council funding (daily)
- **California Grants Portal** - 1,600+ state grants (twice daily)
- **New York State** - Historical grant data (daily)
- **World Bank** - International development grants (every 2 days)

### Specialized Sources
- **SAM.gov** - Contract opportunities with grant elements (daily)
- **OpenAlex** - Academic publication funding data (weekly)

## Quick Start

### Initial Data Load
```bash
# Install dependencies
npm install

# Run initial data load (this will take 1-2 hours)
npm run scripts:initial-load

# Or with TypeScript
npx ts-node scripts/initial_data_load.ts
```

### Start Update Service
```bash
# Start the automatic update service
npm run scripts:update-service

# Or run manually
npx ts-node scripts/update_grants.ts
```

### Start Monitoring
```bash
# Start monitoring service (runs on port 3001)
npm run scripts:monitoring

# Access endpoints:
# - http://localhost:3001/metrics (Prometheus metrics)
# - http://localhost:3001/health (Health check)
# - http://localhost:3001/health/grants_gov (API-specific health)
```

## Database Setup

1. **Apply the optimized schema:**
```bash
psql $DATABASE_URL < migrations/optimized_schema.sql
```

2. **Apply deduplication functions:**
```bash
psql $DATABASE_URL < migrations/deduplication_functions.sql
```

## Configuration

### Environment Variables
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@grantify.ai
ALERT_EMAIL=admin@grantify.ai

# API Keys (if needed)
SAM_GOV_API_KEY=your_sam_gov_key
```

### Update Schedules

The update service runs on these schedules:

| API | Frequency | Priority |
|-----|-----------|----------|
| Grants.gov | Every 4 hours | 10 |
| EU Funding | Twice daily | 9 |
| Federal Register | Every 6 hours | 8 |
| California Grants | Twice daily | 7 |
| NIH, NSF, Canada, UK | Daily | 6-8 |
| USAspending, World Bank | Every 2 days | 3-5 |
| OpenAlex | Weekly | 1 |

## Architecture

### Data Flow
1. **Fetch** - APIs are queried based on their schedules
2. **Transform** - Data is normalized to unified schema
3. **Deduplicate** - Fuzzy matching removes duplicates across sources
4. **Store** - Data saved to PostgreSQL with full-text search
5. **Monitor** - Health checks and metrics track system status

### Key Features
- **Parallel Processing** - APIs grouped by priority and run concurrently
- **Incremental Updates** - Only new/changed data is fetched
- **Automatic Deduplication** - Fuzzy matching with 80%+ similarity threshold
- **Error Recovery** - Failed syncs automatically retry with exponential backoff
- **Performance Monitoring** - Prometheus metrics and health endpoints
- **Alert System** - Slack/email alerts for critical issues

### Database Schema Highlights
- **Partitioned Tables** - Grants partitioned by close_date for performance
- **Vector Search** - pgvector for AI-powered grant matching
- **Full-text Search** - GIN indexes for fast text queries
- **Materialized Views** - Pre-computed statistics for dashboards

## Monitoring & Maintenance

### Health Checks
The monitoring service performs these checks:
- API sync status (stale data detection)
- Active grant counts by source
- Database performance metrics
- Duplicate detection status

### Alerts
Alerts are triggered for:
- API failures (3+ consecutive)
- Stale data (>48 hours)
- High error rates (>10%)
- Low grant counts (<1000 active)
- Slow syncs (>5 minutes)

### Manual Operations

```bash
# Run specific API update
npx ts-node -e "
  import { manualUpdate } from './scripts/update_grants';
  manualUpdate(['grants_gov', 'eu_funding']).then(console.log);
"

# Check for duplicates
psql $DATABASE_URL -c "SELECT * FROM find_all_duplicates(0.8);"

# Merge specific duplicates
psql $DATABASE_URL -c "SELECT merge_duplicate_grants('primary_id', 'duplicate_id');"

# Refresh statistics
psql $DATABASE_URL -c "REFRESH MATERIALIZED VIEW grant_statistics;"
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   - Check `api_sync_logs` for rate limit errors
   - Adjust `rate_limit_requests` in `api_sources` table

2. **Memory Issues**
   - Reduce page sizes in API configurations
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`

3. **Duplicate Grants**
   - Run `detect_recent_duplicates()` function
   - Review `duplicate_grant_pairs` view
   - Manually verify and merge if needed

4. **Stale Data**
   - Check specific API health: `/health/api_name`
   - Review error logs in `api_sync_logs`
   - Run manual update for affected API

### Logs
- Application logs: `logs/update-combined.log`
- Error logs: `logs/update-error.log`
- Database logs: `api_sync_logs` table

## Performance Optimization

### Database
- Ensure `work_mem` is at least 256MB for deduplication queries
- Run `ANALYZE` after large data loads
- Monitor index usage with `pg_stat_user_indexes`

### API Syncs
- Adjust `maxPages` for initial loads vs updates
- Use `fullSync: false` for regular updates
- Increase concurrency limit if server allows

## Contributing

When adding new APIs:

1. Create client extending `BaseApiClient`
2. Implement required methods: `fetchGrants`, `transformGrant`, `sync`
3. Add to configuration arrays in scripts
4. Test with small data sample first
5. Document any special requirements

## Support

For issues or questions:
- Check logs first
- Review health endpoint
- Check duplicate_grant_pairs view
- Contact: admin@grantify.ai