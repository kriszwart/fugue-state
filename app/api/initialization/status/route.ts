import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('initialization_completed_at, muse_type, user_role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }

    // Check if user is a judge
    const isJudge = userProfile?.user_role === 'judge'

    // Check if initialization is completed
    // Judges skip initialization, so they're considered initialized
    const isInitialized = isJudge || userProfile?.initialization_completed_at !== null
    const needsInitialization = !isJudge && !isInitialized

    // Get connected data sources
    const { data: dataSources } = await supabase
      .from('data_sources')
      .select('source_type, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const connectedSourceTypes = dataSources?.map(ds => ds.source_type) || []

    return NextResponse.json({
      needsInitialization,
      isInitialized,
      museType: userProfile?.muse_type || null,
      connectedSources: connectedSourceTypes,
      userRole: userProfile?.user_role || 'user',
      isJudge
    })
  } catch (error: any) {
    console.error('Initialization status error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

