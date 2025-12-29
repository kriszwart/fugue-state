import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Admin endpoint - uses service role key
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Simple admin auth check (replace with your own admin logic)
function isAdmin(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-admin-key')
  // In production, use a secure admin key or proper auth
  return apiKey === process.env.ADMIN_API_KEY || apiKey === process.env.API_KEY
}

// GET: List all waitlist entries (admin only)
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getAdminSupabase()

    let query = supabase
      .from('waitlist')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: entries, error, count } = await query

    if (error) {
      throw error
    }

    // Get stats
    const { data: stats } = await supabase
      .from('waitlist_stats')
      .select('*')

    return NextResponse.json({
      success: true,
      entries: entries || [],
      total: count || 0,
      stats: stats || [],
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error: any) {
    console.error('Admin waitlist fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}

// PATCH: Approve/reject waitlist entry (admin only)
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id, status, send_email } = await request.json()

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: id, status (approved|rejected)' },
        { status: 400 }
      )
    }

    const supabase = getAdminSupabase()

    // Get current entry
    const { data: entry, error: fetchError } = await supabase
      .from('waitlist')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }

    // Update status
    const { data: updated, error: updateError } = await supabase
      .from('waitlist')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // TODO: Send approval/rejection email
    if (send_email && entry.email) {
      if (status === 'approved') {
        // await sendApprovalEmail(entry.email, entry.full_name)
        console.log(`TODO: Send approval email to ${entry.email}`)
      } else {
        // await sendRejectionEmail(entry.email, entry.full_name)
        console.log(`TODO: Send rejection email to ${entry.email}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Waitlist entry ${status}`,
      entry: updated
    })
  } catch (error: any) {
    console.error('Admin waitlist update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update waitlist entry' },
      { status: 500 }
    )
  }
}

// DELETE: Remove from waitlist (admin only)
export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    const supabase = getAdminSupabase()

    const { error } = await supabase
      .from('waitlist')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Waitlist entry deleted'
    })
  } catch (error: any) {
    console.error('Admin waitlist delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete waitlist entry' },
      { status: 500 }
    )
  }
}
