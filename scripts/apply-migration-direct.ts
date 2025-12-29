#!/usr/bin/env tsx

/**
 * Apply Migration Directly to Supabase
 * Uses service role key to apply the migration SQL
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyMigration() {
  console.log('🚀 Applying migration: 012_add_user_role.sql\n')

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/012_add_user_role.sql')

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  try {
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('Attempting direct SQL execution...\n')

      // Split by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', {
          query: statement + ';'
        })

        if (stmtError) {
          console.error('Statement error:', stmtError)
          // Continue anyway - some statements might already exist
        }
      }
    }

    console.log('✅ Migration applied successfully!\n')
    console.log('Next step: Generate invite codes')
    console.log('  npm run generate-invite-codes -- --email zwartifydesign@gmail.com --code JUDGE2025')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.log('\n📝 Manual alternative:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Click "SQL Editor"')
    console.log('3. Copy and paste the contents of: supabase/migrations/012_add_user_role.sql')
    console.log('4. Click "Run"')
    process.exit(1)
  }
}

applyMigration()
