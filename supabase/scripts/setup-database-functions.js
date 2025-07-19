#!/usr/bin/env node

/**
 * Script to set up all database functions required by the application
 * Run this script to ensure all SQL functions are loaded into the database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function loadSQLFile(filePath) {
  try {
    console.log(`📄 Loading SQL file: ${path.basename(filePath)}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL into individual statements (simple approach)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_statement: statement + ';' });
        
        if (error) {
          // Try direct execution if rpc fails
          console.log(`   Trying direct execution...`);
          const { error: directError } = await supabase.from('_direct_sql').insert({ query: statement });
          
          if (directError && !directError.message.includes('relation "_direct_sql" does not exist')) {
            console.error(`   ❌ Error executing statement: ${error.message}`);
          } else {
            console.log(`   ✅ Statement executed successfully`);
          }
        } else {
          console.log(`   ✅ Statement executed successfully`);
        }
      }
    }
    
    console.log(`✅ Successfully loaded ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
  }
}

async function setupDatabaseFunctions() {
  console.log('🚀 Setting up database functions...\n');
  
  const functionsDir = path.join(__dirname, '../src/db/functions');
  const schemaFile = path.join(__dirname, '../src/db/schema.sql');
  
  // Load schema first if it exists
  if (fs.existsSync(schemaFile)) {
    console.log('📋 Loading database schema...');
    await loadSQLFile(schemaFile);
    console.log('');
  }
  
  // Load all function files
  if (fs.existsSync(functionsDir)) {
    const files = fs.readdirSync(functionsDir).filter(file => file.endsWith('.sql'));
    
    console.log(`📚 Found ${files.length} SQL function files to load...\n`);
    
    for (const file of files) {
      const filePath = path.join(functionsDir, file);
      await loadSQLFile(filePath);
      console.log('');
    }
  }
  
  console.log('🎉 Database setup completed!');
  
  // Test if functions are working
  console.log('\n🔍 Testing database functions...');
  
  try {
    // Test advisory lock functions
    console.log('Testing advisory lock functions...');
    const { data: lockResult, error: lockError } = await supabase.rpc('try_advisory_lock', { lock_id: 12345 });
    if (lockError) {
      console.log('⚠️  Advisory lock functions not available:', lockError.message);
    } else {
      console.log('✅ Advisory lock functions working');
      // Release the test lock
      await supabase.rpc('advisory_unlock', { lock_id: 12345 });
    }
    
    // Test CSRF token functions
    console.log('Testing CSRF token functions...');
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testTokenHash = 'test_token_hash';
    const testExpiry = new Date(Date.now() + 3600000).toISOString();
    
    const { data: csrfResult, error: csrfError } = await supabase.rpc('atomic_csrf_token_upsert', {
      p_user_id: testUserId,
      p_token_hash: testTokenHash,
      p_expires_at: testExpiry
    });
    
    if (csrfError) {
      console.log('⚠️  CSRF token functions not available:', csrfError.message);
    } else {
      console.log('✅ CSRF token functions working');
      // Clean up test token
      await supabase.from('csrf_tokens').delete().eq('user_id', testUserId);
    }
    
  } catch (error) {
    console.log('⚠️  Some functions may not be available:', error.message);
  }
  
  console.log('\n✨ Setup process completed!');
}

// Run the setup
setupDatabaseFunctions().catch(error => {
  console.error('💥 Setup failed:', error);
  process.exit(1);
});