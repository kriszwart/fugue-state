#!/usr/bin/env node

/**
 * Cleanup Test Data
 * Removes test entries created during verification
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function cleanup() {
  console.log('🧹 Cleaning up test data...\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // 1. Remove test waitlist entries
    console.log('1️⃣  Removing test waitlist entries...');

    const { data: entries, error: fetchError } = await supabase
      .from('waitlist')
      .select('email, id')
      .or('email.like.%test%,email.like.%example%');

    if (fetchError) {
      console.log('   ⚠️  Could not fetch test entries:', fetchError.message);
    } else if (entries && entries.length > 0) {
      console.log(`   Found ${entries.length} test entries:`);
      entries.forEach(e => console.log(`      - ${e.email}`));

      const { error: deleteError } = await supabase
        .from('waitlist')
        .delete()
        .or('email.like.%test%,email.like.%example%');

      if (deleteError) {
        console.log('   ❌ Error removing entries:', deleteError.message);
      } else {
        console.log(`   ✅ Removed ${entries.length} test entries\n`);
      }
    } else {
      console.log('   ✅ No test entries found (already clean)\n');
    }

    // 2. Show current waitlist status
    console.log('2️⃣  Current waitlist status...');
    const { data: remaining, error: countError, count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact' });

    if (countError) {
      console.log('   ⚠️  Could not fetch status');
    } else {
      console.log(`   Total entries: ${count || 0}`);
      if (remaining && remaining.length > 0) {
        console.log('   Entries:');
        remaining.forEach(e => {
          console.log(`      - ${e.email} (${e.status})`);
        });
      } else {
        console.log('   (Empty - ready for fresh testing)');
      }
      console.log('');
    }

    console.log('✅ Cleanup complete!\n');
    console.log('🎯 You now have a clean slate for testing:\n');
    console.log('   Test 1: Load demo data');
    console.log('      → http://localhost:3000/initialization');
    console.log('      → Scroll down and click "Load demo memories"\n');
    console.log('   Test 2: Join waitlist');
    console.log('      → http://localhost:3000/waitlist');
    console.log('      → Use a real email you control\n');
    console.log('   Test 3: Approve from admin');
    console.log('      → http://localhost:3000/admin/waitlist');
    console.log('      → API key: 750bb0f...707b\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanup();
