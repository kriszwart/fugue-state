import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getMemoryAnalyzer } from '@/lib/ai/memory-analyzer'

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

    const { memoryIds, limit } = await request.json()

    // Load memories
    let query = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (memoryIds && Array.isArray(memoryIds)) {
      query = query.in('id', memoryIds)
    }

    if (limit) {
      query = query.limit(limit)
    } else {
      query = query.limit(50) // Default limit
    }

    const { data: memories, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!memories || memories.length === 0) {
      return NextResponse.json({
        analysis: {
          emotionalPatterns: [],
          themes: [],
          connections: [],
          narrative: 'No memories to analyze.',
          insights: []
        }
      })
    }

    // Analyze using thinking model
    const analyzer = getMemoryAnalyzer()
    const analysis = await analyzer.analyzeMemories(
      memories.map(m => ({
        id: m.id,
        content: m.content,
        themes: m.themes || [],
        emotionalTags: m.emotional_tags || [],
        temporalMarker: m.temporal_marker
      }))
    )

    // Check if this is user's first pattern detection
    const { count: existingPatternCount } = await supabase
      .from('memory_patterns')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    const isFirstPattern = (existingPatternCount || 0) === 0

    // Save analysis as memory patterns
    for (const theme of analysis.themes) {
      await supabase.from('memory_patterns').upsert({
        user_id: user.id,
        pattern_type: 'thematic',
        pattern_data: {
          name: theme,
          description: `Theme identified through AI analysis`,
          confidence: 0.8
        },
        confidence_score: 0.8,
        memory_ids: memories.map(m => m.id)
      }, {
        onConflict: 'user_id,pattern_type'
      })
    }

    return NextResponse.json({
      analysis,
      memoriesAnalyzed: memories.length,
      isFirstPattern: isFirstPattern,
      onboardingEvent: isFirstPattern ? 'patternDetected' : null
    })
  } catch (error: any) {
    console.error('Memory analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}

























