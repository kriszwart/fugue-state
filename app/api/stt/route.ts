import { NextRequest, NextResponse } from 'next/server'
import { SpeechClient } from '@google-cloud/speech'
import { createHash } from 'crypto'
import { cache, rateLimit, analytics } from '@/lib/redis'
import { createServerSupabaseClient } from '@/lib/supabase'

function getEncodingFromMime(mimeType: string | null): 'WEBM_OPUS' | 'OGG_OPUS' | 'LINEAR16' {
  const mt = (mimeType || '').toLowerCase()
  if (mt.includes('webm')) return 'WEBM_OPUS'
  if (mt.includes('ogg')) return 'OGG_OPUS'
  if (mt.includes('wav') || mt.includes('wave')) return 'LINEAR16'
  // default: MediaRecorder in Chrome typically uses audio/webm;codecs=opus
  return 'WEBM_OPUS'
}

/**
 * Generate cache key from audio content
 */
function getAudioHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID for rate limiting and analytics
    let userId = 'anonymous'
    try {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // Continue with anonymous user
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimitResult = await rateLimit.check(`stt:${userId}`, 20, 60)
    if (!rateLimitResult.allowed) {
      console.warn(`[STT] Rate limit exceeded for user ${userId}`)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          help: 'Please wait a moment before recording again',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429 }
      )
    }

    const form = await request.formData()
    const audio = form.get('audio')

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'Missing audio file (field: audio)' }, { status: 400 })
    }

    // Basic guardrails
    if (audio.size <= 0) {
      return NextResponse.json({ error: 'Empty audio file' }, { status: 400 })
    }
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio too large (max 25MB for this endpoint)' }, { status: 413 })
    }

    const languageCode = (form.get('language') as string) || process.env.GOOGLE_STT_LANGUAGE || 'en-US'

    const bytes = Buffer.from(await audio.arrayBuffer())
    const content = bytes.toString('base64')

    // Check cache first (hash audio to create unique key)
    const audioHash = getAudioHash(bytes)
    const cacheKey = `stt:${audioHash}:${languageCode}`
    const cached = await cache.get<{ transcript: string; cached: boolean }>(cacheKey)

    if (cached) {
      console.log('[STT] 💰 Cache HIT for audio hash:', audioHash.slice(0, 8))
      await analytics.trackEvent('stt_cache_hit', userId, { audioHash, size: bytes.length })
      return NextResponse.json({ transcript: cached.transcript, cached: true })
    }

    console.log('[STT] 🔄 Cache MISS - processing audio:', audioHash.slice(0, 8))

    const client = new SpeechClient()
    const encoding = getEncodingFromMime(audio.type)

    console.log('[STT] Processing audio:', {
      size: bytes.length,
      encoding,
      languageCode,
      mimeType: audio.type
    })

    const [result] = await client.recognize({
      config: {
        encoding,
        languageCode,
        // Opus is typically 48kHz. Speech API can often infer, but this helps stability.
        sampleRateHertz: encoding === 'WEBM_OPUS' || encoding === 'OGG_OPUS' ? 48000 : undefined,
        enableAutomaticPunctuation: true,
        model: 'latest_short',
        // Add these to improve detection
        enableWordTimeOffsets: false,
        maxAlternatives: 1,
        profanityFilter: false,
        useEnhanced: true
      },
      audio: { content }
    })

    console.log('[STT] Recognition result:', {
      resultsCount: result.results?.length || 0,
      totalBilledTime: result.totalBilledTime
    })

    const transcript =
      result.results
        ?.map(r => r.alternatives?.[0]?.transcript || '')
        .filter(Boolean)
        .join(' ')
        .trim() || ''

    if (!transcript) {
      console.warn('[STT] ⚠️ No speech detected in audio')
      return NextResponse.json({
        transcript: '',
        error: 'No speech detected',
        debug: {
          audioSize: bytes.length,
          encoding,
          resultsCount: result.results?.length || 0
        }
      }, { status: 200 })
    }

    console.log('[STT] ✅ Transcript:', transcript)

    // Cache the successful transcription for 24 hours
    await cache.set(cacheKey, { transcript, cached: false }, 86400)
    console.log('[STT] 💾 Cached transcript for:', audioHash.slice(0, 8))

    // Track analytics
    await analytics.trackEvent('stt_success', userId, {
      audioHash,
      size: bytes.length,
      duration: result.totalBilledTime?.seconds || 0,
      transcriptLength: transcript.length
    })

    return NextResponse.json({ transcript, cached: false })
  } catch (error: any) {
    console.error('[STT] ❌ Error:', error)

    // Provide helpful error messages
    let errorMessage = error?.message || 'Speech-to-text failed'
    let helpText = null

    if (errorMessage.includes('API has not been used') || errorMessage.includes('disabled')) {
      helpText = 'Enable the Speech-to-Text API in Google Cloud Console'
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      helpText = 'API quota exceeded. Check your Google Cloud quotas.'
    } else if (errorMessage.includes('credentials') || errorMessage.includes('authentication')) {
      helpText = 'Invalid Google Cloud credentials. Check GOOGLE_APPLICATION_CREDENTIALS.'
    }

    return NextResponse.json(
      {
        error: errorMessage,
        help: helpText,
        debug: {
          errorType: error?.constructor?.name,
          code: error?.code
        }
      },
      { status: 500 }
    )
  }
}
