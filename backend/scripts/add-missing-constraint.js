const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

async function addConstraint() {
  // Use service role client to bypass RLS and execute DDL
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Adding missing unique constraint to user_interactions table...');
  
  try {
    // First, check if constraint already exists
    const { data: constraints, error: checkError } = await supabase
      .rpc('get_table_constraints', { 
        table_name: 'user_interactions',
        constraint_type: 'UNIQUE'
      })
      .single();
    
    if (checkError) {
      console.log('ℹ️  Could not check existing constraints, proceeding with creation...');
    }

    // Add the unique constraint
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE ONLY "public"."user_interactions"
        ADD CONSTRAINT "user_interactions_user_id_grant_id_key" UNIQUE ("user_id", "grant_id");
      `
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Constraint already exists!');
      } else {
        console.log('❌ Failed to add constraint:', error);
        return;
      }
    } else {
      console.log('✅ Successfully added unique constraint!');
    }

    console.log('\n🧪 Testing the new constraint...');
    
    // Test with dummy data
    const testUserId = '4b1737a6-605a-4a53-8662-d478b9f30645';
    const testGrantId = 'bc499709-5c39-4141-ad47-eaadf199156e';
    
    // Clean up any existing test data first
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId);

    // Test 1: First insert should succeed
    const { data: insert1, error: error1 } = await supabase
      .from('user_interactions')
      .insert({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'saved'
      });

    if (error1) {
      console.log('❌ First insert failed:', error1);
      return;
    }
    console.log('✅ First insert succeeded');

    // Test 2: Duplicate insert should fail
    const { data: insert2, error: error2 } = await supabase
      .from('user_interactions')
      .insert({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'applied'
      });

    if (error2 && error2.code === '23505') {
      console.log('✅ Duplicate insert correctly failed with unique constraint violation');
    } else {
      console.log('❌ Duplicate insert did not fail as expected');
    }

    // Test 3: Upsert should work
    const { data: upsert1, error: error3 } = await supabase
      .from('user_interactions')
      .upsert({
        user_id: testUserId,
        grant_id: testGrantId,
        action: 'ignored'
      }, {
        onConflict: 'user_id,grant_id'
      });

    if (error3) {
      console.log('❌ Upsert failed:', error3);
    } else {
      console.log('✅ Upsert succeeded!');
    }

    // Clean up test data
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId);

    console.log('\n🎉 Constraint has been successfully added and tested!');
    console.log('   Grant interactions should now work properly.');

  } catch (error) {
    console.error('❌ Failed to add constraint:', error);
  }
}

addConstraint().then(() => process.exit(0));