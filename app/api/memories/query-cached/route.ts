/**
 * Cached Memory Query API
 *
 * Uses context caching for 60% cost savings
 * Answers questions about user's memories using cached context
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getMemoryCacheManager } from '@/lib/ai/memory-cache-manager'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const cacheManager = getMemoryCacheManager()

    // Query using cached context (60% cheaper!)
    const result = await cacheManager.queryMemories(user.id, query)

    // Get cache stats
    const stats = cacheManager.getCacheStats(user.id)

    return NextResponse.json({
      success: true,
      answer: result.answer,
      thinking: result.thinking,
      usage: result.usage,
      cacheStats: stats
    })
  } catch (error: any) {
    console.error('Cached query error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to query memories' },
      { status: 500 }
    )
  }
}

// Get cache stats without making a query
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cacheManager = getMemoryCacheManager()
    const stats = cacheManager.getCacheStats(user.id)

    return NextResponse.json({
      success: true,
      cacheStats: stats
    })
  } catch (error: any) {
    console.error('Cache stats error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
