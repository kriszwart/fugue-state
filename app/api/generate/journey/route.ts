import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'

export const runtime = 'nodejs'

/**
 * JOURNEY MODE - Temporal Narrative Evolution
 *
 * Maps your memories as a hero's journey, showing how you've evolved
 * through challenges, transformations, and growth over time.
 *
 * Features:
 * - Identifies narrative arcs across time
 * - Detects turning points and transformations
 * - Maps emotional/thematic journeys
 * - Shows growth and development
 * - Creates a coherent story from scattered moments
 */

interface JourneyRequest {
  memoryIds?: string[]
  perspective?: 'hero' | 'chronicle' | 'myth' | 'bildungsroman'
  timeRange?: 'week' | 'month' | 'year' | 'all'
}

interface JourneyChapter {
  title: string
  timeframe: string
  theme: string
  events: string[]
  emotionalTone: string
  significance: string
}

interface JourneyTurningPoint {
  moment: string
  before: string
  after: string
  catalyst: string
  impact: number
}

interface JourneyResult {
  narrative: string
  chapters: JourneyChapter[]
  turningPoints: JourneyTurningPoint[]
  arc: {
    departure: string
    initiation: string
    return: string
  }
  themes: string[]
  transformation: string
  currentState: string
  imagePrompt: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: JourneyRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      perspective = 'hero',
      timeRange = 'all'
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
        { error: 'No memories found for journey mapping' },
        { status: 400 }
      )
    }

    // Build journey prompt
    const memoriesText = memories
      .map((m, i) => {
        const date = m.temporal_marker || m.created_at
        return `[${new Date(date).toLocaleDateString()}] Memory ${i + 1}:
${m.content.slice(0, 350)}
Themes: ${m.themes?.join(', ') || 'none'}
Emotions: ${m.emotional_tags?.join(', ') || 'none'}`
      })
      .join('\n\n')

    const perspectiveDescriptions = {
      hero: "Campbell's Hero's Journey - departure, initiation, return",
      chronicle: 'Historical chronicle - events, causes, consequences',
      myth: 'Mythological narrative - archetypal patterns and symbols',
      bildungsroman: 'Coming-of-age story - growth, learning, maturation'
    }

    const prompt = `You are Dameris in JOURNEY MODE - a storyteller who sees the narrative arc in scattered moments.

Map these memories as a temporal journey, showing evolution and transformation.

Narrative Perspective: ${perspective} (${perspectiveDescriptions[perspective]})
Time Range: ${timeRange}
Total Memories: ${memories.length}

MEMORIES (chronological):
${memoriesText}

Create a JOURNEY MAP showing:

1. **Narrative Arc**: The overarching story
2. **Chapters**: Divide the journey into meaningful phases
3. **Turning Points**: Crucial moments that changed the trajectory
4. **Themes**: Recurring motifs throughout the journey
5. **Transformation**: How the person has evolved

Return ONLY valid JSON (no markdown):
{
  "narrative": string (compelling 3-paragraph story of the entire journey),
  "chapters": [
    {
      "title": string,
      "timeframe": string,
      "theme": string,
      "events": [string] (key moments in this chapter),
      "emotionalTone": string,
      "significance": string (why this chapter matters)
    }
  ],
  "turningPoints": [
    {
      "moment": string (the pivotal event),
      "before": string (state before this moment),
      "after": string (state after),
      "catalyst": string (what triggered it),
      "impact": number (1-10)
    }
  ],
  "arc": {
    "departure": string (the beginning - ordinary world),
    "initiation": string (the challenges and trials),
    "return": string (the transformation and new wisdom)
  },
  "themes": [string] (major themes throughout),
  "transformation": string (how the person has changed),
  "currentState": string (where they are now on the journey),
  "imagePrompt": string (visual representation of the journey's arc)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are Dameris in journey mode: narrative-focused, seeing arcs and growth. You weave scattered moments into coherent stories. Output strict JSON only.`,
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    if (useThinking) {
      console.log('[Journey] Using thinking mode for narrative construction')
    }

    const resp = await llm.generateResponse(messages, {
      modelType: useThinking ? 'thinking' : 'chat',
      temperature: 0.75,
      maxTokens: useThinking ? 3000 : 2000,
      useThinking: useThinking,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: JourneyResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          narrative: resp.content,
          chapters: [],
          turningPoints: [],
          arc: {
            departure: 'Journey beginning',
            initiation: 'Trials and growth',
            return: 'Transformation',
          },
          themes: [],
          transformation: 'Growth and evolution',
          currentState: 'On the path',
          imagePrompt: 'A winding path through transformative landscapes',
        }

    if (resp.thinking) {
      console.log('[Journey] AI Reasoning:', resp.thinking.substring(0, 200) + '...')
    }

    return NextResponse.json({
      success: true,
      result,
      memoryCount: memories.length,
      timeRange,
      perspective,
      model: resp.model,
      provider: resp.provider,
      thinking: resp.thinking,
      usage: resp.usage,
    })
  } catch (error: any) {
    console.error('Journey generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate journey map' },
      { status: 500 }
    )
  }
}
