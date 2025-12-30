import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET: List memories in workspace
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is member
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Not a member of this workspace' },
        { status: 403 }
      )
    }

    const { data: workspaceMemories, error } = await supabase
      .from('workspace_memories')
      .select(`
        *,
        memory:memories(*)
      `)
      .eq('workspace_id', params.id)
      .order('added_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      memories: workspaceMemories?.map(wm => wm.memory) || []
    })
  } catch (error: any) {
    console.error('Error fetching workspace memories:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST: Add memory to workspace
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { memoryId } = body

    if (!memoryId) {
      return NextResponse.json(
        { error: 'memoryId is required' },
        { status: 400 }
      )
    }

    // Check if user is editor or owner
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Only editors and owners can add memories' },
        { status: 403 }
      )
    }

    // Verify memory belongs to user
    const { data: memory } = await supabase
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .single()

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found or access denied' },
        { status: 404 }
      )
    }

    const { data: workspaceMemory, error } = await supabase
      .from('workspace_memories')
      .insert({
        workspace_id: params.id,
        memory_id: memoryId,
        added_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to add memory to workspace' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      workspaceMemory
    })
  } catch (error: any) {
    console.error('Error adding memory to workspace:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

