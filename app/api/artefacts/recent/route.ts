import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50)
    const within = Math.min(Math.max(Number(searchParams.get('within') || 300), 10), 3600) // seconds

    // Get artefacts created within the last N seconds
    const cutoff = new Date(Date.now() - within * 1000).toISOString()

    const { data: artefacts, error } = await supabase
      .from('artefacts')
      .select('id, artefact_type, title, description, file_url, metadata, created_at, memory_id')
      .eq('user_id', user.id)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      artefacts: artefacts || [],
      count: artefacts?.length || 0
    })
  } catch (error: any) {
    console.error('Recent artefacts error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recent artefacts' },
      { status: 500 }
    )
  }
}
