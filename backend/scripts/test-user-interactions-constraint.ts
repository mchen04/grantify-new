#!/usr/bin/env ts-node

/**
 * Test script to verify user_interactions table constraint
 * This script tests that the unique constraint on (user_id, grant_id) is working properly
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Type definitions
interface UserInteraction {
  id?: string;
  user_id: string;
  grant_id: string;
  action: 'saved' | 'applied' | 'ignored';
  notes?: string;
  timestamp?: string;
}

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing required environment variables:'));
  console.error(chalk.red('   - SUPABASE_URL'));
  console.error(chalk.red('   - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY'));
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Test data - using UUIDs that are unlikely to exist
const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const testGrantId = '550e8400-e29b-41d4-a716-446655440000';

async function cleanupTestData(): Promise<void> {
  console.log(chalk.blue('🧹 Cleaning up any existing test data...'));
  
  const { error } = await supabase
    .from('user_interactions')
    .delete()
    .eq('user_id', testUserId)
    .eq('grant_id', testGrantId);

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error(chalk.red('Error during cleanup:'), error);
  }
}

async function testConstraint(): Promise<boolean> {
  console.log(chalk.cyan('\n📋 Testing user_interactions table constraint'));
  console.log(chalk.gray('Test user_id:'), testUserId);
  console.log(chalk.gray('Test grant_id:'), testGrantId);
  
  try {
    // Step 1: First insertion should succeed
    console.log(chalk.yellow('\n1️⃣  Testing first insertion (should succeed)...'));
    
    const firstInsert = await supabase
      .from('user_interactions')
      .insert<UserInteraction>({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'saved',
        notes: 'Test interaction - first insert'
      })
      .select()
      .single();

    if (firstInsert.error) {
      console.error(chalk.red('❌ First insertion failed:'), firstInsert.error);
      return false;
    }
    
    console.log(chalk.green('✅ First insertion succeeded'));
    console.log(chalk.gray('   Created interaction:'), firstInsert.data);

    // Step 2: Second insertion with same user_id and grant_id should fail
    console.log(chalk.yellow('\n2️⃣  Testing duplicate insertion (should fail)...'));
    
    const secondInsert = await supabase
      .from('user_interactions')
      .insert<UserInteraction>({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'applied',
        notes: 'Test interaction - duplicate insert attempt'
      })
      .select();

    if (secondInsert.error) {
      console.log(chalk.green('✅ Duplicate insertion correctly rejected'));
      console.log(chalk.gray('   Error code:'), secondInsert.error.code);
      console.log(chalk.gray('   Error message:'), secondInsert.error.message);
      
      // Check if it's the expected unique constraint violation
      if (secondInsert.error.code === '23505') { // PostgreSQL unique violation error code
        console.log(chalk.green('✅ Confirmed: Unique constraint is working properly'));
      }
    } else {
      console.error(chalk.red('❌ ERROR: Duplicate insertion succeeded when it should have failed!'));
      console.error(chalk.red('   This indicates the constraint is not working properly.'));
      return false;
    }

    // Step 3: Test upsert behavior
    console.log(chalk.yellow('\n3️⃣  Testing upsert behavior (should update existing record)...'));
    
    const upsertResult = await supabase
      .from('user_interactions')
      .upsert<UserInteraction>({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'applied',
        notes: 'Test interaction - upserted'
      }, {
        onConflict: 'user_id,grant_id'
      })
      .select()
      .single();

    if (upsertResult.error) {
      console.error(chalk.red('❌ Upsert failed:'), upsertResult.error);
      return false;
    }
    
    console.log(chalk.green('✅ Upsert succeeded'));
    console.log(chalk.gray('   Updated interaction:'), upsertResult.data);

    // Step 4: Verify only one record exists
    console.log(chalk.yellow('\n4️⃣  Verifying only one record exists...'));
    
    const { data: records, error: fetchError } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId);

    if (fetchError) {
      console.error(chalk.red('❌ Error fetching records:'), fetchError);
      return false;
    }

    if (records && records.length === 1) {
      console.log(chalk.green('✅ Confirmed: Only one record exists'));
      console.log(chalk.gray('   Record:'), records[0]);
    } else {
      console.error(chalk.red(`❌ ERROR: Expected 1 record but found ${records?.length || 0}`));
      return false;
    }

    return true;

  } catch (error) {
    console.error(chalk.red('❌ Unexpected error during testing:'), error);
    return false;
  }
}

async function testDifferentCombinations(): Promise<boolean> {
  console.log(chalk.cyan('\n📋 Testing different user/grant combinations'));
  
  const testCases: UserInteraction[] = [
    { user_id: testUserId, grant_id: '550e8400-e29b-41d4-a716-446655440001', action: 'saved' },
    { user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', grant_id: testGrantId, action: 'applied' },
    { user_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', grant_id: '550e8400-e29b-41d4-a716-446655440001', action: 'ignored' }
  ];

  console.log(chalk.yellow('\n5️⃣  Testing different combinations (all should succeed)...'));
  
  for (const testCase of testCases) {
    const result = await supabase
      .from('user_interactions')
      .insert<UserInteraction>(testCase)
      .select();

    if (result.error) {
      console.error(chalk.red(`❌ Failed to insert ${JSON.stringify(testCase)}:`), result.error);
      return false;
    }
    
    console.log(chalk.green(`✅ Successfully inserted: user=${testCase.user_id.slice(-4)}, grant=${testCase.grant_id.slice(-4)}, action=${testCase.action}`));
  }

  // Cleanup test combinations
  for (const testCase of testCases) {
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', testCase.user_id)
      .eq('grant_id', testCase.grant_id);
  }

  return true;
}

async function main(): Promise<void> {
  console.log(chalk.bold.cyan('🧪 User Interactions Constraint Test'));
  console.log(chalk.gray('=' .repeat(50)));
  
  // Cleanup before starting
  await cleanupTestData();
  
  // Run tests
  const constraintTestPassed = await testConstraint();
  const combinationTestPassed = await testDifferentCombinations();
  
  // Cleanup after tests
  await cleanupTestData();
  
  // Summary
  console.log(chalk.cyan('\n📊 Test Summary'));
  console.log(chalk.gray('=' .repeat(50)));
  
  if (constraintTestPassed && combinationTestPassed) {
    console.log(chalk.bold.green('✅ All tests passed!'));
    console.log(chalk.green('The user_interactions table constraint is working correctly.'));
    console.log(chalk.gray('\nThe unique constraint on (user_id, grant_id) ensures:'));
    console.log(chalk.gray('- Each user can only have one interaction per grant'));
    console.log(chalk.gray('- Duplicate inserts are properly rejected'));
    console.log(chalk.gray('- Upserts work as expected'));
  } else {
    console.log(chalk.bold.red('❌ Some tests failed!'));
    console.log(chalk.red('Please check the constraint configuration in the database.'));
    process.exit(1);
  }
}

// Run the test
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});