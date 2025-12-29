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

    const { limit = 20 } = await request.json()

    // Get recent memories to analyze
    const { data: memories, error } = await supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50)) // Cap at 50 memories

    if (error) {
      throw error
    }

    if (!memories || memories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No memories found to analyze. Try uploading some notes or connecting a data source first.'
      })
    }

    // Analyze memories
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

    // Format analysis for the agent
    const formattedAnalysis = {
      themes: analysis.themes.slice(0, 5).join(', '),
      emotions: analysis.emotionalPatterns.slice(0, 5).join(', '),
      narrative: analysis.narrative,
      insights: analysis.insights.slice(0, 3),
      missingIdeas: analysis.missingIdeas?.slice(0, 3) || []
    }

    return NextResponse.json({
      success: true,
      message: `Analyzed ${memories.length} memories.`,
      analysis: formattedAnalysis
    })
  } catch (error: any) {
    console.error('Analyze tool error:', error)
    return NextResponse.json(
      { success: false, message: `Analysis failed: ${error.message}` },
      { status: 500 }
    )
  }
}
