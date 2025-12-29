import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

// POST: Join waitlist
export async function POST(request: NextRequest) {
  try {
    const { email, full_name, reason, referral_code } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check if email already on waitlist
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json(
          {
            error: 'You\'re already approved! Please sign up.',
            redirect: '/auth/signup'
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          error: 'You\'re already on the waitlist. We\'ll email you when approved!',
          status: existing.status
        },
        { status: 400 }
      )
    }

    // Add to waitlist
    const { data: waitlistEntry, error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: full_name || null,
        reason: reason || null,
        referral_code: referral_code || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Waitlist insert error:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email (integrate with your email service)
    // await sendWaitlistConfirmationEmail(email, full_name)

    return NextResponse.json({
      success: true,
      message: 'You\'re on the waitlist! We\'ll email you when access is granted.',
      entry: waitlistEntry
    })
  } catch (error: any) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

// GET: Check waitlist status by email (for users)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: entry, error } = await supabase
      .from('waitlist')
      .select('id, email, status, created_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !entry) {
      return NextResponse.json(
        { error: 'Email not found on waitlist' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      status: entry.status,
      joined_at: entry.created_at,
      can_signup: entry.status === 'approved'
    })
  } catch (error: any) {
    console.error('Waitlist check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check waitlist status' },
      { status: 500 }
    )
  }
}
