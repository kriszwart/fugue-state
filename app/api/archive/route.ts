import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const theme = searchParams.get('theme')
    const emotion = searchParams.get('emotion')
    const search = searchParams.get('search')

    let query = supabase
      .from('memories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (theme) {
      query = query.contains('themes', [theme])
    }

    if (emotion) {
      query = query.contains('emotional_tags', [emotion])
    }

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Get total count
    const { count } = await supabase
      .from('memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      memories: data,
      total: count || 0,
      limit,
      offset
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
























