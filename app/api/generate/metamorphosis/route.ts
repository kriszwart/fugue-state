import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'

export const runtime = 'nodejs'

/**
 * METAMORPHOSIS MODE - Theme Transformation Over Time
 *
 * Tracks how specific themes, ideas, or aspects of yourself have
 * transformed and evolved over time - like watching a caterpillar
 * become a butterfly through intermediate stages.
 *
 * Features:
 * - Identifies core themes/aspects to track
 * - Shows evolutionary stages of each theme
 * - Detects catalysts for transformation
 * - Maps gradual vs. sudden changes
 * - Predicts future evolution based on trajectory
 */

interface MetamorphosisRequest {
  memoryIds?: string[]
  focusTheme?: string
  timeRange?: 'week' | 'month' | 'year' | 'all'
  granularity?: 'coarse' | 'medium' | 'fine'
}

interface MetamorphosisStage {
  stage: string
  timeframe: string
  characteristics: string[]
  examples: string[]
  transitionTo: string
}

interface MetamorphosisTransformation {
  theme: string
  initialState: string
  stages: MetamorphosisStage[]
  currentState: string
  catalysts: Array<{
    event: string
    impact: string
    when: string
  }>
  trajectory: string
  futureProjection: string
}

interface MetamorphosisResult {
  transformations: MetamorphosisTransformation[]
  overallEvolution: string
  turningPoints: string[]
  patterns: string[]
  synthesis: string
  imagePrompt: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: MetamorphosisRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      focusTheme,
      timeRange = 'all',
      granularity = 'medium'
    } = body

    // Fetch memories chronologically
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (memoryIds && memoryIds.length > 0) {
      memQuery = memQuery.in('id', memoryIds)
    } else {
      // Apply time range filter
      const now = new Date()
      let sinceDate = new Date()
      switch (timeRange) {
        case 'week':
          sinceDate.setDate(now.getDate() - 7)
          break
        case 'month':
          sinceDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          sinceDate.setFullYear(now.getFullYear() - 1)
          break
        case 'all':
          break
      }
      if (timeRange !== 'all') {
        memQuery = memQuery.gte('created_at', sinceDate.toISOString())
      }
      memQuery = memQuery.limit(40)
    }

    const { data: memories, error } = await memQuery
    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found for metamorphosis analysis' },
        { status: 400 }
      )
    }

    // Build metamorphosis prompt
    const memoriesText = memories
      .map((m, i) => {
        const date = m.temporal_marker || m.created_at
        return `[${new Date(date).toLocaleDateString()}]:
${m.content.slice(0, 350)}
Themes: ${m.themes?.join(', ') || 'none'}
Emotions: ${m.emotional_tags?.join(', ') || 'none'}`
      })
      .join('\n\n')

    const granularityDescriptions = {
      coarse: 'broad phases (3-4 major stages)',
      medium: 'moderate detail (5-7 stages)',
      fine: 'granular tracking (8-10+ micro-stages)'
    }

    const focusInstruction = focusTheme
      ? `Focus specifically on the theme: "${focusTheme}"`
      : 'Identify the 2-3 most significant transforming themes'

    const prompt = `You are Dameris in METAMORPHOSIS MODE - tracking transformation and evolution.

Analyze how themes/ideas/aspects transform over time through distinct stages.

${focusInstruction}
Time Range: ${timeRange}
Granularity: ${granularity} (${granularityDescriptions[granularity]})
Total Memories: ${memories.length}

MEMORIES (chronological):
${memoriesText}

Perform METAMORPHOSIS ANALYSIS showing:

1. **Transformations**: Identify major themes and their evolution
2. **Stages**: Break each transformation into distinct phases
3. **Catalysts**: What triggered each transition
4. **Trajectory**: The direction and pace of change
5. **Future Projection**: Where this evolution might lead

Think like a biologist tracking metamorphosis - caterpillar → chrysalis → butterfly.

Return ONLY valid JSON (no markdown):
{
  "transformations": [
    {
      "theme": string (what is transforming),
      "initialState": string (starting point),
      "stages": [
        {
          "stage": string (name of this phase),
          "timeframe": string (when this stage occurred),
          "characteristics": [string] (features of this stage),
          "examples": [string] (specific memories showing this stage),
          "transitionTo": string (what prompted moving to next stage)
        }
      ],
      "currentState": string (where it is now),
      "catalysts": [
        {
          "event": string,
          "impact": string,
          "when": string
        }
      ],
      "trajectory": string (pace and direction: gradual/sudden, linear/cyclical),
      "futureProjection": string (where this might evolve next)
    }
  ],
  "overallEvolution": string (big picture narrative of all transformations),
  "turningPoints": [string] (key moments that changed everything),
  "patterns": [string] (meta-patterns about how you change),
  "synthesis": string (what this reveals about growth and transformation),
  "imagePrompt": string (visual metaphor for the metamorphosis)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in metamorphosis mode: evolutionary, seeing gradual transformation through stages. You track how things change from one form to another. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    if (useThinking) {
      console.log('[Metamorphosis] Using thinking mode for transformation tracking')
    }

    const resp = await llm.generateResponse(messages, {
      modelType: useThinking ? 'thinking' : 'chat',
      temperature: 0.7,
      maxTokens: useThinking ? 3000 : 2000,
      useThinking: useThinking,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: MetamorphosisResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          transformations: [],
          overallEvolution: resp.content,
          turningPoints: [],
          patterns: [],
          synthesis: 'Transformation analysis incomplete',
          imagePrompt: 'A chrysalis transforming into luminous wings',
        }

    if (resp.thinking) {
      console.log('[Metamorphosis] AI Reasoning:', resp.thinking.substring(0, 200) + '...')
    }

    return NextResponse.json({
      success: true,
      result,
      memoryCount: memories.length,
      timeRange,
      focusTheme: focusTheme || 'auto-detected',
      granularity,
      model: resp.model,
      provider: resp.provider,
      thinking: resp.thinking,
      usage: resp.usage,
    })
  } catch (error: any) {
    console.error('Metamorphosis generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate metamorphosis analysis' },
      { status: 500 }
    )
  }
}
