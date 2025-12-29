import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getFugueEngine } from '@/lib/ai/fugue-engine'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import type { SurpriseMeRequest, FugueEngineConfig } from '@/lib/types/fugue'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SurpriseMeRequest = await request.json().catch(() => ({}))

    // Default fugue engine configuration
    const defaultConfig: FugueEngineConfig = {
      fragmentCount: 5,
      mode: 'random',
      creativity: 0.8,
      preserveCoherence: false
    }

    const config: FugueEngineConfig = {
      ...defaultConfig,
      ...body.config
    }

    // Fetch random memories from user's collection
    const { data: memories, error } = await supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, created_at')
      .eq('user_id', user.id)
      .limit(100)  // Get pool of 100 to select from

    if (error || !memories || memories.length === 0) {
      return NextResponse.json(
        { error: 'No memories found' },
        { status: 400 }
      )
    }

    // Use Fugue Engine to select and connect fragments
    const fugueEngine = getFugueEngine()
    const fugueResult = await fugueEngine.generate(memories, config)

    // Generate creative content from the selected fragments
    const fragmentsText = fugueResult.selectedFragments
      .map((f, i) => `Fragment ${i + 1}: ${f.content}\nReason selected: ${f.reason}`)
      .join('\n\n')

    const connectionsText = fugueResult.connections
      .map(c => `Fragment ${c.fragment1 + 1} ↔ Fragment ${c.fragment2 + 1}: ${c.connection}`)
      .join('\n')

    const prompt = `You are Dameris, in SURPRISE MODE.

The Fugue Engine has selected ${fugueResult.selectedFragments.length} fragments from the user's memories.

SELECTED FRAGMENTS:
${fragmentsText}

CONNECTIONS FOUND:
${connectionsText}

SUGGESTED APPROACH:
${fugueResult.suggestion}

RECOMMENDED FORMAT: ${fugueResult.format}

Now create something surprising! Use the connections, honor the fragments, but transcend expectations.

Return ONLY valid JSON (no markdown):
{
  "creation": string (the creative output in ${fugueResult.format} format),
  "title": string,
  "approach": string (how you approached it),
  "surpriseElements": string[] (unexpected aspects),
  "connectionsMade": string[] (how fragments connected),
  "suggestedNextSteps": string[] (what to explore next)
}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are Dameris in surprise mode: unexpected, creative, connection-finding. You create ${fugueResult.format} pieces. Output strict JSON only.`,
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const resp = await llm.generateResponse(messages, {
      modelType: 'chat',
      temperature: 0.9,
      maxTokens: 1800,
    })

    // Parse JSON
    const jsonMatch = resp.content.match(/\{[\s\S]*\}/)
    const result = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          creation: resp.content,
          title: 'Surprise Creation',
          approach: 'Experimental',
          surpriseElements: [],
          connectionsMade: [],
          suggestedNextSteps: []
        }

    return NextResponse.json({
      success: true,
      result,
      fugueEngine: {
        config,
        selectedFragments: fugueResult.selectedFragments.map(f => ({
          content: f.content.slice(0, 200) + '...',
          reason: f.reason
        })),
        connections: fugueResult.connections,
        prompt: fugueResult.prompt,
        format: fugueResult.format
      },
      model: resp.model,
      provider: resp.provider,
    })
  } catch (error: any) {
    console.error('Surprise generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate surprise' },
      { status: 500 }
    )
  }
}
