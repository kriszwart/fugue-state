import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { action, email, password, inviteCode, ...options } = await request.json()
    const supabase = createServerSupabaseClient()

    switch (action) {
      case 'signup':
        // If inviteCode is provided, validate it
        let inviteCodeData = null
        if (inviteCode) {
          const { data: invite, error: inviteError } = await supabase
            .from('invite_codes')
            .select('*')
            .eq('code', inviteCode)
            .eq('is_active', true)
            .single()

          if (inviteError || !invite) {
            return NextResponse.json(
              { error: 'Invalid invite code' },
              { status: 400 }
            )
          }

          // Check if already used
          if (invite.used_at) {
            return NextResponse.json(
              { error: 'This invite code has already been used' },
              { status: 400 }
            )
          }

          // Check expiration
          if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
              { error: 'This invite code has expired' },
              { status: 400 }
            )
          }

          inviteCodeData = invite
        }

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
            ...options
          }
        })

        if (signupError) {
          return NextResponse.json(
            { error: signupError.message },
            { status: 400 }
          )
        }

        // If invite code was used, mark it as used
        if (inviteCodeData && signupData.user) {
          await supabase
            .from('invite_codes')
            .update({
              used_at: new Date().toISOString(),
              used_by_id: signupData.user.id
            })
            .eq('id', inviteCodeData.id)
        }

        return NextResponse.json({ data: signupData })

      case 'signin':
        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (signinError) {
          return NextResponse.json(
            { error: signinError.message },
            { status: 401 }
          )
        }
        
        return NextResponse.json({ data: signinData })

      case 'signout':
        const { error: signoutError } = await supabase.auth.signOut()
        
        if (signoutError) {
          return NextResponse.json(
            { error: signoutError.message },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ success: true })

      case 'reset-password':
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${request.nextUrl.origin}/auth/reset-password`
        })
        
        if (resetError) {
          return NextResponse.json(
            { error: resetError.message },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}


























