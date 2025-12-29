import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/utils/timeout'

export const runtime = 'nodejs'

type FirstScanResult = {
  muse: 'synthesis'
  briefing: string
  reflect: { truths: string[]; tensions: string[]; questions: string[]; missingIdeas: string[] }
  recompose: { emailDraft: string; tweetThread: string; outline: string }
  visualise: { imagePrompts: string[]; palette: string[]; storyboardBeats: string[] }
  curate: { tags: string[]; quotes: string[]; collections: Array<{ name: string; description: string; items: string[] }> }
  nextActions: string[]
}

function toneForMuse(museType: string) {
  if (museType === 'analyst') return 'Crisp, pattern-forward, specific, pragmatic.'
  if (museType === 'poet') return 'Lyrical, metaphor-forward, tender, surprising.'
  if (museType === 'visualist') return 'Sensory, cinematic, image-forward, color + composition aware.'
  if (museType === 'narrator') return 'Cinematic narrator voice, saga-forward, clear.'
  return 'Balanced synthesis — insight + creativity + next steps.'
}

function styleForMuse(museType: string): string | undefined {
  // Map muse types to image generation styles
  if (museType === 'analyst') return 'stable-diffusion-xl-1024-v1-0' // Technical, structured
  if (museType === 'poet') return 'stable-diffusion-xl-1024-v1-0' // Will use prompt engineering for poetic style
  if (museType === 'visualist') return 'stable-diffusion-xl-1024-v1-0' // Cinematic, visual-forward
  if (museType === 'narrator') return 'stable-diffusion-xl-1024-v1-0' // Storybook, narrative
  return undefined // Default
}

function enhancePromptForMuse(prompt: string, museType: string): string {
  // Add muse-specific style guidance to image prompts
  if (museType === 'analyst') {
    return `${prompt}, technical diagram style, clean lines, structured composition, data visualization aesthetic, professional`
  }
  if (museType === 'poet') {
    return `${prompt}, impressionist art style, soft brushstrokes, dreamlike quality, emotional, lyrical, ethereal`
  }
  if (museType === 'visualist') {
    return `${prompt}, cinematic photography, dramatic lighting, rich colors, depth of field, visual storytelling`
  }
  if (museType === 'narrator') {
    return `${prompt}, storybook illustration style, narrative clarity, dramatic scenes, classic storytelling aesthetic`
  }
  return prompt // Synthesis uses original prompt
}

function extractJsonObject(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase
    try {
      supabase = createServerSupabaseClient()
    } catch (supabaseError: any) {
      console.error('[Auto-create] Failed to create Supabase client:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to initialize database connection' },
        { status: 500 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[Auto-create] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memoryId, museType, firstScan } = await request.json().catch(() => ({}))

    if (!memoryId || typeof memoryId !== 'string') {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 })
    }

    const muse = typeof museType === 'string' && museType.length > 0 ? museType : 'synthesis'

    // Load memory content to ground poem + curation
    const { data: memory, error: memErr } = await supabase
      .from('memories')
      .select('id, content')
      .eq('user_id', user.id)
      .eq('id', memoryId)
      .single()

    if (memErr || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    const scan: FirstScanResult | null = firstScan && typeof firstScan === 'object' ? firstScan : null
    const visualPrompt = scan?.visualise?.imagePrompts?.[0] || String(memory.content || '').slice(0, 400)
    const quotes = scan?.curate?.quotes?.slice(0, 8) || []
    const tags = scan?.curate?.tags?.slice(0, 10) || []

    const llm = getLLMService()

    // 1 & 2) Parallelize Poem + Collection generation for better performance
    const poemMessages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are Dameris. Muse mode: "${muse}". ${toneForMuse(muse)} Write a short poem from the user memory. Output only the poem text.`,
      },
      {
        role: 'user',
        content: `Memory:\n${String(memory.content || '').slice(0, 5000)}\n\nOptional palette/tags:\n${tags.join(', ')}\n\nWrite a poem (12–24 lines).`,
      },
    ]

    const collectionMessages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are Dameris. Muse mode: "${muse}". ${toneForMuse(muse)} Create a compact curated collection from the memory. Output ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: `Return JSON with shape:\n{\n  \"name\": string,\n  \"description\": string,\n  \"items\": string[6]\n}\n\nGround it in the memory. Prefer quoting exact phrases. If quotes provided, you may reuse them.\n\nMemory:\n${String(memory.content || '').slice(0, 5000)}\n\nQuotes (optional):\n${quotes.map((q) => `- ${q}`).join('\n')}\n\nTags (optional): ${tags.join(', ')}`,
      },
    ]

    // Run both LLM calls in parallel (with timeout)
    const [poemResp, colResp] = await Promise.all([
      withTimeout(
        llm.generateResponse(poemMessages, { modelType: 'chat', temperature: muse === 'analyst' ? 0.5 : 0.8, maxTokens: 700 }),
        TIMEOUTS.LLM,
        'Poem generation timed out. Please try again.'
      ),
      withTimeout(
        llm.generateResponse(collectionMessages, { modelType: 'chat', temperature: 0.6, maxTokens: 500 }),
        TIMEOUTS.LLM,
        'Collection generation timed out. Please try again.'
      )
    ])

    const poemText = poemResp.content.trim()
    const colJson = extractJsonObject(colResp.content) || { name: 'New Collection', description: '', items: [] }

    // Insert both artefacts
    const { data: poemArtefact, error: poemErr } = await supabase
      .from('artefacts')
      .insert({
        user_id: user.id,
        memory_id: memoryId,
        artefact_type: 'text',
        title: muse === 'poet' ? 'Poem (from your memory)' : 'Poetic distillation',
        description: poemText.slice(0, 500),
        file_url: null,
        file_path: null,
        metadata: { kind: 'poem', museType: muse, text: poemText },
        generation_model: poemResp.model,
        generation_prompt: 'Auto-create poem from uploaded memory',
      })
      .select()
      .single()

    if (poemErr) {
      console.error('Poem artefact insert error:', poemErr)
    }

    const { data: collectionArtefact, error: colErr } = await supabase
      .from('artefacts')
      .insert({
        user_id: user.id,
        memory_id: memoryId,
        artefact_type: 'text',
        title: String(colJson.name || 'Curated Collection').slice(0, 120),
        description: String(colJson.description || '').slice(0, 500),
        file_url: null,
        file_path: null,
        metadata: { kind: 'collection', museType: muse, collection: colJson, tags },
        generation_model: colResp.model,
        generation_prompt: 'Auto-create curated collection from uploaded memory',
      })
      .select()
      .single()

    if (colErr) {
      console.error('Collection artefact insert error:', colErr)
    }

    // Save first-scan analysis as an artefact for context in future conversations (non-blocking)
    let analysisArtefact = null
    if (scan) {
      try {
        const { data: analysis, error: analysisErr } = await supabase
          .from('artefacts')
          .insert({
            user_id: user.id,
            memory_id: memoryId,
            artefact_type: 'text',
            title: 'Creative Analysis',
            description: scan.briefing || 'Deep analysis of your creative work',
            file_url: null,
            file_path: null,
            metadata: {
              kind: 'first-scan',
              museType: muse,
              briefing: scan.briefing,
              reflect: scan.reflect,
              recompose: scan.recompose,
              visualise: scan.visualise,
              curate: scan.curate,
              nextActions: scan.nextActions,
              firstScan: scan
            },
            generation_model: 'synthesis',
            generation_prompt: 'First scan analysis of uploaded creative work'
          })
          .select()
          .single()

        if (analysisErr) {
          console.error('[Auto-create] Analysis artefact insert error (non-fatal):', analysisErr)
        } else {
          analysisArtefact = analysis
          console.log('[Auto-create] Successfully saved analysis artefact')
        }
      } catch (e) {
        console.error('[Auto-create] Failed to save analysis artefact (non-fatal):', e)
      }
    }

    // 3) Image (call existing endpoint so it writes to Storage + artefacts)
    const enhancedPrompt = enhancePromptForMuse(visualPrompt, muse)
    const imageStyle = styleForMuse(muse)

    const imageUrl = new URL('/api/generate/image', request.url)
    const imageRes = await fetch(imageUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries()),
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        memoryId,
        width: 1024,
        height: 1024,
        style: imageStyle,
      }),
    })

    const imageData = await imageRes.json().catch(() => null)
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: imageData?.error || 'Failed to generate image' },
        { status: imageRes.status }
      )
    }

    // 4) Create journal entry
    let journalArtefact = null
    try {
      const journalUrl = new URL('/api/muse/create-journal-entry', request.url)
      const journalRes = await fetch(journalUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(request.headers.entries()),
        },
        body: JSON.stringify({
          memoryId,
          museType: muse,
        }),
      })

      const journalData = await journalRes.json().catch(() => null)
      if (journalRes.ok && journalData?.success) {
        journalArtefact = journalData.journalArtefact
      } else {
        console.warn('[Auto-create] Journal entry creation failed:', journalData?.error)
      }
    } catch (journalError: any) {
      console.warn('[Auto-create] Journal entry error (non-fatal):', journalError.message)
    }

    return NextResponse.json({
      success: true,
      poemArtefact,
      collectionArtefact,
      analysisArtefact,
      imageArtefact: imageData?.artefact || null,
      image: imageData?.image || null,
      journalArtefact,
      poemText,
      collection: colJson,
    })
  } catch (error: any) {
    console.error('Auto-create error:', error)
    
    let errorMessage = error.message || 'Auto-create failed'
    let statusCode = 500
    
    if (error instanceof TimeoutError) {
      errorMessage = 'Auto-create timed out. One or more steps took too long. Please try again.'
      statusCode = 504
    } else if (error.message?.includes('LLM') || error.message?.includes('API')) {
      errorMessage = 'AI service unavailable. Please check your API configuration.'
      statusCode = 503
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}


