# User Interaction Race Condition Fix

## Problem

The original `recordUserInteraction` method in `usersService.ts` had a critical race condition vulnerability:

```typescript
// VULNERABLE CODE (before fix)
// First, check if an interaction already exists
const { data: existingInteraction } = await supabase
  .from('user_interactions')
  .select('*')
  .eq('user_id', userId)
  .eq('grant_id', interactionData.grant_id)
  .maybeSingle();

if (existingInteraction) {
  // Update existing interaction
  const { data: updatedInteraction, error: updateError } = await supabase
    .from('user_interactions')
    .update({ action: interaction.action, notes: interaction.notes })
    .eq('user_id', userId)
    .eq('grant_id', interactionData.grant_id)
    .select()
    .single();
} else {
  // Insert new interaction
  const { data: newInteraction, error: insertError } = await supabase
    .from('user_interactions')
    .insert(interaction)
    .select()
    .single();
}
```

### Race Condition Scenarios

This pattern was vulnerable to race conditions where multiple concurrent requests could:

1. **Duplicate Record Creation**: Two requests check for existing interaction simultaneously, both see "none exists", both try to insert → constraint violation or duplicate records
2. **Lost Updates**: One request updates while another inserts → lost data
3. **Inconsistent State**: Partial success scenarios where some operations succeed and others fail

### Real-World Impact

- Users rapidly clicking save/apply/ignore buttons
- Network retries causing duplicate requests  
- Multiple browser tabs/windows
- Could result in:
  - Database constraint violations
  - Lost user interactions
  - Inconsistent application state
  - Poor user experience

## Solution

Replaced the check-then-insert/update pattern with PostgreSQL's atomic `UPSERT` operation:

```typescript
// FIXED CODE (atomic upsert)
const { data: result, error: upsertError } = await supabase
  .from('user_interactions')
  .upsert(
    interaction,
    {
      onConflict: 'user_id,grant_id',
      ignoreDuplicates: false // We want to update, not ignore
    }
  )
  .select()
  .single();
```

### Why This Fixes the Race Condition

1. **Atomic Operation**: The entire check-insert-or-update happens in a single database operation
2. **Database-Level Constraint**: Relies on the existing unique constraint `user_interactions_user_id_grant_id_key`
3. **No Race Window**: No gap between check and action where another request can interfere
4. **Guaranteed Consistency**: PostgreSQL ensures only one record per user-grant pair

### Database Schema Support

The fix leverages the existing unique constraint in the database:

```sql
-- From schema.sql
ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_grant_id_key" 
    UNIQUE ("user_id", "grant_id");
```

## Verification

### Test Scenarios Covered

1. **Concurrent Save Operations**: Multiple rapid saves to same user-grant pair
2. **Rapid Action Changes**: Fast transitions between saved → applied → ignored → saved
3. **Mixed Concurrent Actions**: Different actions happening simultaneously

### Expected Behavior After Fix

✅ **All operations succeed** - No failures due to race conditions  
✅ **Exactly one interaction per user-grant pair** - No duplicates created  
✅ **Final state reflects last operation** - Correct action persisted  
✅ **Improved Performance** - Single database round-trip instead of 2-3  

## Performance Benefits

- **Reduced Database Load**: 1 query instead of 2-3 queries per interaction
- **Lower Latency**: Single round-trip to database
- **Better Concurrency**: No locks or coordination needed
- **Simplified Error Handling**: Single error path instead of multiple

## Additional Improvements

### Enhanced Error Logging

Added detailed error logging for debugging:

```typescript
logger.error('Error in atomic upsert for user interaction:', {
  error: upsertError.message,
  code: upsertError.code,
  details: upsertError.details,
  hint: upsertError.hint,
  userId,
  grantId: interactionData.grant_id,
  action: interactionData.action
});
```

### Debug Logging

Added debug logs to monitor upsert operations:

```typescript
logger.debug('Performing atomic upsert for user interaction:', {
  userId,
  grantId: interactionData.grant_id,
  action: interactionData.action,
  timestamp: new Date().toISOString()
});
```

## Migration Notes

- **No schema changes required** - Uses existing unique constraint
- **Backward compatible** - Same API interface
- **Drop-in replacement** - No changes needed in calling code
- **Safe to deploy** - No breaking changes

## Related Code Paths

All user interaction operations go through `usersService.recordUserInteraction()`:

- Frontend: `InteractionContext.updateUserInteraction()`
- API Routes: `/api/grants/:id/save`, `/api/grants/:id/apply`, `/api/grants/:id/ignore`
- Users Route: `/api/users/interactions`

The fix protects all these code paths from race conditions.

## Future Considerations

1. **Audit Trail**: Consider adding audit logging for interaction changes
2. **Soft Deletes**: Consider soft delete pattern instead of hard deletes
3. **Bulk Operations**: Extend pattern to bulk interaction updates if needed
4. **Read Replicas**: Upsert operations work correctly with read replica setups

## Testing

Created test scripts to verify the fix:
- `test-upsert-fix.ts` - Direct database testing
- `test-interaction-race-fix.js` - API level testing

Test scenarios validate:
- Concurrent operations don't create duplicates
- Final state is consistent
- All operations succeed without errors
- Performance is improved