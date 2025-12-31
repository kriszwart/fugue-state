#!/usr/bin/env tsx

/**
 * Generate Judge Invite Codes
 *
 * This script generates invite codes for judges and inserts them into the database.
 *
 * Usage:
 *   npm run generate-invite-codes
 *   npm run generate-invite-codes -- --email judge@example.com --code CUSTOM123
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nMake sure these are set in your .env.local file')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined
}

const email = getArg('--email')
const customCode = getArg('--code')
const count = parseInt(getArg('--count') || '1', 10)

/**
 * Generate a random invite code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length))
  }
  return code
}

/**
 * Create invite codes in the database
 */
async function createInviteCodes() {
  console.log('🎫 Generating Judge Invite Codes...\n')

  if (email && customCode) {
    // Single invite code with custom code
    const code = customCode.toUpperCase()
    console.log(`Creating invite code: ${code}`)
    console.log(`For email: ${email}\n`)

    const { error } = await supabase
      .from('invite_codes')
      .insert({
        code,
        email,
        role: 'judge',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        is_active: true
      })
      .select()

    if (error) {
      console.error('❌ Error creating invite code:', error.message)
      process.exit(1)
    }

    console.log('✅ Invite code created successfully!')
    console.log('\n📋 Share this with the judge:')
    console.log('━'.repeat(60))
    console.log(`Code: ${code}`)
    console.log(`Email: ${email}`)
    console.log(`Signup URL: https://www.fuguestate.ai/auth/judge-signup?code=${code}&email=${encodeURIComponent(email)}`)
    console.log('━'.repeat(60))
  } else if (count > 0) {
    // Generate multiple generic codes
    console.log(`Generating ${count} invite code(s)...\n`)

    const codes = []
    for (let i = 0; i < count; i++) {
      codes.push({
        code: generateCode(),
        email: `judge${i + 1}@example.com`, // Placeholder email
        role: 'judge',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      })
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .insert(codes)
      .select()

    if (error) {
      console.error('❌ Error creating invite codes:', error.message)
      process.exit(1)
    }

    console.log('✅ Invite codes created successfully!\n')
    console.log('📋 Generated Codes:')
    console.log('━'.repeat(60))
    data?.forEach((code: any, index: number) => {
      console.log(`${index + 1}. Code: ${code.code}`)
      console.log(`   Signup URL: https://www.fuguestate.ai/auth/judge-signup?code=${code.code}`)
      console.log('')
    })
    console.log('━'.repeat(60))
    console.log('\n💡 Tip: Update the email field in Supabase dashboard or regenerate with --email flag')
  } else {
    console.log('Usage examples:')
    console.log('  npm run generate-invite-codes -- --email judge@example.com --code JUDGE2025')
    console.log('  npm run generate-invite-codes -- --count 5')
    console.log('  npm run generate-invite-codes -- --email judge@hackathon.com')
  }
}

// Run the script
createInviteCodes().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
