import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import type { GenerateRemixRequest, RemixResult } from '@/lib/types/fugue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateRemixRequest = await request.json().catch(() => ({}))
    const {
      memoryIds,
      technique = 'blend',
      style,
      targetFormat = 'narrative'
    } = body

    // Fetch memories
    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

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

    // Build remix prompt
    const fragmentsText = memories
      .map((m, i) => `Fragment ${i + 1}: ${m.content}`)
      .join('\n\n')

    const techniqueDescriptions = {
      juxtapose: 'Place fragments side by side to create tension and insight',
      blend: 'Smoothly merge fragments into a cohesive whole',
      transform: 'Use one fragment as a lens to transform another',
      collide: 'Crash fragments together to create something entirely new'
    }

    const prompt = `You are Dameris, in REMIX MODE.

Technique: ${technique} (${techniqueDescriptions[technique]})
${style ? `Style: ${style}` : ''}
Target format: ${targetFormat}

FRAGMENTS TO REMIX:
${fragmentsText}

Remix these fragments using the ${technique} technique. Create something new that honors the originals but transcends them.

Return ONLY valid JSON (no markdown):
{
  "original": string[] (the source fragments),
  "remixed": string (the new creation in ${targetFormat} format),
  "technique": "${technique}",
  "style": string,
  "surprises": string[] (unexpected connections you found),
  "variations": [
    {
      "version": string (alternative remix),
      "approach": string (how this version differs)
    }
  ]
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are Dameris in remix mode: transformative, creative, connection-finding. Output strict JSON only.',
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const resp = await llm.generateResponse(messages, {
      modelType: 'chat',
      temperature: 0.85,
      maxTokens: 1600,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result: RemixResult = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          original: memories.map(m => m.content.slice(0, 200)),
          remixed: resp.content,
          technique,
          style: style || 'experimental',
          surprises: [],
          variations: [],
        }

    return NextResponse.json({
      success: true,
      result,
      memoryIds: memories.map((m) => m.id),
      model: resp.model,
      provider: resp.provider,
    })
  } catch (error: any) {
    console.error('Remix generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate remix' },
      { status: 500 }
    )
  }
}
