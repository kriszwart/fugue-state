import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    return NextResponse.json({
      configured: !!apiKey,
      message: apiKey 
        ? 'ElevenLabs API key is configured' 
        : 'ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to your .env.local file'
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        configured: false,
        error: error.message || 'Error checking API key'
      },
      { status: 500 }
    );
  }
}


























