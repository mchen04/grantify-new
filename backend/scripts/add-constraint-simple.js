const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

async function addConstraint() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Adding missing unique constraint to user_interactions table...');
  
  try {
    // Use raw SQL to add the constraint
    const { data, error } = await supabase
      .from('user_interactions')
      .select('*')
      .limit(1); // Just to test connection

    if (error) {
      console.log('❌ Database connection failed:', error);
      return;
    }

    console.log('✅ Database connection successful');
    console.log('ℹ️  Note: The constraint needs to be added through the Supabase dashboard');
    console.log('   or by running this SQL command in the SQL editor:');
    console.log('');
    console.log('   ALTER TABLE ONLY "public"."user_interactions"');
    console.log('   ADD CONSTRAINT "user_interactions_user_id_grant_id_key" UNIQUE ("user_id", "grant_id");');
    console.log('');

    // For now, let's test if we can work around the issue by using a different approach
    console.log('🧪 Testing workaround: using INSERT with ON CONFLICT DO UPDATE...');
    
    const testUserId = '4b1737a6-605a-4a53-8662-d478b9f30645';
    const testGrantId = 'bc499709-5c39-4141-ad47-eaadf199156e';
    
    // Clean up any existing data
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId);

    // Try a different approach - check if record exists first, then insert or update
    const { data: existing } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId)
      .maybeSingle();

    if (existing) {
      console.log('📝 Record exists, updating...');
      const { error: updateError } = await supabase
        .from('user_interactions')
        .update({ action: 'ignored' })
        .eq('user_id', testUserId)
        .eq('grant_id', testGrantId);
      
      if (updateError) {
        console.log('❌ Update failed:', updateError);
      } else {
        console.log('✅ Update succeeded');
      }
    } else {
      console.log('📝 Record does not exist, inserting...');
      const { error: insertError } = await supabase
        .from('user_interactions')
        .insert({
          user_id: testUserId,
          grant_id: testGrantId,
          action: 'ignored'
        });
      
      if (insertError) {
        console.log('❌ Insert failed:', insertError);
      } else {
        console.log('✅ Insert succeeded');
      }
    }

    // Clean up
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', testUserId)
      .eq('grant_id', testGrantId);

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

addConstraint().then(() => process.exit(0));