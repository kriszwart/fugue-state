/**
 * Deep Life Analysis
 * Analyzes user's ENTIRE memory corpus using extended context (2M tokens)
 * Finds patterns across years, generates life narrative, profound insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getEnhancedVertexGeminiLLM } from '@/lib/ai/providers/vertex-enhanced'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for deep analysis

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Deep Analysis] Starting for user ${user.id}...`)

    // Load ALL user memories (Gemini can handle up to 2M tokens!)
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select('id, title, content, themes, emotional_tags, created_at, media_type, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (memoriesError || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found to analyze' },
        { status: 404 }
      )
    }

    console.log(`[Deep Analysis] Processing ${memories.length} memories...`)

    // Format as complete life narrative
    const lifeNarrative = memories.map((m, i) => {
      const dateStr = new Date(m.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      return `═══ Memory ${i + 1} of ${memories.length} ═══
Date: ${dateStr}
${m.title ? `Title: ${m.title}` : ''}
Type: ${m.media_type || 'text'}

Content:
${m.content}

${m.themes && m.themes.length > 0 ? `Themes: ${m.themes.join(', ')}` : ''}
${m.emotional_tags && m.emotional_tags.length > 0 ? `Emotions: ${m.emotional_tags.join(', ')}` : ''}
${m.metadata ? `\nContext: ${JSON.stringify(m.metadata).substring(0, 200)}` : ''}
`
    }).join('\n\n─────────────────────────────────\n\n')

    const gemini = getEnhancedVertexGeminiLLM()

    // Calculate timespan
    const firstDate = new Date(memories[0].created_at)
    const lastDate = new Date(memories[memories.length - 1].created_at)
    const daysDiff = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    const yearsDiff = (daysDiff / 365).toFixed(1)

    console.log(`[Deep Analysis] Timespan: ${yearsDiff} years (${memories.length} memories)`)

    // Cache the corpus for reuse (60% cost savings on future queries!)
    let cachedContext
    try {
      cachedContext = await gemini.cacheContext([{
        role: 'system',
        content: `You are Dameris, a profound life analyst. You are analyzing someone's complete memory corpus spanning ${yearsDiff} years with ${memories.length} memories. This is their entire documented life story. Approach this with deep empathy, wisdom, and insight.`
      }, {
        role: 'user',
        content: `Here is my complete life journal:\n\n${lifeNarrative}`
      }], {
        ttl: 7200, // 2 hours
        displayName: `Deep Life Analysis - User ${user.id}`
      })

      console.log('[Deep Analysis] ✓ Context cached:', cachedContext.name.split('/').pop())
    } catch (error) {
      console.warn('[Deep Analysis] Caching failed, continuing without cache:', error)
    }

    // Run deep analysis using thinking mode
    const analysisResponse = await gemini.generateWithThinking([{
      role: 'user',
      content: `Perform a deep, comprehensive analysis of this life journal. Think deeply and take your time.

## Your Analysis Must Include:

### 1. LIFE NARRATIVE (The Story Arc)
Write a 3-4 paragraph narrative that tells the story of this person's life based on their memories. What is the overall arc? What journey have they been on?

### 2. MAJOR LIFE THEMES (5-10 themes)
Identify the major recurring themes that span across time. For each theme:
- Name of theme
- How it evolved over time
- Key memories that exemplify it
- Current state

### 3. EMOTIONAL EVOLUTION
Track how emotions have changed over time:
- Early period emotions
- Middle period emotions
- Recent emotions
- Overall trajectory (improving, declining, cyclical, stable)

### 4. LIFE CHAPTERS
Divide their life into distinct chapters/phases based on memory patterns:
- Chapter name and timeframe
- Defining characteristics
- Major events/transitions
- Emotional tone

### 5. HIDDEN PATTERNS
Find non-obvious connections and patterns:
- Recurring situations or dynamics
- Unconscious patterns
- Cycles or rhythms
- Symbolic themes

### 6. TURNING POINTS
Identify 3-5 pivotal moments where something shifted:
- What happened
- What changed
- Impact on later memories

### 7. STRENGTHS & GROWTH
What positive patterns emerge?
- Personal strengths shown
- Growth over time
- Resilience examples
- Wisdom gained

### 8. AREAS FOR REFLECTION
Gentle observations about patterns that might benefit from awareness:
- Recurring challenges
- Blind spots
- Opportunities for growth

### 9. FUTURE INSIGHTS
Based on patterns, what might be helpful going forward?
- Recommendations
- Things to watch for
- Opportunities ahead

### 10. SYNTHESIS
A profound, poetic summary (2-3 paragraphs) that captures the essence of who this person is based on their memories. What is their core story?

Be profound, empathetic, and insightful. This is someone's life.`
    }], {
      cachedContext: cachedContext?.name,
      useThinking: true,
      temperature: 0.8,
      maxTokens: 8192 // Large output for comprehensive analysis
    })

    console.log('[Deep Analysis] ✓ Analysis complete')
    console.log('[Deep Analysis] Tokens:', {
      total: analysisResponse.usage?.totalTokens,
      cached: analysisResponse.usage?.cachedTokens,
      savings: `${((analysisResponse.usage?.cachedTokens || 0) / (analysisResponse.usage?.totalTokens || 1) * 100).toFixed(0)}%`
    })

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        type: 'deep_life_analysis',
        title: 'Deep Life Analysis',
        content: analysisResponse.content,
        metadata: {
          memoryCount: memories.length,
          timespan: {
            start: memories[0].created_at,
            end: memories[memories.length - 1].created_at,
            years: parseFloat(yearsDiff),
            days: daysDiff
          },
          model: analysisResponse.model,
          thinking: analysisResponse.thinking,
          usage: analysisResponse.usage,
          cachedContextId: cachedContext?.name
        }
      })
      .select()
      .single()

    if (saveError) {
      console.error('[Deep Analysis] Save error:', saveError)
    } else {
      console.log('[Deep Analysis] ✓ Saved:', savedAnalysis.id)
    }

    return NextResponse.json({
      success: true,
      analysis: {
        id: savedAnalysis?.id,
        content: analysisResponse.content,
        thinking: analysisResponse.thinking,
        stats: {
          memoriesAnalyzed: memories.length,
          timespan: {
            years: parseFloat(yearsDiff),
            days: daysDiff,
            from: firstDate.toLocaleDateString(),
            to: lastDate.toLocaleDateString()
          },
          tokensUsed: analysisResponse.usage?.totalTokens,
          tokensCached: analysisResponse.usage?.cachedTokens,
          costSavings: `${((analysisResponse.usage?.cachedTokens || 0) / (analysisResponse.usage?.totalTokens || 1) * 100).toFixed(0)}%`,
          model: analysisResponse.model
        }
      }
    })
  } catch (error: any) {
    console.error('[Deep Analysis] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform analysis' },
      { status: 500 }
    )
  }
}

// Get previous analyses
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: analyses, error } = await supabase
      .from('analyses')
      .select('id, title, created_at, metadata')
      .eq('user_id', user.id)
      .eq('type', 'deep_life_analysis')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      analyses: analyses || []
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
