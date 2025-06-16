# Grant Scraper System

## Overview

This system automatically scrapes grant information from various funding sources (NIH, NSF, private foundations, etc.), processes it using AI, generates embeddings, and stores the data in Supabase. The current implementation includes NIH as the primary source, but the system is designed to be extensible for other grant sources.

## Components

### 1. **NIHListScraper** (`nihListScraper.ts`)
- Scrapes the main NIH grants page to get a list of all available grants
- Handles pagination automatically
- Filters links to only include valid grant IDs (PAR-XX-XXX, RFA-XX-XXX, etc.)

### 2. **NIHDetailScraper** (`nihDetailScraper.ts`)
- Scrapes individual grant pages
- Extracts the full text content of each grant page
- Returns clean text for AI processing

### 3. **GeminiService** (`../ai/geminiService.ts`)
- **Source-Agnostic**: Works with any grant funding source (NIH, NSF, foundations, etc.)
- **Auto Data Source Detection**: Infers funding source from URL patterns
- **Model Fallback Chain**:
  1. Primary: Gemini 2.0 Flash (15 RPM, 1M TPM, 1500 RPD)
  2. Fallback: Gemini 2.0 Flash Lite (30 RPM, 1M TPM, 1500 RPD)
  3. Fallback: Gemini 1.5 Pro (15 RPM, 250K TPM, 500 RPD)
  4. Fallback: Gemini 1.5 Flash (15 RPM, 250K TPM, 500 RPD)
  5. Fallback: Gemini 1.5 Flash-8B (15 RPM, 250K TPM, 500 RPD)
- Automatically switches to backup models on failure
- Extracts structured data from unstructured grant pages
- Handles all field parsing and validation

### 4. **NIHScraperPipeline** (`nihScraperPipeline.ts`)
- Orchestrates the entire scraping process
- Manages rate limiting and delays
- Handles database operations
- Generates embeddings using Google text-embedding-004 (768 dimensions)

### 5. **ScraperScheduler** (`scraperScheduler.ts`)
- Manages scheduled runs (every 3 hours)
- Provides manual trigger functionality
- Tracks scraper status

## Configuration

### Environment Variables Required:
```env
GEMINI_API_KEY=your_gemini_api_key  # Used for both text processing and embeddings
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### Database Migration Required:
Before running the scraper with the new embedding model, run:
```sql
-- Update embeddings from 1536 to 768 dimensions
-- See: src/db/migrations/update_embeddings_dimensions.sql
```

## API Endpoints

### Admin-Only Endpoints:

#### GET `/api/scraper/status`
Get the current status of the scraper.
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "isScheduled": true,
    "nextRun": "2024-01-01T15:00:00.000Z"
  }
}
```

#### POST `/api/scraper/run`
Manually trigger a full scraper run.
```json
{
  "success": true,
  "message": "Scraper started. Check status endpoint for progress."
}
```

#### POST `/api/scraper/test/:grantId`
Test scraper with a single grant.
Example: `POST /api/scraper/test/PAR-25-379`

#### POST `/api/scraper/schedule/start`
Start the scheduled scraper (runs every 3 hours).

#### POST `/api/scraper/schedule/stop`
Stop the scheduled scraper.

## Testing

### Run Test Script:
```bash
npm run test:scraper
```

This will:
1. Test scraping a single grant (PAR-25-379)
2. Test the full pipeline with 2 grants

## How It Works

### 1. **List Scraping**
- Navigates to NIH grants page
- Extracts all grant links
- Handles pagination automatically

### 2. **Detail Scraping**
- For each grant link, visits the page
- Extracts full page text (removes scripts/styles)
- Passes text to Gemini AI

### 3. **AI Processing**
- Gemini AI extracts structured data:
  - Title, descriptions, dates
  - Funding amounts, eligibility
  - Contact information
  - Keywords and categories

### 4. **Embedding Generation**
- Creates embedding text from key fields
- Uses OpenAI's text-embedding-3-small model
- Generates 1536-dimensional vectors

### 5. **Database Storage**
- Upserts grant data to Supabase
- Updates existing grants if older than 7 days
- Stores embeddings for similarity search

## Rate Limiting

### NIH Website Rate Limiting:
- Default: 2 seconds between grant page requests
- Configurable via `delayBetweenRequests`
- Prevents overwhelming NIH servers

### Gemini API Rate Limiting (Dynamic per Model):
- **Primary Model (2.0 Flash)**: 15 RPM, 1M TPM, 1500 RPD
- **Fallback Models**: Vary from 15-30 RPM, 250K-1M TPM, 500-1500 RPD
- **Automatic Adjustment**: Rate limits adjust based on current active model
- **Model Fallback**: Automatically switches to backup models on failure

### Google Embeddings Rate Limiting:
- **text-embedding-004**: 1,500 requests per minute
- **Dimensions**: 768 (vs 1536 for OpenAI)
- **Max Tokens**: 2,048 per embedding

### Practical Implications:
- Most restrictive model (1.5 Flash): 500 RPD limit
- System automatically calculates safe per-run limits
- Every 3-hour run processes ~55 grants (500 RPD ÷ 8 runs × 0.9 buffer)
- Full NIH database (~3,000+ grants) requires ~6 days with fallback models

## Error Handling

- Comprehensive logging at each step
- Graceful fallbacks for AI failures
- Continues processing even if individual grants fail
- Records pipeline runs in database

## Production Deployment

1. Set all required environment variables
2. Start the scheduled scraper:
   ```bash
   curl -X POST http://localhost:3001/api/scraper/schedule/start \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. Monitor via status endpoint
4. Check logs for any issues

## Troubleshooting

### Common Issues:

1. **Puppeteer fails to start**
   - Ensure Chrome dependencies are installed
   - May need `--no-sandbox` flag in production

2. **Gemini API errors**
   - Check API key is valid
   - Monitor rate limits

3. **Database errors**
   - Verify Supabase credentials
   - Check RLS policies allow service role access

4. **Memory issues**
   - Scraper closes browsers after use
   - Consider reducing concurrent scrapes

## Future Improvements

- Add more grant sources (NSF, etc.)
- Implement incremental updates
- Add webhook notifications
- Enhanced duplicate detection
- Multi-language support