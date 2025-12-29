import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'

export const runtime = 'nodejs'

/**
 * FUGUE MODE - Deep Structural Pattern Analysis
 *
 * A fugue is a musical composition where a theme is introduced and then
 * developed through variations and imitations. Similarly, this mode finds
 * the core "themes" in your memories and shows how they evolve, repeat,
 * and transform across time.
 *
 * Features:
 * - Identifies main themes (subjects) across all memories
 * - Shows variations and developments of each theme
 * - Detects counterpoints (contrasting but related ideas)
 * - Maps temporal evolution of themes
 * - Creates a "fugue structure" showing thematic development
 */

interface FugueRequest {
  memoryIds?: string[]
  depth?: 'surface' | 'medium' | 'deep' | 'profound'
  timeRange?: 'week' | 'month' | 'year' | 'all'
}

interface FugueTheme {
  subject: string
  firstAppearance: string
  variations: Array<{
    variation: string
    context: string
    timestamp: string
  }>
  development: string
  frequency: number
  intensity: number
}

interface FugueCounterpoint {
  theme1: string
  theme2: string
  relationship: string
  examples: string[]
}

interface FugueResult {
  mainThemes: FugueTheme[]
  counterpoints: FugueCounterpoint[]
  structure: {
    exposition: string
    development: string
    recapitulation: string
  }
  temporalFlow: string
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

    const body: FugueRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      depth = 'medium',
      timeRange = 'all'
    } = body

    // Fetch memories based on time range
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }) // Chronological for fugue analysis

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
          // No filter
          break
      }
      if (timeRange !== 'all') {
        memQuery = memQuery.gte('created_at', sinceDate.toISOString())
      }
      memQuery = memQuery.limit(50) // Limit for performance
    }

    const { data: memories, error } = await memQuery
    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found for fugue analysis' },
        { status: 400 }
      )
    }

    // Build fugue analysis prompt
    const memoriesText = memories
      .map((m, i) => {
        const date = m.temporal_marker || m.created_at
        return `Memory ${i + 1} (${new Date(date).toLocaleDateString()}):
${m.content.slice(0, 400)}
Themes: ${m.themes?.join(', ') || 'none'}
Emotions: ${m.emotional_tags?.join(', ') || 'none'}`
      })
      .join('\n\n---\n\n')

    const depthDescriptions = {
      surface: 'obvious patterns and themes',
      medium: 'underlying patterns with moderate depth',
      deep: 'hidden structural patterns and deep connections',
      profound: 'deepest philosophical and existential patterns'
    }

    const prompt = `You are Dameris in FUGUE STATE - a master of pattern recognition and thematic analysis.

Analyze these memories like a musical fugue, where themes are introduced, developed, and interwoven.

Analysis Depth: ${depth} (${depthDescriptions[depth]})
Time Range: ${timeRange}
Total Memories: ${memories.length}

MEMORIES (chronological):
${memoriesText}

Perform a FUGUE ANALYSIS - identify the main "subjects" (themes) and show how they develop:

1. **Main Themes**: What are the core subjects that appear and reappear?
2. **Variations**: How does each theme change and develop over time?
3. **Counterpoints**: What contrasting but related ideas interact?
4. **Structure**: Like a fugue, show exposition (introduction), development (elaboration), recapitulation (synthesis)
5. **Temporal Flow**: How do themes evolve chronologically?

Return ONLY valid JSON (no markdown):
{
  "mainThemes": [
    {
      "subject": string (the core theme),
      "firstAppearance": string (when it first emerged),
      "variations": [
        {
          "variation": string (how it changed),
          "context": string (what prompted the change),
          "timestamp": string (when this variation appeared)
        }
      ],
      "development": string (overall arc of this theme),
      "frequency": number (1-10, how often it appears),
      "intensity": number (1-10, how prominent it is)
    }
  ],
  "counterpoints": [
    {
      "theme1": string,
      "theme2": string,
      "relationship": string (how they interact),
      "examples": [string] (specific instances)
    }
  ],
  "structure": {
    "exposition": string (initial introduction of themes),
    "development": string (how themes elaborate and interact),
    "recapitulation": string (synthesis and resolution)
  },
  "temporalFlow": string (chronological narrative of theme evolution),
  "synthesis": string (the complete picture - what does this fugue reveal?),
  "imagePrompt": string (visual representation of the fugue structure)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in fugue mode: analytical, musical, pattern-focused. You see the deep structure beneath surface chaos. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    if (useThinking) {
      console.log('[Fugue] Using thinking mode for deep structural analysis')
    }

    const resp = await llm.generateResponse(messages, {
      modelType: useThinking ? 'thinking' : 'chat',
      temperature: 0.7, // Lower temp for structured analysis
      maxTokens: useThinking ? 3000 : 2000,
      useThinking: useThinking,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: FugueResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          mainThemes: [],
          counterpoints: [],
          structure: {
            exposition: 'Analysis incomplete',
            development: 'Analysis incomplete',
            recapitulation: 'Analysis incomplete',
          },
          temporalFlow: 'Unable to determine temporal flow',
          synthesis: resp.content,
          imagePrompt: 'Abstract visualization of interconnected themes',
        }

    if (resp.thinking) {
      console.log('[Fugue] AI Reasoning:', resp.thinking.substring(0, 200) + '...')
    }

    return NextResponse.json({
      success: true,
      result,
      memoryCount: memories.length,
      timeRange,
      depth,
      model: resp.model,
      provider: resp.provider,
      thinking: resp.thinking,
      usage: resp.usage,
    })
  } catch (error: any) {
    console.error('Fugue analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate fugue analysis' },
      { status: 500 }
    )
  }
}
