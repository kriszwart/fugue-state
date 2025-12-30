import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create public Supabase client (no auth required)
function createPublicSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token

    if (!shareToken) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 })
    }

    const supabase = createPublicSupabaseClient()

    // Fetch artefact by share token (only if public)
    const { data: artefact, error } = await supabase
      .from('artefacts')
      .select(`
        id,
        artefact_type,
        title,
        description,
        file_url,
        metadata,
        created_at,
        users:user_id (
          full_name
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single()

    if (error || !artefact) {
      return NextResponse.json(
        { error: 'Artefact not found or no longer shared' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      artefact
    })
  } catch (error: any) {
    console.error('Public share API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shared artefact' },
      { status: 500 }
    )
  }
}
