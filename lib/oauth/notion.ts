import { createServerSupabaseClient } from '@/lib/supabase'

export interface NotionOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class NotionOAuthHandler {
  private config: NotionOAuthConfig

  constructor(config: NotionOAuthConfig) {
    this.config = config
  }

  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      owner: 'user'
    })

    if (state) {
      params.append('state', state)
    }

    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    bot_id: string
    workspace_id: string
    workspace_name: string
    workspace_icon: string | null
    owner: {
      type: string
      user: {
        object: string
        id: string
        name: string
        avatar_url: string | null
        person: {
          email: string
        }
      }
    }
  }> {
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to exchange code for tokens')
    }

    return await response.json()
  }
}

export function getNotionOAuthHandler(): NotionOAuthHandler {
  return new NotionOAuthHandler({
    clientId: process.env.NOTION_CLIENT_ID!,
    clientSecret: process.env.NOTION_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/callback?provider=notion`
  })
}
























