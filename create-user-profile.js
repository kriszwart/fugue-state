const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

async function createUserProfiles() {
  // Get all auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('Error fetching auth users:', authError)
    return
  }

  console.log(`Found ${authUsers.users.length} auth users`)

  for (const authUser of authUsers.users) {
    // Check if profile exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single()

    if (existingUser) {
      console.log(`Profile already exists for ${authUser.email}`)
      continue
    }

    // Create user profile
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email
      })

    if (insertError) {
      console.error(`Error creating profile for ${authUser.email}:`, insertError)
    } else {
      console.log(`✓ Created profile for ${authUser.email}`)
    }
  }
}

createUserProfiles().then(() => console.log('Done!'))
