import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * Get pipeline run history for a user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100)
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0)
    const memoryId = searchParams.get('memoryId')

    let query = supabase
      .from('pipeline_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (memoryId) {
      query = query.eq('memory_id', memoryId)
    }

    const { data: runs, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Get total count
    let countQuery = supabase
      .from('pipeline_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (memoryId) {
      countQuery = countQuery.eq('memory_id', memoryId)
    }

    const { count } = await countQuery

    return NextResponse.json({
      runs: runs || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Pipeline history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get pipeline history' },
      { status: 500 }
    )
  }
}












