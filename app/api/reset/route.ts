import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log(`[Reset] Starting account reset for user: ${user.id}`)

    // Delete all user data in correct order (respecting foreign keys)

    // 1. Delete messages (depends on conversations)
    // First get all conversation IDs for this user
    const { data: userConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)

    if (userConversations && userConversations.length > 0) {
      const conversationIds = userConversations.map(conv => conv.id)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds)

      if (messagesError) {
        console.error('[Reset] Error deleting messages:', messagesError)
      }
    }

    // 2. Delete conversations
    const { error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .eq('user_id', user.id)

    if (conversationsError) {
      console.error('[Reset] Error deleting conversations:', conversationsError)
    }

    // 3. Delete artefacts
    const { error: artefactsError } = await supabase
      .from('artefacts')
      .delete()
      .eq('user_id', user.id)

    if (artefactsError) {
      console.error('[Reset] Error deleting artefacts:', artefactsError)
    }

    // 4. Delete memories
    const { error: memoriesError } = await supabase
      .from('memories')
      .delete()
      .eq('user_id', user.id)

    if (memoriesError) {
      console.error('[Reset] Error deleting memories:', memoriesError)
    }

    // 5. Delete data sources
    const { error: dataSourcesError } = await supabase
      .from('data_sources')
      .delete()
      .eq('user_id', user.id)

    if (dataSourcesError) {
      console.error('[Reset] Error deleting data sources:', dataSourcesError)
    }

    // 6. Reset user profile fields (keep the user record but reset initialization)
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        muse_type: null,
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (userUpdateError) {
      console.error('[Reset] Error updating user profile:', userUpdateError)
    }

    // 7. Delete files from storage bucket
    try {
      const { data: files } = await supabase
        .storage
        .from('artefacts')
        .list(`${user.id}/`)

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`)
        await supabase.storage.from('artefacts').remove(filePaths)
      }
    } catch (storageError) {
      console.error('[Reset] Error deleting storage files:', storageError)
    }

    console.log(`[Reset] Account reset completed for user: ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Account reset successfully. All data has been cleared.'
    })
  } catch (error: any) {
    console.error('[Reset] Error during account reset:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset account' },
      { status: 500 }
    )
  }
}
