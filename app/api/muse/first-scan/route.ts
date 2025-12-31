import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getMemoryAnalyzer } from '@/lib/ai/memory-analyzer'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/utils/timeout'

export const runtime = 'nodejs'

type SynthesisFirstScan = {
  muse: 'synthesis'
  briefing: string
  reflect: {
    truths: string[]
    tensions: string[]
    questions: string[]
    missingIdeas: string[]
  }
  recompose: {
    emailDraft: string
    tweetThread: string
    outline: string
  }
  visualise: {
    imagePrompts: string[]
    palette: string[]
    storyboardBeats: string[]
  }
  curate: {
    tags: string[]
    quotes: string[]
    collections: Array<{ name: string; description: string; items: string[] }>
  }
  nextActions: string[]
}

function extractJsonObject(text: string): any | null {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '')

  // Try to extract the first top-level JSON object
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function cleanBriefingText(text: string): string {
  if (!text) return ''

  // Aggressively remove any JSON syntax artifacts, markdown, and code blocks
  let cleaned = text
    // Remove markdown code blocks
    .replace(/^```json\s*/gi, '')
    .replace(/^```\s*/gi, '')
    .replace(/```\s*$/gi, '')
    // Remove JSON opening syntax
    .replace(/^\s*\{\s*/g, '')
    .replace(/^\s*"muse":\s*"synthesis",?\s*/gi, '')
    .replace(/^\s*"briefing":\s*"/gi, '')
    // Remove trailing JSON syntax
    .replace(/"\s*\}\s*$/g, '')
    .replace(/"\s*,?\s*$/g, '')
    .replace(/\}\s*$/g, '')
    // Clean up escaped quotes
    .replace(/\\"/g, '"')
    .trim()

  return cleaned
}

function coerceStringArray(v: any, max = 8): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter(Boolean)
    .slice(0, max)
}

function normalizeResult(raw: any): SynthesisFirstScan {
  const briefing = typeof raw?.briefing === 'string' ? cleanBriefingText(raw.briefing) : ''

  return {
    muse: 'synthesis',
    briefing: briefing || 'I scanned your note. Ask me what you want to create from it.',
    reflect: {
      truths: coerceStringArray(raw?.reflect?.truths, 5),
      tensions: coerceStringArray(raw?.reflect?.tensions, 4),
      questions: coerceStringArray(raw?.reflect?.questions, 4),
      missingIdeas: coerceStringArray(raw?.reflect?.missingIdeas, 4),
    },
    recompose: {
      emailDraft: typeof raw?.recompose?.emailDraft === 'string' ? raw.recompose.emailDraft : '',
      tweetThread: typeof raw?.recompose?.tweetThread === 'string' ? raw.recompose.tweetThread : '',
      outline: typeof raw?.recompose?.outline === 'string' ? raw.recompose.outline : '',
    },
    visualise: {
      imagePrompts: coerceStringArray(raw?.visualise?.imagePrompts, 6),
      palette: coerceStringArray(raw?.visualise?.palette, 6),
      storyboardBeats: coerceStringArray(raw?.visualise?.storyboardBeats, 6),
    },
    curate: {
      tags: coerceStringArray(raw?.curate?.tags, 10),
      quotes: coerceStringArray(raw?.curate?.quotes, 10),
      collections: Array.isArray(raw?.curate?.collections)
        ? raw.curate.collections.slice(0, 3).map((c: any) => ({
            name: typeof c?.name === 'string' ? c.name : 'Collection',
            description: typeof c?.description === 'string' ? c.description : '',
            items: coerceStringArray(c?.items, 6),
          }))
        : [],
    },
    nextActions: coerceStringArray(raw?.nextActions, 5),
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memoryId, limit, museType } = await request.json().catch(() => ({}))
    const muse = typeof museType === 'string' && museType.length > 0 ? museType : 'synthesis'

    const take = Math.min(Math.max(Number(limit || 8), 1), 20)

    let memQuery = supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, temporal_marker, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(take)

    if (typeof memoryId === 'string' && memoryId.length > 0) {
      memQuery = supabase
        .from('memories')
        .select('id, content, themes, emotional_tags, temporal_marker, created_at')
        .eq('user_id', user.id)
        .eq('id', memoryId)
        .limit(1)
    }

    const { data: memories, error } = await memQuery
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!memories || memories.length === 0) {
      return NextResponse.json({ error: 'No memories found to scan' }, { status: 400 })
    }

    const analyzer = getMemoryAnalyzer()
    const analysis = await analyzer.analyzeMemories(
      memories.map((m: any) => ({
        id: m.id,
        content: String(m.content || ''),
        themes: m.themes || [],
        emotionalTags: m.emotional_tags || [],
        temporalMarker: m.temporal_marker || undefined,
      }))
    )

    // Smart sampling: Use full content with Gemini's extended context (1M tokens)
    // Approximate: 1 token ≈ 4 characters, so we can use ~400k characters safely
    const MAX_CHARS = 350000 // Conservative limit to leave room for prompt + response

    const allMemories = memories.map((m: any) => ({
      id: m.id,
      content: String(m.content || ''),
      length: String(m.content || '').length
    }))

    const totalLength = allMemories.reduce((sum, m) => sum + m.length, 0)

    let selectedMemories: typeof allMemories

    if (totalLength <= MAX_CHARS) {
      // Use all memories - no truncation needed!
      selectedMemories = allMemories
      console.log('[First Scan] Using all content:', totalLength, 'characters')
    } else {
      // Smart sampling: prioritize diversity across the collection
      console.log('[First Scan] Large collection detected:', totalLength, 'chars. Smart sampling...')

      // Strategy: Take first 20%, random sample from middle 60%, last 20%
      const firstChunk = Math.floor(allMemories.length * 0.2)
      const lastChunk = Math.floor(allMemories.length * 0.2)

      // Take first and last chunks
      const first = allMemories.slice(0, firstChunk)
      const last = allMemories.slice(-lastChunk)

      // Random sample from middle
      const middle = allMemories.slice(firstChunk, allMemories.length - lastChunk)
      const shuffled = middle.sort(() => Math.random() - 0.5)

      // Combine and fit to budget
      selectedMemories = [...first, ...shuffled, ...last]
      let currentLength = 0
      const fitted: typeof allMemories = []

      for (const mem of selectedMemories) {
        if (currentLength + mem.length <= MAX_CHARS) {
          fitted.push(mem)
          currentLength += mem.length
        } else if (fitted.length < 3) {
          // Ensure at least 3 memories, truncate if needed
          const remaining = MAX_CHARS - currentLength
          fitted.push({
            ...mem,
            content: mem.content.substring(0, remaining) + '\n\n[TRUNCATED - see full text in next scan]',
            length: remaining
          })
          break
        } else {
          break
        }
      }

      selectedMemories = fitted
      console.log('[First Scan] Sampled to:', selectedMemories.length, 'memories,', currentLength, 'chars')
    }

    const memExcerpt = selectedMemories
      .map((m, i) => `Memory ${i + 1} (id: ${m.id})\n${m.content}`)
      .join('\n\n---\n\n')

    const museStyle = (() => {
      if (muse === 'analyst') return 'Tone: crisp, pattern-forward, specific, pragmatic.'
      if (muse === 'poet') return 'Tone: lyrical, metaphor-forward, tender, surprising.'
      if (muse === 'visualist') return 'Tone: sensory, cinematic, image-forward, color + composition aware.'
      if (muse === 'narrator') return 'Tone: cinematic narrator, saga-forward, voice-first, dramatic clarity.'
      return 'Tone: balanced synthesis — insight + creativity + next steps.'
    })()

    const prompt = `You are Dameris. Muse mode: ${muse}.
${museStyle}

Your job: spark the muse by finding hidden threads, missing ideas, and creative next steps — with access to the FULL creative work.

You will be given:
- The user's complete creative collection (full text, not truncated - explore all of it!)
- A high-level analysis (themes, emotions, narrative, insights, missingIdeas)

CRITICAL: Return ONLY the raw JSON object. DO NOT wrap it in markdown code blocks. DO NOT include \`\`\`json or \`\`\`. Start your response with { and end with }. Return ONLY valid JSON for this exact TypeScript shape:
{
  "muse": "synthesis",
  "briefing": string, // 40–60 words. If this is a creative writing collection: Give a psychological assessment of their creative voice, themes, and what this collection reveals about their inner world. Mention the scale/scope. End with: "What would you like me to help you create from this?"
  "reflect": { "truths": string[5], "tensions": string[4], "questions": string[4], "missingIdeas": string[4] },
  "recompose": { "emailDraft": string, "tweetThread": string, "outline": string },
  "visualise": { "imagePrompts": string[6], "palette": string[6], "storyboardBeats": string[6] },
  "curate": { "tags": string[10], "quotes": string[10], "collections": [{ "name": string, "description": string, "items": string[6] } x3] },
  "nextActions": string[5] // short commands, actionable today
}

Rules:
- For creative writing collections: Focus ONLY on the writing itself. Ignore any social media posts, event attendance, or biographical side-notes. Give deep psychological insight into their creative themes and voice.
- You have the ENTIRE collection - reference pieces from beginning, middle, and end. Notice how their voice evolves or what themes recur across different works.
- Use the user's language; do not invent biographical facts.
- Be specific: quote exact phrases from different parts of the collection when helpful. Show you've read deeply.
- Keep everything compact; optimize for meaningful insight.
- The briefing should feel like a wise creative mentor who has read EVERYTHING and sees the whole arc.

MEMORIES:
${memExcerpt}

ANALYSIS (for reference):
${JSON.stringify(
  {
    emotionalPatterns: analysis.emotionalPatterns?.slice(0, 6) || [],
    themes: analysis.themes?.slice(0, 8) || [],
    narrative: analysis.narrative || '',
    insights: analysis.insights?.slice(0, 6) || [],
    missingIdeas: analysis.missingIdeas?.slice(0, 6) || [],
  },
  null,
  2
)}`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          `You are Dameris: a voice-first muse. Current muse mode is "${muse}". You create concise, high-impact synthesis from personal notes. You must output strict JSON.`,
      },
      { role: 'user', content: prompt },
    ]

    const llm = getLLMService()
    const resp = await withTimeout(
      llm.generateResponse(messages, {
        modelType: 'chat',
        temperature: 0.7,
        maxTokens: 4096, // Increased for richer analysis with full context
      }),
      TIMEOUTS.LLM,
      'Memory scan timed out. The LLM service may be slow or unavailable. Please try again.'
    )

    const raw = extractJsonObject(resp.content) || {
      muse: 'synthesis',
      briefing: resp.content,
    }

    const result = normalizeResult(raw)

    // Save analysis as an artefact for context in future conversations (non-blocking)
    let analysisArtefact = null
    try {
      const { data: analysisData, error: analysisErr } = await supabase
        .from('artefacts')
        .insert({
          user_id: user.id,
          memory_id: memoryId || (memories && memories[0]?.id) || null,
          artefact_type: 'text',
          title: 'Creative Analysis',
          description: result.briefing || 'Deep analysis of your creative work',
          file_url: null,
          file_path: null,
          metadata: {
            kind: 'first-scan',
            museType: muse,
            briefing: result.briefing,
            reflect: result.reflect,
            recompose: result.recompose,
            visualise: result.visualise,
            curate: result.curate,
            nextActions: result.nextActions,
            firstScan: result,
            analysis: {
              themes: analysis.themes || [],
              emotionalPatterns: analysis.emotionalPatterns || [],
              narrative: analysis.narrative || '',
              insights: analysis.insights || [],
              missingIdeas: analysis.missingIdeas || []
            }
          },
          generation_model: resp.model,
          generation_prompt: 'First scan analysis of creative work'
        })
        .select()
        .single()

      if (!analysisErr) {
        analysisArtefact = analysisData
        console.log('[First-scan] Successfully saved analysis artefact')
      } else {
        console.error('[First-scan] Failed to save analysis artefact (non-fatal):', analysisErr)
      }
    } catch (e) {
      console.error('[First-scan] Error saving analysis artefact (non-fatal):', e)
    }

    return NextResponse.json({
      success: true,
      memoryIds: memories.map((m: any) => m.id),
      analysis: {
        themes: analysis.themes || [],
        emotionalPatterns: analysis.emotionalPatterns || [],
        narrative: analysis.narrative || '',
        insights: analysis.insights || [],
        missingIdeas: analysis.missingIdeas || [],
      },
      result,
      analysisArtefact,
      model: resp.model,
      provider: resp.provider,
    })
  } catch (error: any) {
    console.error('First scan error:', error)
    
    let errorMessage = error.message || 'First scan failed'
    let statusCode = 500
    
    if (error instanceof TimeoutError) {
      errorMessage = 'Memory scan timed out. Please try again with a smaller file or check your connection.'
      statusCode = 504
    } else if (error.message?.includes('LLM') || error.message?.includes('API key')) {
      errorMessage = 'AI service unavailable. Please check your API configuration.'
      statusCode = 503
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}


