import { createServerSupabaseClient } from '@/lib/supabase'

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class GoogleOAuthHandler {
  private config: GoogleOAuthConfig

  constructor(config: GoogleOAuthConfig) {
    this.config = config
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '),
      access_type: 'offline',
      prompt: 'consent'
    })

    if (state) {
      params.append('state', state)
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to exchange code for tokens')
    }

    return await response.json()
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to refresh access token')
    }

    return await response.json()
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string
    email: string
    name: string
    picture: string
  }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    return await response.json()
  }
}

export function getGoogleOAuthHandler(): GoogleOAuthHandler {
  return new GoogleOAuthHandler({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback?provider=google`
  })
}













