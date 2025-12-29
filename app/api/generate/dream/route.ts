import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import type { GenerateDreamRequest, DreamResult } from '@/lib/types/fugue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateDreamRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      intensity = 'medium',
      mood
    } = body

    // Fetch memories
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7)

    if (memoryIds && memoryIds.length > 0) {
      memQuery = supabase
        .from('memories')
        .select('id, content, themes, emotional_tags')
        .eq('user_id', user.id)
        .in('id', memoryIds)
    }

    const { data: memories, error } = await memQuery
    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found' },
        { status: 400 }
      )
    }

    // Build dream prompt
    const fragmentsText = memories
      .map((m, i) => `Fragment ${i + 1}: ${m.content.slice(0, 300)}`)
      .join('\n\n')

    const intensityDescriptions = {
      subtle: 'gently surreal, dreamlike but recognizable',
      medium: 'clearly dreamlike with symbolic elements',
      surreal: 'deeply surreal, logic-bending',
      extreme: 'completely abstract, pure subconscious'
    }

    const prompt = `You are Dameris, entering the DREAM STATE.

Create a surreal, dreamlike narrative from these memory fragments.
Intensity: ${intensity} (${intensityDescriptions[intensity]})
${mood ? `Mood: ${mood}` : ''}

FRAGMENTS:
${fragmentsText}

Transform these into a dream. Blend, distort, symbolize. Let the subconscious speak.

Return ONLY valid JSON (no markdown):
{
  "narrative": string (the dream story, surreal and flowing),
  "imagePrompt": string (vivid description for dreamlike image),
  "soundscape": string (what the dream sounds like),
  "interpretation": string (possible meanings),
  "symbols": [
    {
      "symbol": string,
      "meaning": string,
      "sourceFragments": string[]
    }
  ],
  "atmosphere": {
    "mood": string,
    "colors": string[5],
    "textures": string[4],
    "sounds": string[4]
  },
  "lucidMoments": string[] (clearer parts of the dream)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in dream mode: surreal, symbolic, flowing. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()

    // Use thinking mode for better dream quality if enabled
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    if (useThinking) {
      console.log('[Dream] Using thinking mode for enhanced creativity')
    }

    const resp = await llm.generateResponse(messages, {
      modelType: useThinking ? 'thinking' : 'chat',
      temperature: 0.9,
      maxTokens: useThinking ? 2500 : 1800, // More tokens for thinking mode
      useThinking: useThinking, // Enable thinking mode
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: DreamResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          narrative: resp.content,
          imagePrompt: 'A dreamlike interpretation of memories',
          soundscape: 'Ambient, ethereal, flowing',
          interpretation: 'The subconscious processes memories',
          symbols: [],
          atmosphere: {
            mood: 'dreamlike',
            colors: ['purple', 'blue', 'silver'],
            textures: ['soft', 'flowing', 'misty'],
            sounds: ['whispers', 'echoes', 'silence'],
          },
          lucidMoments: [],
        }

    // Log thinking process if available
    if (resp.thinking) {
      console.log('[Dream] AI Reasoning:', resp.thinking.substring(0, 200) + '...')
    }

    return NextResponse.json({
      success: true,
      result,
      memoryIds: memories.map((m) => m.id),
      model: resp.model,
      provider: resp.provider,
      thinking: resp.thinking, // Include thinking process
      usage: resp.usage, // Include token usage
    })
  } catch (error: any) {
    console.error('Dream generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate dream' },
      { status: 500 }
    )
  }
}
