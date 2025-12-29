#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 Checking zwartifydesign@gmail.com account data...\n');

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'zwartifydesign@gmail.com');

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User ID:', user.id);
  console.log('');

  // Check initialization status
  const { data: profile } = await supabase
    .from('users')
    .select('initialization_completed_at')
    .eq('id', user.id)
    .single();

  console.log('📋 Initialization Status:');
  console.log('   Completed:', profile?.initialization_completed_at || 'Not yet');
  console.log('');

  // Check memories
  const { data: memories, count: memCount } = await supabase
    .from('memories')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id);

  console.log('💾 Memories:', memCount || 0);
  if (memCount > 0) {
    console.log('   (You have existing memories, so middleware skips initialization)');
  }
  console.log('');

  // Check data sources
  const { data: sources, count: sourceCount } = await supabase
    .from('data_sources')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('is_active', true);

  console.log('🔌 Active Data Sources:', sourceCount || 0);
  if (sourceCount > 0) {
    console.log('   (You have data sources, so middleware skips initialization)');
  }
  console.log('');

  if (memCount > 0 || sourceCount > 0 || profile?.initialization_completed_at) {
    console.log('✅ You were redirected to workspace because:');
    if (profile?.initialization_completed_at) console.log('   - Initialization was completed before');
    if (memCount > 0) console.log('   - You have', memCount, 'memories');
    if (sourceCount > 0) console.log('   - You have', sourceCount, 'active data sources');
    console.log('');
    console.log('💡 To start fresh with initialization:');
    console.log('   Option 1: Clear your data and visit /initialization');
    console.log('   Option 2: Visit /initialization directly (it may redirect you back)');
  } else {
    console.log('⚠️ No data found, but you were redirected to workspace?');
    console.log('   This might be a middleware issue.');
  }
})();
