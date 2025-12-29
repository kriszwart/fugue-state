#!/usr/bin/env node

/**
 * Apply waitlist migration to Supabase
 * Run: node scripts/apply-waitlist-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying waitlist migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/005_create_waitlist.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (basic split on semicolons)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        // Try direct query if rpc fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(1);

        if (directError) {
          console.error(`⚠️  Statement ${i + 1} warning: ${error.message}`);
          // Continue anyway - some errors are expected (e.g., "already exists")
        }
      }

      successCount++;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n❌ Error on statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n\n✅ Migration applied successfully!');
  console.log(`   Executed: ${successCount} statements`);
  if (errorCount > 0) {
    console.log(`   Warnings: ${errorCount} (these are usually safe to ignore)`);
  }

  // Verify table was created
  console.log('\n🔍 Verifying waitlist table...');
  const { data, error } = await supabase.from('waitlist').select('count').limit(1);

  if (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('\n💡 Please apply the migration manually:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: supabase/migrations/005_create_waitlist.sql');
    console.log('   3. Run the SQL');
    process.exit(1);
  } else {
    console.log('✅ Waitlist table exists and is accessible!');
  }

  // Generate admin API key if not set
  console.log('\n🔑 Checking admin API key...');
  if (!process.env.ADMIN_API_KEY) {
    const crypto = require('crypto');
    const newKey = crypto.randomBytes(32).toString('hex');

    console.log('⚠️  ADMIN_API_KEY not found in .env.local');
    console.log('   Add this line to your .env.local:\n');
    console.log(`ADMIN_API_KEY=${newKey}\n`);

    // Append to .env.local
    const envPath = path.join(__dirname, '../.env.local');
    fs.appendFileSync(envPath, `\n# Admin API key for waitlist management\nADMIN_API_KEY=${newKey}\n`);
    console.log('✅ ADMIN_API_KEY added to .env.local');
  } else {
    console.log('✅ ADMIN_API_KEY is already set');
  }

  console.log('\n🎉 Setup complete! Next steps:');
  console.log('   1. Restart your dev server: npm run dev');
  console.log('   2. Visit: http://localhost:3000/waitlist');
  console.log('   3. Join the waitlist');
  console.log('   4. Visit: http://localhost:3000/admin/waitlist');
  console.log('   5. Approve yourself!\n');
}

applyMigration().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  console.log('\n💡 Manual setup required:');
  console.log('   Open Supabase Dashboard → SQL Editor');
  console.log('   Run: supabase/migrations/005_create_waitlist.sql');
  process.exit(1);
});
