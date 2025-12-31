import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getGoogleOAuthHandler } from '@/lib/oauth/google'
import { getNotionOAuthHandler } from '@/lib/oauth/notion'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// Simple encryption for storing tokens (in production, use proper encryption)
function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const provider = searchParams.get('provider') || 'google'

    if (error) {
      // Handle specific OAuth errors
      let errorMessage = 'Connection cancelled';
      if (error === 'access_denied') {
        errorMessage = 'Connection cancelled. You can try again anytime.';
      } else if (error === 'server_error') {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else {
        errorMessage = `Connection failed: ${error}. Please try again.`;
      }
      return NextResponse.redirect(
        new URL(`/initialization?error=${encodeURIComponent(errorMessage)}&error_type=oauth`, request.url)
      )
    }

    if (!code || !provider) {
      return NextResponse.redirect(
        new URL('/initialization?error=Missing authentication code. Please try connecting again.&error_type=oauth', request.url)
      )
    }

    // Get user from state or session
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/api/oauth/callback', request.url)
      )
    }

    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure token storage')
    }
    const encryptionKey = process.env.ENCRYPTION_KEY

    if (provider === 'google') {
      const googleOAuth = getGoogleOAuthHandler()
      const tokens = await googleOAuth.exchangeCodeForTokens(code)
      const userInfo = await googleOAuth.getUserInfo(tokens.access_token)

      // Store both Gmail and Drive data sources
      const encryptedAccessToken = encrypt(tokens.access_token, encryptionKey)
      const encryptedRefreshToken = encrypt(tokens.refresh_token, encryptionKey)
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      const sharedMetadata = {
        google_user_id: userInfo.id,
        name: userInfo.name,
        picture: userInfo.picture
      }

      // Store Gmail source
      const { error: gmailError } = await supabase
        .from('data_sources')
        .upsert({
          user_id: user.id,
          source_type: 'gmail',
          source_name: userInfo.email,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          expires_at: expiresAt,
          is_active: true,
          metadata: sharedMetadata
        }, {
          onConflict: 'user_id,source_type'
        })

      if (gmailError) {
        console.error('Error saving Gmail data source:', gmailError)
        return NextResponse.redirect(
          new URL('/initialization?error=Failed to save Gmail connection. Please try again.&error_type=save', request.url)
        )
      }

      // Store Drive source
      const { error: driveError } = await supabase
        .from('data_sources')
        .upsert({
          user_id: user.id,
          source_type: 'drive',
          source_name: `${userInfo.name}'s Drive`,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          expires_at: expiresAt,
          is_active: true,
          metadata: sharedMetadata
        }, {
          onConflict: 'user_id,source_type'
        })

      if (driveError) {
        console.error('Error saving Drive data source:', driveError)
        return NextResponse.redirect(
          new URL('/initialization?error=Failed to save Drive connection. Please try again.&error_type=save', request.url)
        )
      }

      // Count active data sources for onboarding progress
      const { data: dataSources } = await supabase
        .from('data_sources')
        .select('id, source_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      const sourceCount = dataSources?.length || 0

      // Check if user needs initialization (redirect back to initialization if so)
      const { data: userProfile } = await supabase
        .from('users')
        .select('initialization_completed_at')
        .eq('id', user.id)
        .single()

      if (!userProfile?.initialization_completed_at) {
        // Check if they have other data sources or memories
        const { data: memories } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        // If no other sources and no memories, redirect to initialization
        if (sourceCount <= 1 && (!memories || memories.length === 0)) {
          return NextResponse.redirect(
            new URL(`/initialization?connected=google&sources=${sourceCount}`, request.url)
          )
        }
      }

      return NextResponse.redirect(
        new URL(`/studio/workspace?connected=google&sources=${sourceCount}`, request.url)
      )
    }

    if (provider === 'notion') {
      const notionOAuth = getNotionOAuthHandler()
      const tokens = await notionOAuth.exchangeCodeForTokens(code)

      // Store data source
      const { error: dbError } = await supabase
        .from('data_sources')
        .upsert({
          user_id: user.id,
          source_type: 'notion',
          source_name: tokens.workspace_name,
          access_token_encrypted: encrypt(tokens.access_token, encryptionKey),
          expires_at: null, // Notion tokens don't expire
          is_active: true,
          metadata: {
            bot_id: tokens.bot_id,
            workspace_id: tokens.workspace_id,
            workspace_icon: tokens.workspace_icon,
            owner: tokens.owner
          }
        }, {
          onConflict: 'user_id,source_type'
        })

      if (dbError) {
        console.error('Error saving Notion data source:', dbError)
        return NextResponse.redirect(
          new URL('/initialization?error=Failed to save connection. Please try again.&error_type=save', request.url)
        )
      }

      // Count active data sources for onboarding progress
      const { data: dataSources } = await supabase
        .from('data_sources')
        .select('id, source_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      const sourceCount = dataSources?.length || 0

      // Check if user needs initialization (redirect back to initialization if so)
      const { data: userProfile } = await supabase
        .from('users')
        .select('initialization_completed_at')
        .eq('id', user.id)
        .single()

      if (!userProfile?.initialization_completed_at) {
        // Check if they have other data sources or memories
        const { data: memories } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        // If no other sources and no memories, redirect to initialization
        if (sourceCount <= 1 && (!memories || memories.length === 0)) {
          return NextResponse.redirect(
            new URL(`/initialization?connected=notion&sources=${sourceCount}`, request.url)
          )
        }
      }

      return NextResponse.redirect(
        new URL(`/studio/workspace?connected=notion&sources=${sourceCount}`, request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/initialization?error=Unknown service provider. Please try again.&error_type=provider', request.url)
    )
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    const errorMessage = error.message || 'An unexpected error occurred. Please try again.'
    return NextResponse.redirect(
      new URL(`/initialization?error=${encodeURIComponent(errorMessage)}&error_type=system`, request.url)
    )
  }
}

