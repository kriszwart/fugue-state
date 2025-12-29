import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import type { GenerateCollageRequest, CollageResult } from '@/lib/types/fugue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateCollageRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      style = 'hybrid',
      fragmentCount = 5,
      theme
    } = body

    // Fetch memories
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(fragmentCount)

    if (memoryIds && memoryIds.length > 0) {
      memQuery = supabase
        .from('memories')
        .select('id, content, themes, emotional_tags, temporal_marker')
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

    // Build collage prompt
    const fragmentsText = memories
      .map((m, i) => `Fragment ${i + 1}: ${m.content.slice(0, 400)}`)
      .join('\n\n')

    const prompt = `You are Dameris, creating a COLLAGE from fragmented memories.

Style: ${style}
${theme ? `Theme: ${theme}` : ''}

Create a collage that juxtaposes, layers, and recombines these ${memories.length} fragments in unexpected ways.

FRAGMENTS:
${fragmentsText}

Return ONLY valid JSON (no markdown):
{
  "type": "${style}",
  "title": string,
  "description": string (how the fragments connect),
  "elements": [
    {
      "type": "text" | "image" | "hybrid",
      "content": string (the collaged element),
      "sourceFragments": string[] (which fragments it draws from)
    }
  ],
  "visualPrompt": string (if visual/hybrid: prompt for image generation),
  "moodboard": {
    "colors": string[6],
    "textures": string[4],
    "atmosphere": string
  },
  "narrative": string (story connecting the fragments)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris, a creative muse specializing in collage and juxtaposition. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const resp = await llm.generateResponse(messages, {
      modelType: 'chat',
      temperature: 0.8,
      maxTokens: 1500,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: CollageResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          type: style,
          title: 'Memory Collage',
          description: resp.content,
          elements: [],
          narrative: resp.content,
        }

    return NextResponse.json({
      success: true,
      result,
      memoryIds: memories.map((m) => m.id),
      model: resp.model,
      provider: resp.provider,
    })
  } catch (error: any) {
    console.error('Collage generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate collage' },
      { status: 500 }
    )
  }
}
