import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';
import crypto from 'crypto';

// Cache TTL: 7 days (604800 seconds)
const TTS_CACHE_TTL = 604800;

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // STRICT WHITELIST: Only female voices allowed - NO MALE VOICES
    // This whitelist is enforced server-side to prevent any male voices from being used
    // Verified female voices from ElevenLabs
    const FEMALE_VOICE_IDS = [
      'EXAVITQu4vr4xnSDxMaL', // Bella - confirmed female
      'MF3mGyEYCl7XYWbV9V6O', // Elli - confirmed female
      'ThT5KcBeYPX3keUQqHPh', // Dorothy - confirmed female
      'pNInz6obpgDQGcFmaJgB', // Grace - confirmed female
      'oWAxZDx7w5VEj9dCyTzz', // Charlotte - confirmed female
      'AZnzlk1XvdvUeBnXmlld', // Domi - confirmed female
      'XB0fDUnXU5powFXDhCwa', // Matilda - confirmed female
      'VR6AewLTigWG4xSOukaG', // Nova - confirmed female
      '21m00Tcm4TlvDq8ikWAM', // Rachel - confirmed female
    ];

    // ENFORCE FEMALE VOICES ONLY: If voiceId is not in whitelist, use default female voice
    // This ensures no male voices can ever be used, even if a male voice ID is somehow provided
    const selectedVoiceId = (voiceId && FEMALE_VOICE_IDS.includes(voiceId))
      ? voiceId
      : 'EXAVITQu4vr4xnSDxMaL'; // Bella - default female voice (always female, never male)

    // Create cache key based on text + voiceId
    const cacheKey = `tts:${crypto
      .createHash('sha256')
      .update(`${text}:${selectedVoiceId}`)
      .digest('hex')}`;

    // Try to get from cache first
    try {
      const cached = await cache.get<{ audio: string }>(cacheKey);
      if (cached?.audio) {
        console.log('[TTS] Cache HIT for:', text.substring(0, 50));
        // Convert base64 back to buffer
        const audioBuffer = Buffer.from(cached.audio, 'base64');
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength.toString(),
            'X-Cache': 'HIT',
          },
        });
      }
    } catch (cacheError) {
      console.error('[TTS] Cache read error:', cacheError);
      // Continue to generate if cache fails
    }

    console.log('[TTS] Cache MISS - generating audio for:', text.substring(0, 50));

    // Generate audio from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ElevenLabs API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    // Cache the audio for future use (async, don't wait)
    setImmediate(async () => {
      try {
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        await cache.set(cacheKey, { audio: base64Audio }, TTS_CACHE_TTL);
        console.log('[TTS] Cached audio for:', text.substring(0, 50));
      } catch (cacheError) {
        console.error('[TTS] Cache write error:', cacheError);
      }
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch available voices
export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch voices' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filter for female voices only - strict filtering
    const femaleVoices = data.voices.filter((voice: any) => {
      const labels = voice.labels || {};
      // ONLY include voices explicitly labeled as female
      return labels.gender === 'female';
    });

    return NextResponse.json({ voices: femaleVoices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
