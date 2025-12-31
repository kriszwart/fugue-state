import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { cache, rateLimit, analytics } from '@/lib/redis'
import { createServerSupabaseClient } from '@/lib/supabase'

// Token cache (module-level for reuse across requests in same container)
let cachedAccessToken: string | null = null
let tokenExpiry: number = 0

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

/**
 * Get Google Cloud access token using JWT authentication (with caching)
 */
async function getGoogleAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedAccessToken && Date.now() < tokenExpiry - 300000) {
    console.log('[STT] ♻️ Using cached access token')
    return cachedAccessToken
  }
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured')
  }

  const credentials = JSON.parse(credentialsJson)

  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }

  const { sign } = await import('jsonwebtoken')
  const jwt = sign(jwtPayload, credentials.private_key, { algorithm: 'RS256' })

  console.log('[STT] 🔑 Generating new access token...')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Token exchange failed: ${errorText}`)
  }

  const tokenData = await tokenResponse.json()

  // Cache the token (valid for 1 hour, we'll refresh after 55 minutes)
  cachedAccessToken = tokenData.access_token
  tokenExpiry = Date.now() + (tokenData.expires_in * 1000)
  console.log('[STT] ✅ New token cached, expires in', tokenData.expires_in, 'seconds')

  return tokenData.access_token
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

    const encoding = getEncodingFromMime(audio.type)

    console.log('[STT] Processing audio:', {
      size: bytes.length,
      encoding,
      languageCode,
      mimeType: audio.type
    })

    // Get access token using JWT (same as Vertex AI)
    const accessToken = await getGoogleAccessToken()

    // Call Speech-to-Text API directly with JWT auth
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID
    if (!projectId) {
      throw new Error('VERTEX_PROJECT_ID or GCP_PROJECT_ID required for STT')
    }

    const sttResponse = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            encoding,
            languageCode,
            sampleRateHertz: encoding === 'WEBM_OPUS' || encoding === 'OGG_OPUS' ? 48000 : undefined,
            enableAutomaticPunctuation: true,
            model: 'latest_short',
            enableWordTimeOffsets: false,
            maxAlternatives: 1,
            profanityFilter: false,
            useEnhanced: true
          },
          audio: { content }
        })
      }
    )

    if (!sttResponse.ok) {
      const errorText = await sttResponse.text()
      throw new Error(`STT API error: ${sttResponse.statusText} - ${errorText}`)
    }

    const result = await sttResponse.json()

    console.log('[STT] Recognition result:', {
      resultsCount: result.results?.length || 0,
      totalBilledTime: result.totalBilledTime
    })

    const transcript =
      result.results
        ?.map((r: any) => r.alternatives?.[0]?.transcript || '')
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
