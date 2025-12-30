import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memoryId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      // Delete all memories for user
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, deleted: 'all' })
    }

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    // Delete specific memory
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

























