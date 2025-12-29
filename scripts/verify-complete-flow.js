#!/usr/bin/env node

/**
 * Verify Complete User Flow Integration
 */

const fs = require('fs');
const path = require('path');

const checks = [];

try {
  // 1. Check signup checks waitlist
  const signup = fs.readFileSync('app/auth/signup/page.tsx', 'utf8');
  if (signup.includes('api/waitlist?email=')) {
    checks.push('✅ Signup checks waitlist status');
  } else {
    checks.push('❌ Signup does NOT check waitlist');
  }

  // 2. Check initialization has demo button
  const init = fs.readFileSync('app/initialization/page.tsx', 'utf8');
  if (init.includes('Load demo memories') && init.includes('handleLoadDemoData')) {
    checks.push('✅ Initialization has demo button');
  } else {
    checks.push('❌ Initialization missing demo button');
  }

  // 3. Check initialization routing
  if (init.includes("router.push('/studio/workspace')")) {
    checks.push('✅ Initialization routes to /studio/workspace');
  } else if (init.includes("router.push('/voice')")) {
    checks.push('⚠️  Initialization routes to /voice (old)');
  } else {
    checks.push('❌ Initialization routing unclear');
  }

  // 4. Check auto-create has muse-specific image enhancement
  const autoCreate = fs.readFileSync('app/api/muse/auto-create/route.ts', 'utf8');
  if (autoCreate.includes('enhancePromptForMuse')) {
    checks.push('✅ Auto-create has muse-specific image styles');
  } else {
    checks.push('❌ Auto-create missing muse styles');
  }

  // 5. Check auto-create uses parallelization
  if (autoCreate.includes('Promise.all')) {
    checks.push('✅ Auto-create parallelizes poem + collection');
  } else {
    checks.push('⚠️  Auto-create may be sequential');
  }

  // 6. Check voice page has localStorage fallback
  const voice = fs.readFileSync('app/voice/page.tsx', 'utf8');
  if (voice.includes('fugue_pending_artefacts') && voice.includes('/api/artefacts/recent')) {
    checks.push('✅ Voice page has localStorage + DB fallback');
  } else {
    checks.push('❌ Voice page missing fallback logic');
  }

  // 7. Check demo API endpoint exists
  if (fs.existsSync('app/api/demo/load/route.ts')) {
    checks.push('✅ Demo load API endpoint exists');
  } else {
    checks.push('❌ Demo load API missing');
  }

  // 8. Check demo dataset exists and is valid
  if (fs.existsSync('public/demo/demo_dataset.v1.json')) {
    const dataset = JSON.parse(fs.readFileSync('public/demo/demo_dataset.v1.json', 'utf8'));
    checks.push(`✅ Demo dataset exists (${dataset.memories.length} memories)`);
  } else {
    checks.push('❌ Demo dataset missing');
  }

  // 9. Check admin dashboard exists
  if (fs.existsSync('app/admin/waitlist/page.tsx')) {
    checks.push('✅ Admin waitlist dashboard exists');
  } else {
    checks.push('❌ Admin dashboard missing');
  }

  // 10. Check recent artefacts API exists
  if (fs.existsSync('app/api/artefacts/recent/route.ts')) {
    checks.push('✅ Recent artefacts API endpoint exists');
  } else {
    checks.push('❌ Recent artefacts API missing');
  }

  // 11. Check waitlist API endpoints exist
  if (fs.existsSync('app/api/waitlist/route.ts') && fs.existsSync('app/api/waitlist/admin/route.ts')) {
    checks.push('✅ Waitlist API endpoints exist');
  } else {
    checks.push('❌ Waitlist API incomplete');
  }

  console.log('\n🔍 Complete Flow Verification:\n');
  checks.forEach(c => console.log('   ' + c));
  console.log('');

  const failed = checks.filter(c => c.includes('❌')).length;
  const warnings = checks.filter(c => c.includes('⚠️')).length;
  const passed = checks.filter(c => c.includes('✅')).length;

  console.log(`📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Some checks failed. Please review the issues above.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  All critical checks passed, but there are warnings.\n');
  } else {
    console.log('✅ All checks passed! Your complete flow is ready.\n');
  }

} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}
