import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService, type LLMMessage } from '@/lib/ai/llm-service'
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/utils/timeout'

export const runtime = 'nodejs'

function extractJsonObject(text: string): any | null {
  // Try to extract the first top-level JSON object
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function clampText(s: string, maxChars: number) {
  if (!s) return ''
  if (s.length <= maxChars) return s
  return s.slice(0, maxChars) + '\n\n[TRUNCATED]'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memoryId } = await request.json().catch(() => ({}))

    if (!memoryId || typeof memoryId !== 'string') {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 })
    }

    // Fetch the memory
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .select('id, content, themes, emotional_tags, created_at')
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found or access denied' },
        { status: 404 }
      )
    }

    // Check if analysis already exists (gracefully handle missing table)
    let existingAnalysis = null
    try {
      const { data } = await supabase
        .from('creative_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_id', memoryId)
        .single()
      existingAnalysis = data
    } catch (error: any) {
      // Table doesn't exist yet - that's ok, we'll just generate fresh
      if (error?.code === 'PGRST205') {
        console.log('[Creative Analysis] Table not found, will generate fresh analysis')
      }
    }

    if (existingAnalysis) {
      return NextResponse.json({
        success: true,
        analysis: {
          character_analysis: existingAnalysis.character_analysis,
          cia_profile: existingAnalysis.cia_profile,
          poem_inspirations: existingAnalysis.poem_inspirations,
          thematic_patterns: existingAnalysis.thematic_patterns,
          writing_style: existingAnalysis.writing_style,
        },
        cached: true,
      })
    }

    // Prepare content for analysis (limit to 50k chars to avoid token limits)
    const content = clampText(String(memory.content || ''), 50000)
    const contentLength = String(memory.content || '').length

    // Create comprehensive analysis prompt
    const analysisPrompt = `You are an expert literary analyst and psychological profiler. Analyze the following creative writing collection and provide a comprehensive analysis.

CREATIVE WRITING COLLECTION:
${content}
${contentLength > 50000 ? `\n\n[Note: Content truncated from ${contentLength} characters to 50,000 for analysis]` : ''}

Provide a detailed analysis in JSON format with the following structure:

{
  "character_analysis": {
    "starseed_profile": "A detailed starseed archetype profile based on the writing's themes, symbols, and emotional patterns",
    "personality_archetypes": ["archetype1", "archetype2", "archetype3"],
    "character_traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
    "emotional_core": "The central emotional essence of the writer/character",
    "spiritual_indicators": ["indicator1", "indicator2", "indicator3"]
  },
  "cia_profile": {
    "psychological_assessment": "A detailed psychological profile in CIA-style analysis format",
    "behavioral_patterns": ["pattern1", "pattern2", "pattern3", "pattern4"],
    "risk_assessment": "Assessment of psychological risk factors and strengths",
    "motivational_drivers": ["driver1", "driver2", "driver3"],
    "cognitive_patterns": ["pattern1", "pattern2", "pattern3"]
  },
  "poem_inspirations": [
    {
      "theme": "Theme name",
      "prompt": "Detailed poem inspiration prompt based on this theme",
      "emotional_trigger": "The emotional core to tap into",
      "stylistic_suggestion": "Suggested style or form"
    }
  ],
  "thematic_patterns": {
    "recurring_motifs": ["motif1", "motif2", "motif3", "motif4", "motif5"],
    "narrative_threads": ["thread1", "thread2", "thread3"],
    "symbolic_elements": ["symbol1", "symbol2", "symbol3", "symbol4"],
    "hidden_narratives": "Description of underlying narrative patterns",
    "archetypal_themes": ["theme1", "theme2", "theme3"]
  },
  "writing_style": {
    "voice": "Analysis of the unique voice and perspective",
    "tone": "Description of overall tone and mood",
    "rhythm": "Analysis of rhythm, pacing, and flow",
    "literary_devices": ["device1", "device2", "device3", "device4"],
    "linguistic_patterns": ["pattern1", "pattern2", "pattern3"],
    "stylistic_uniqueness": "What makes this writing style distinctive"
  }
}

Guidelines:
- Be specific and insightful, referencing actual content from the collection
- For poem_inspirations, provide at least 5-8 different inspiration prompts
- The CIA profile should be detailed and professional, like a psychological assessment
- Character analysis should explore archetypal and spiritual dimensions
- Writing style should identify unique patterns and devices
- All arrays should have meaningful, specific entries
- Be creative but grounded in the actual text provided`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert literary analyst, psychological profiler, and creative writing consultant. You provide comprehensive, insightful analysis of creative writing collections. You must output valid JSON only, no markdown, no commentary.'
      },
      { role: 'user', content: analysisPrompt },
    ]

    const llm = getLLMService()
    const resp = await withTimeout(
      llm.generateResponse(messages, {
        modelType: 'chat',
        temperature: 0.7,
        maxTokens: 4000, // Large token limit for comprehensive analysis
      }),
      TIMEOUTS.LLM * 2, // Give more time for comprehensive analysis
      'Creative analysis timed out. The collection may be too large. Please try again.'
    )

    // Extract JSON from response
    const raw = extractJsonObject(resp.content)
    
    if (!raw) {
      throw new Error('Failed to parse analysis response. LLM did not return valid JSON.')
    }

    // Normalize and validate the structure
    const analysis = {
      character_analysis: raw.character_analysis || {
        starseed_profile: '',
        personality_archetypes: [],
        character_traits: [],
        emotional_core: '',
        spiritual_indicators: []
      },
      cia_profile: raw.cia_profile || {
        psychological_assessment: '',
        behavioral_patterns: [],
        risk_assessment: '',
        motivational_drivers: [],
        cognitive_patterns: []
      },
      poem_inspirations: Array.isArray(raw.poem_inspirations) 
        ? raw.poem_inspirations.slice(0, 10) // Limit to 10 inspirations
        : [],
      thematic_patterns: raw.thematic_patterns || {
        recurring_motifs: [],
        narrative_threads: [],
        symbolic_elements: [],
        hidden_narratives: '',
        archetypal_themes: []
      },
      writing_style: raw.writing_style || {
        voice: '',
        tone: '',
        rhythm: '',
        literary_devices: [],
        linguistic_patterns: [],
        stylistic_uniqueness: ''
      }
    }

    // Store in database (optional - gracefully degrade if table doesn't exist)
    let savedAnalysis = null
    try {
      const { data, error: saveError } = await supabase
        .from('creative_analyses')
        .insert({
          user_id: user.id,
          memory_id: memoryId,
          character_analysis: analysis.character_analysis,
          cia_profile: analysis.cia_profile,
          poem_inspirations: analysis.poem_inspirations,
          thematic_patterns: analysis.thematic_patterns,
          writing_style: analysis.writing_style,
        })
        .select()
        .single()

      if (saveError) {
        if (saveError.code === 'PGRST205') {
          console.log('[Creative Analysis] Table not found - analysis generated but not cached')
        } else {
          console.error('Error saving creative analysis:', saveError)
        }
      } else {
        savedAnalysis = data
      }
    } catch (error: any) {
      console.log('[Creative Analysis] Could not save - will return uncached analysis')
      // Continue - we'll still return the analysis even if caching fails
    }

    return NextResponse.json({
      success: true,
      analysis: savedAnalysis || analysis,
      model: resp.model,
      provider: resp.provider,
      cached: false,
    })
  } catch (error: any) {
    console.error('Creative analysis error:', error)
    
    let errorMessage = error.message || 'Creative analysis failed'
    let statusCode = 500
    
    if (error instanceof TimeoutError) {
      errorMessage = 'Creative analysis timed out. The collection may be too large. Please try again with a smaller file or check your connection.'
      statusCode = 504
    } else if (error.message?.includes('LLM') || error.message?.includes('API key')) {
      errorMessage = 'AI service unavailable. Please check your API configuration.'
      statusCode = 503
    } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      errorMessage = 'Failed to parse analysis results. Please try again.'
      statusCode = 500
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}

// GET endpoint to check analysis status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const memoryId = searchParams.get('memoryId')

    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 })
    }

    // Check if analysis exists (handle missing table gracefully)
    let analysis = null
    try {
      const { data, error } = await supabase
        .from('creative_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('memory_id', memoryId)
        .single()

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      analysis = data
    } catch (error: any) {
      // Table doesn't exist - return pending
      if (error?.code === 'PGRST205') {
        return NextResponse.json({
          exists: false,
          status: 'not_cached',
          message: 'Creative analyses table not yet initialized'
        })
      }
    }

    if (!analysis) {
      return NextResponse.json({
        exists: false,
        status: 'pending'
      })
    }

    return NextResponse.json({
      exists: true,
      status: 'complete',
      analysis: {
        character_analysis: analysis.character_analysis,
        cia_profile: analysis.cia_profile,
        poem_inspirations: analysis.poem_inspirations,
        thematic_patterns: analysis.thematic_patterns,
        writing_style: analysis.writing_style,
      },
      created_at: analysis.created_at
    })
  } catch (error: any) {
    console.error('Error checking analysis status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check analysis status' },
      { status: 500 }
    )
  }
}

