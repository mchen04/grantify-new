# Grantify.ai Backend

Minimal backend utilities for the Grantify.ai grant discovery platform. The main backend logic has been migrated to Supabase Edge Functions as part of the clean skeleton architecture.

## Current Status

**⚠️ Legacy Directory**: This directory contains minimal utilities only. The main backend functionality has been moved to:
- **Supabase Edge Functions**: `/supabase/functions/` 
- **Database Scripts**: `/supabase/scripts/`
- **Shared Utilities**: `/shared/`

## What Remains

This directory now contains only:
- Essential TypeScript configuration
- Minimal package.json for development scripts
- Legacy utility scripts for database management

## Architecture Migration

### Before (v1.x)
```
Frontend → Express.js Backend → PostgreSQL Database
```

### After (v2.x - Current)
```
Frontend → Supabase (Edge Functions + Database)
```

## Current Structure

```
backend/
├── package.json          # Minimal dependencies for utilities
├── tsconfig.json         # TypeScript configuration
└── [Legacy files]        # Moved to supabase/ and shared/
```

## New Architecture Components

### Supabase Edge Functions (`/supabase/functions/`)
- **Grant Data Sync**: Automated data collection from official sources
- **AI Recommendations**: Personalized grant matching algorithms  
- **Search Processing**: Advanced search and filtering logic
- **Cron Jobs**: Scheduled data updates and maintenance

### Database Scripts (`/supabase/scripts/`)
- Database schema management
- Migration utilities
- Data seeding scripts
- Database function definitions

### Shared Utilities (`/shared/`)
- Common TypeScript types
- Shared constants and configurations
- Utility functions used across components

## Development Scripts

```bash
npm run build        # Compile TypeScript (if needed)
npm run lint         # ESLint code checking
```

## Migration Benefits

### Simplified Architecture
- **No Express.js server** to maintain and deploy
- **Supabase Edge Functions** handle all server-side logic
- **Global distribution** via edge computing
- **Automatic scaling** without server management

### Reduced Complexity
- **Fewer dependencies** to manage and update
- **No server infrastructure** to configure
- **Built-in authentication** via Supabase Auth
- **Integrated database** with Row Level Security

### Better Performance
- **Edge functions** run close to users globally
- **Direct database access** without API overhead
- **Built-in caching** and optimization
- **Real-time capabilities** without WebSocket management

## Database Access

Database operations now happen through:

### Frontend
```typescript
// Direct Supabase client access with RLS
import { supabase } from '@/lib/supabaseClient';

const { data, error } = await supabase
  .from('grants')
  .select('*')
  .eq('status', 'active');
```

### Edge Functions
```typescript
// Server-side operations in Edge Functions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

## Key Features Now in Edge Functions

### Smart Recommendations
- Weighted scoring algorithm implemented in Edge Functions
- Real-time recommendations based on user preferences
- ML-powered semantic search using vector embeddings

### Data Synchronization  
- Automated grant data collection from 13+ APIs
- Scheduled updates via Supabase cron jobs
- Error handling and retry logic

### Authentication & Security
- Supabase Auth with Google OAuth
- Row Level Security (RLS) policies
- JWT token management
- Rate limiting and protection

## Legacy Utilities

If you need to run legacy database scripts:

```bash
# Example legacy operations (if needed)
npm run setup:database    # Database setup (now in supabase/)
```

## Documentation

For current backend functionality, see:
- **[Supabase Functions Documentation](../supabase/functions/README.md)**
- **[Database Schema Documentation](../docs/architecture/database-schema.md)**
- **[API Documentation](../docs/api/README.md)**

## Contributing

For new backend functionality:
1. **Use Edge Functions**: Create new functions in `/supabase/functions/`
2. **Database Changes**: Add migrations to `/supabase/migrations/`
3. **Shared Code**: Add utilities to `/shared/`
4. **Documentation**: Update docs in `/docs/`

## Migration Guide

If you need to migrate remaining Express.js code:

### 1. API Routes → Edge Functions
```typescript
// OLD: Express.js route
app.get('/api/grants', async (req, res) => {
  // logic here
});

// NEW: Edge Function
export default async function handler(req: Request) {
  // logic here
  return new Response(JSON.stringify(data));
}
```

### 2. Middleware → Edge Function Logic
```typescript
// OLD: Express middleware
app.use(authenticate);

// NEW: Edge Function auth check
const auth = await supabase.auth.getUser(token);
if (!auth.user) throw new Error('Unauthorized');
```

### 3. Database Queries → Direct Supabase
```typescript
// OLD: Custom database client
const result = await db.query('SELECT * FROM grants');

// NEW: Supabase client
const { data } = await supabase.from('grants').select('*');
```

## License

Part of the Grantify.ai project - MIT License

---

**Status**: Legacy Directory - Use Supabase Edge Functions
**Architecture**: Frontend → Supabase (Edge Functions + Database)  
**Version**: 2.0.0