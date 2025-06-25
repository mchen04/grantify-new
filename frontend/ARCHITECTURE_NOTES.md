# Frontend Architecture Notes

## Direct Database Access Removal - Complete ✅

### Changes Made:
1. **Removed all direct database queries from client-side code**
   - Removed `db` object from `/src/lib/supabaseClient.ts`
   - Removed `supabaseHelpers` object with direct queries
   - Updated `/src/app/preferences/page.tsx` to use `usersApi` instead of direct queries

2. **Kept only authentication functions**
   - Supabase client is now only used for auth (`auth.signInWithGoogle()`, `auth.signOut()`, etc.)
   - All data access goes through the backend API via `apiClient`

### Server-Side API Routes (Future Improvement)
The following Next.js API routes still contain direct database queries:
- `/src/app/api/stats/route.ts`
- `/src/app/api/diagnose-grants/route.ts`

**Note**: These are server-side routes, not client-side code. While it's acceptable for them to have database access, the ideal architecture would be:
```
Frontend Client → Next.js API Route → Backend API → Database
```

Instead of:
```
Frontend Client → Next.js API Route → Database (current)
```

### Benefits of This Architecture:
1. **Single source of truth** - All business logic in backend
2. **Better security** - Database credentials only in backend
3. **Easier maintenance** - One place to update queries
4. **Consistent data transformation** - Backend handles all field mappings

### Remaining Work (Optional):
To fully complete the architecture:
1. Update `/src/app/api/stats/route.ts` to call backend `/api/grants/stats` endpoint
2. Update `/src/app/api/diagnose-grants/route.ts` to call backend diagnostic endpoints
3. Remove `SUPABASE_SERVICE_ROLE_KEY` from frontend environment variables

### Current State:
✅ **Client-side**: No direct database access
✅ **Authentication**: Properly isolated in `supabaseClient.ts`
✅ **Data access**: All through `apiClient` → Backend API
⚠️ **Server-side API routes**: Still have direct queries (acceptable but not ideal)