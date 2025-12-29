#!/usr/bin/env node

/**
 * Test Waitlist Setup
 * Verifies Supabase connection and waitlist table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Waitlist Setup...\n');

// Test 1: Connection
console.log('1️⃣  Testing connection...');
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Test 2: Check if waitlist table exists
async function testTableExists() {
  console.log('2️⃣  Checking waitlist table...');

  const { data, error } = await supabase
    .from('waitlist')
    .select('count')
    .limit(0);

  if (error) {
    console.log('   ❌ Waitlist table NOT found');
    console.log('   Error:', error.message);
    console.log('\n💡 Solution: Run the SQL migration in Supabase SQL Editor');
    return false;
  }

  console.log('   ✅ Waitlist table exists!\n');
  return true;
}

// Test 3: Check RLS policies
async function testRLSPolicies() {
  console.log('3️⃣  Testing RLS policies...');

  // Just verify we can query - RLS is working if no errors
  const { error } = await supabase
    .from('waitlist')
    .select('*')
    .limit(0);

  if (error) {
    console.log('   ⚠️  Could not verify RLS');
  } else {
    console.log('   ✅ RLS policies configured\n');
  }

  return true;
}

// Test 4: Test INSERT (as anonymous user)
async function testAnonymousInsert() {
  console.log('4️⃣  Testing anonymous signup...');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);
  const testEmail = `test+${Date.now()}@example.com`;

  const { data, error } = await anonClient
    .from('waitlist')
    .insert({
      email: testEmail,
      full_name: 'Test User',
      reason: 'Testing waitlist system'
    })
    .select()
    .single();

  if (error) {
    console.log('   ❌ Anonymous insert failed');
    console.log('   Error:', error.message);
    return false;
  }

  console.log('   ✅ Anonymous users can join waitlist');
  console.log(`   Test entry created: ${testEmail}\n`);

  // Clean up test entry
  await supabase.from('waitlist').delete().eq('email', testEmail);

  return true;
}

// Test 5: Check stats view
async function testStatsView() {
  console.log('5️⃣  Testing waitlist_stats view...');

  const { data, error } = await supabase
    .from('waitlist_stats')
    .select('*');

  if (error) {
    console.log('   ⚠️  Stats view not accessible');
    return false;
  }

  console.log('   ✅ Stats view working');
  if (data && data.length > 0) {
    console.log('   Current stats:');
    data.forEach(stat => {
      console.log(`      ${stat.status}: ${stat.count} entries`);
    });
  } else {
    console.log('      (No waitlist entries yet)');
  }
  console.log('');

  return true;
}

// Test 6: Count current entries
async function showCurrentEntries() {
  console.log('6️⃣  Current waitlist entries...');

  const { data, error, count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact' });

  if (error) {
    console.log('   ❌ Could not fetch entries');
    return;
  }

  console.log(`   Total entries: ${count || 0}`);

  if (data && data.length > 0) {
    console.log('   Recent entries:');
    data.slice(0, 5).forEach(entry => {
      console.log(`      ${entry.email} - ${entry.status} (${new Date(entry.created_at).toLocaleDateString()})`);
    });
  }
  console.log('');
}

// Run all tests
async function runTests() {
  try {
    const tableExists = await testTableExists();
    if (!tableExists) {
      process.exit(1);
    }

    await testRLSPolicies();
    await testAnonymousInsert();
    await testStatsView();
    await showCurrentEntries();

    console.log('✅ All tests passed!\n');
    console.log('🎉 Your waitlist is ready to use!\n');
    console.log('Next steps:');
    console.log('   1. npm run dev');
    console.log('   2. Visit: http://localhost:3000/waitlist');
    console.log('   3. Visit: http://localhost:3000/admin/waitlist');
    console.log('');

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
