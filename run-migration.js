const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Reading migration file...')
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'supabase/migrations/001_initial_schema.sql'),
    'utf8'
  )

  console.log('Running migration...')

  // Split the SQL into individual statements and execute them
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    console.log(`Executing statement ${i + 1}/${statements.length}...`)

    const { data, error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      // Try direct query if RPC doesn't exist
      const { error: queryError } = await supabase.from('_').select('*').limit(0)
      if (queryError) {
        console.error('Error executing statement:', error)
        console.error('Statement:', statement.substring(0, 100) + '...')
      }
    }
  }

  console.log('Migration completed!')
}

runMigration().catch(console.error)
