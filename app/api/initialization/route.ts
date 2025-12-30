import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { museType, dataSources: _dataSources, skip } = await request.json()

    // If skip flag is set, just mark skip status and return
    if (skip) {
      const updateData: any = {
        skipped_initialization_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating skip status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update skip status' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Initialization skipped',
        skipped: true
      })
    }

    // Validate muse type
    const validMuseTypes = ['analyst', 'poet', 'visualist', 'narrator', 'synthesis']
    if (museType && !validMuseTypes.includes(museType)) {
      return NextResponse.json(
        { error: 'Invalid muse type' },
        { status: 400 }
      )
    }

    // Update user profile with initialization data
    const updateData: any = {
      initialization_completed_at: new Date().toISOString()
    }

    if (museType) {
      updateData.muse_type = museType
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user initialization:', updateError)
      return NextResponse.json(
        { error: 'Failed to update initialization status' },
        { status: 500 }
      )
    }

    // If data sources are provided, we'll trigger OAuth flows
    // The actual OAuth connection happens via /api/oauth/connect
    // This endpoint just marks initialization as complete
    // The frontend should handle triggering OAuth flows for selected sources

    return NextResponse.json({
      success: true,
      message: 'Initialization completed',
      museType: museType || null
    })
  } catch (error: any) {
    console.error('Initialization completion error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}


























