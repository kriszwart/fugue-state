import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import type { GenerateEchoRequest, EchoResult } from '@/lib/types/fugue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateEchoRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      lookback = 'all',
      sensitivity = 0.7
    } = body

    // Calculate time range
    const now = new Date()
    let startDate: Date | null = null

    switch (lookback) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = null
    }

    // Fetch memories
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (memoryIds && memoryIds.length > 0) {
      memQuery = memQuery.in('id', memoryIds)
    } else if (startDate) {
      memQuery = memQuery.gte('created_at', startDate.toISOString())
    }

    memQuery = memQuery.limit(50)  // Analyze up to 50 memories

    const { data: memories, error } = await memQuery
    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found' },
        { status: 400 }
      )
    }

    // Build echo analysis prompt
    const fragmentsText = memories
      .map((m) => `[${new Date(m.created_at).toLocaleDateString()}] ${m.content.slice(0, 300)}`)
      .join('\n\n')

    const prompt = `You are Dameris, in ECHO MODE.

Analyze these ${memories.length} memory fragments for PATTERNS, REPETITIONS, and ECHOES.
Lookback period: ${lookback}
Sensitivity: ${sensitivity} (how subtle the patterns can be)

FRAGMENTS:
${fragmentsText}

Find what repeats. Find what echoes. Find what persists.

Return ONLY valid JSON (no markdown):
{
  "repeatingPatterns": [
    {
      "pattern": string (what repeats),
      "occurrences": number,
      "context": string[] (where it appears),
      "significance": string (what it means)
    }
  ],
  "recurringQuestions": [
    {
      "question": string,
      "askedTimes": number,
      "evolution": string (how the question has changed)
    }
  ],
  "persistentThemes": [
    {
      "theme": string,
      "frequency": number,
      "intensity": "faint" | "clear" | "loud" | "deafening",
      "firstEcho": string (earliest occurrence),
      "latestEcho": string (most recent)
    }
  ],
  "metaReflection": string (reflection on the patterns themselves),
  "amplification": string (what happens when we amplify the echoes)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in echo mode: pattern-detecting, repetition-aware, meta-reflective. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const resp = await llm.generateResponse(messages, {
      modelType: 'chat',
      temperature: 0.6,
      maxTokens: 1800,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: EchoResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          repeatingPatterns: [],
          recurringQuestions: [],
          persistentThemes: [],
          metaReflection: resp.content,
          amplification: 'The echoes grow louder.',
        }

    return NextResponse.json({
      success: true,
      result,
      memoryIds: memories.map((m) => m.id),
      analyzedCount: memories.length,
      model: resp.model,
      provider: resp.provider,
    })
  } catch (error: any) {
    console.error('Echo generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate echo analysis' },
      { status: 500 }
    )
  }
}
