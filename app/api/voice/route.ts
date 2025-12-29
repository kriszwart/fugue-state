import { NextRequest, NextResponse } from 'next/server';

/**
 * Voice API endpoint - redirects to TTS for backward compatibility
 * This ensures the voice system works regardless of which endpoint is called
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the request to the TTS endpoint
    const ttsUrl = new URL('/api/tts', request.url);

    const response = await fetch(ttsUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries())
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Forward GET requests to TTS as well
  const ttsUrl = new URL('/api/tts', request.url);

  const response = await fetch(ttsUrl.toString(), {
    headers: Object.fromEntries(request.headers.entries())
  });

  if (!response.ok) {
    const errorData = await response.json();
    return NextResponse.json(errorData, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
