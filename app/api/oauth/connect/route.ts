import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getGoogleOAuthHandler } from '@/lib/oauth/google'
import { getNotionOAuthHandler } from '@/lib/oauth/notion'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      )
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in session/cookie (simplified - use proper session management in production)
    const response = NextResponse.json({ state })

    let authUrl: string

    if (provider === 'google') {
      const googleOAuth = getGoogleOAuthHandler()
      authUrl = googleOAuth.getAuthUrl(state)
    } else if (provider === 'notion') {
      const notionOAuth = getNotionOAuthHandler()
      authUrl = notionOAuth.getAuthUrl(state)
    } else {
      return NextResponse.json(
        { error: 'Unknown provider' },
        { status: 400 }
      )
    }

    // Store state in cookie
    response.cookies.set(`oauth_state_${provider}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}













