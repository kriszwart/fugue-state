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

    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      )
    }

    // Search memories by content
    // Using simple text search - could be enhanced with vector search later
    const { data: memories, error } = await supabase
      .from('memories')
      .select('id, content, content_type, themes, emotional_tags, temporal_marker, extracted_data')
      .eq('user_id', user.id)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 10)) // Cap at 10 results

    if (error) {
      throw error
    }

    if (!memories || memories.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No memories found matching "${query}".`,
        memories: []
      })
    }

    // Format memories for the agent
    const formattedMemories = memories.map(m => ({
      content: m.content.substring(0, 300) + (m.content.length > 300 ? '...' : ''),
      themes: m.themes?.join(', ') || 'none',
      emotions: m.emotional_tags?.join(', ') || 'none',
      date: m.temporal_marker || 'unknown',
      source: m.extracted_data?.filename || m.extracted_data?.name || m.content_type
    }))

    return NextResponse.json({
      success: true,
      message: `Found ${memories.length} memories matching "${query}".`,
      memories: formattedMemories
    })
  } catch (error: any) {
    console.error('Search memories tool error:', error)
    return NextResponse.json(
      { success: false, message: `Search failed: ${error.message}` },
      { status: 500 }
    )
  }
}
