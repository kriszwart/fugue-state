import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Query invite_codes table
    const { data: inviteCode, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error || !inviteCode) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invite code'
      })
    }

    // Check if already used
    if (inviteCode.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'This invite code has already been used'
      })
    }

    // Check expiration
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'This invite code has expired'
      })
    }

    // Valid invite code
    return NextResponse.json({
      valid: true,
      email: inviteCode.email,
      role: inviteCode.role
    })
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
