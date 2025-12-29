import { NextRequest, NextResponse } from 'next/server'
import { SpeechClient } from '@google-cloud/speech'

function getEncodingFromMime(mimeType: string | null): 'WEBM_OPUS' | 'OGG_OPUS' | 'LINEAR16' {
  const mt = (mimeType || '').toLowerCase()
  if (mt.includes('webm')) return 'WEBM_OPUS'
  if (mt.includes('ogg')) return 'OGG_OPUS'
  if (mt.includes('wav') || mt.includes('wave')) return 'LINEAR16'
  // default: MediaRecorder in Chrome typically uses audio/webm;codecs=opus
  return 'WEBM_OPUS'
}

export async function POST(request: NextRequest) {
  try {
    // Auth optional here; /voice page is auth-gated already, but leaving this open
    // simplifies demo + avoids breaking if you later want public voice.
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

    const client = new SpeechClient()
    const encoding = getEncodingFromMime(audio.type)

    const [result] = await client.recognize({
      config: {
        encoding,
        languageCode,
        // Opus is typically 48kHz. Speech API can often infer, but this helps stability.
        sampleRateHertz: encoding === 'WEBM_OPUS' || encoding === 'OGG_OPUS' ? 48000 : undefined,
        enableAutomaticPunctuation: true,
        model: 'latest_short'
      },
      audio: { content }
    })

    const transcript =
      result.results
        ?.map(r => r.alternatives?.[0]?.transcript || '')
        .filter(Boolean)
        .join(' ')
        .trim() || ''

    if (!transcript) {
      return NextResponse.json({ transcript: '', error: 'No speech detected' }, { status: 200 })
    }

    return NextResponse.json({ transcript })
  } catch (error: any) {
    console.error('STT error:', error)
    return NextResponse.json(
      { error: error?.message || 'Speech-to-text failed' },
      { status: 500 }
    )
  }
}
