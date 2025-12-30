import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// Public API endpoint for external integration
export async function GET(request: NextRequest) {
  try {
    // API key authentication
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ memories: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

























