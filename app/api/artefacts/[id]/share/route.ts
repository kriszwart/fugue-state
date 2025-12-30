import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const artefactId = params.id

    // Verify ownership
    const { data: artefact, error: fetchError } = await supabase
      .from('artefacts')
      .select('id, user_id, share_token')
      .eq('id', artefactId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !artefact) {
      return NextResponse.json({ error: 'Artefact not found' }, { status: 404 })
    }

    // If already has a share token, return it
    if (artefact.share_token) {
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${artefact.share_token}`
      return NextResponse.json({
        success: true,
        share_token: artefact.share_token,
        share_url: shareUrl
      })
    }

    // Generate new share token using database function
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_share_token')

    if (tokenError || !tokenData) {
      console.error('Error generating share token:', tokenError)
      return NextResponse.json({ error: 'Failed to generate share token' }, { status: 500 })
    }

    const shareToken = tokenData as string

    // Update artefact with share token and make it public
    const { error: updateError } = await supabase
      .from('artefacts')
      .update({
        share_token: shareToken,
        is_public: true,
        shared_at: new Date().toISOString()
      })
      .eq('id', artefactId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating artefact with share token:', updateError)
      return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`

    return NextResponse.json({
      success: true,
      share_token: shareToken,
      share_url: shareUrl
    })
  } catch (error: any) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate share link' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const artefactId = params.id

    // Disable sharing for this artefact
    const { error: updateError } = await supabase
      .from('artefacts')
      .update({
        is_public: false
      })
      .eq('id', artefactId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error disabling share:', updateError)
      return NextResponse.json({ error: 'Failed to disable sharing' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Sharing disabled'
    })
  } catch (error: any) {
    console.error('Unshare API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to disable sharing' },
      { status: 500 }
    )
  }
}
