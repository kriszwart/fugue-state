#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const email = 'zwartifydesign@gmail.com';

  console.log('🔄 Resetting account for demo:', email);
  console.log('');

  // Get user
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ Found user ID:', user.id);
  console.log('');

  // Clear initialization flag
  const { error: profileError } = await supabase
    .from('users')
    .update({ initialization_completed_at: null })
    .eq('id', user.id);

  if (profileError) {
    console.log('⚠️  Error clearing initialization flag:', profileError.message);
  } else {
    console.log('✅ Cleared initialization flag');
  }

  // Delete all memories
  const { error: memError } = await supabase
    .from('memories')
    .delete()
    .eq('user_id', user.id);

  if (memError) {
    console.log('⚠️  Error deleting memories:', memError.message);
  } else {
    console.log('✅ Deleted all memories');
  }

  // Delete all data sources
  const { error: sourceError } = await supabase
    .from('data_sources')
    .delete()
    .eq('user_id', user.id);

  if (sourceError) {
    console.log('⚠️  Error deleting data sources:', sourceError.message);
  } else {
    console.log('✅ Deleted all data sources');
  }

  // Delete all artefacts
  const { error: artefactError } = await supabase
    .from('artefacts')
    .delete()
    .eq('user_id', user.id);

  if (artefactError) {
    console.log('⚠️  Error deleting artefacts:', artefactError.message);
  } else {
    console.log('✅ Deleted all artefacts');
  }

  // Reset muse type
  const { error: museError } = await supabase
    .from('users')
    .update({ muse_type: null })
    .eq('id', user.id);

  if (museError) {
    console.log('⚠️  Error resetting muse:', museError.message);
  } else {
    console.log('✅ Reset muse type');
  }

  console.log('');
  console.log('✨ Account reset complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Clear browser cookies for localhost');
  console.log('2. Go to http://localhost:3000/auth/login');
  console.log('3. Login with: zwartifydesign@gmail.com / Salvation235@');
  console.log('4. You should land on /initialization page');
  console.log('5. Click "Try Demo Memories" button at the top');
})();
