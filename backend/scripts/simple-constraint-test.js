const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

async function testConstraint() {
  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Real IDs from the logs
  const userId = '4b1737a6-605a-4a53-8662-d478b9f30645';
  const grantId = 'bc499709-5c39-4141-ad47-eaadf199156e';

  console.log('🧪 Testing user_interactions constraint with real IDs...');
  console.log('User ID:', userId);
  console.log('Grant ID:', grantId);
  
  try {
    // First, clean up any existing test data
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('grant_id', grantId);
    
    console.log('\n1️⃣ Testing first insert (should succeed)...');
    const { data: insert1, error: error1 } = await supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        grant_id: grantId,
        action: 'saved'
      })
      .select();
    
    if (error1) {
      console.log('❌ First insert failed:', error1);
      return;
    }
    console.log('✅ First insert succeeded');

    console.log('\n2️⃣ Testing duplicate insert (should fail with constraint error)...');
    const { data: insert2, error: error2 } = await supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        grant_id: grantId,
        action: 'applied'  // Different action, same user+grant
      })
      .select();
    
    if (error2) {
      console.log('✅ Duplicate insert correctly failed:', error2.code, error2.message);
    } else {
      console.log('❌ Duplicate insert unexpectedly succeeded - constraint missing!');
    }

    console.log('\n3️⃣ Testing upsert (should work)...');
    const { data: upsert1, error: error3 } = await supabase
      .from('user_interactions')
      .upsert({
        user_id: userId,
        grant_id: grantId,
        action: 'ignored'
      }, {
        onConflict: 'user_id,grant_id'
      })
      .select();
    
    if (error3) {
      console.log('❌ Upsert failed:', error3.code, error3.message);
    } else {
      console.log('✅ Upsert succeeded');
    }

    // Clean up
    await supabase
      .from('user_interactions')
      .delete()
      .eq('user_id', userId)
      .eq('grant_id', grantId);
    
    console.log('\n🧹 Cleaned up test data');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConstraint().then(() => process.exit(0));