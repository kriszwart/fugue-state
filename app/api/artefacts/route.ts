import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // 'image', 'text', 'video', etc.

    // Fetch artefacts for user
    let query = supabase
      .from('artefacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq('artefact_type', type)
    }

    const { data: artefacts, error } = await query

    if (error) {
      console.error('Error fetching artefacts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch artefacts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      artefacts: artefacts || [],
      count: artefacts?.length || 0
    })
  } catch (error: any) {
    console.error('Artefacts API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch artefacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      artefact_type,
      title,
      description,
      file_url,
      file_path,
      memory_id,
      generation_model,
      generation_prompt,
      metadata
    } = body

    if (!artefact_type || !title) {
      return NextResponse.json(
        { error: 'artefact_type and title are required' },
        { status: 400 }
      )
    }

    const { data: artefact, error } = await supabase
      .from('artefacts')
      .insert({
        user_id: user.id,
        artefact_type,
        title,
        description,
        file_url,
        file_path,
        memory_id,
        generation_model,
        generation_prompt,
        metadata
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating artefact:', error)
      return NextResponse.json(
        { error: 'Failed to create artefact' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      artefact
    })
  } catch (error: any) {
    console.error('Artefacts POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create artefact' },
      { status: 500 }
    )
  }
}
