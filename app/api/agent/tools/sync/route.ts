import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getGmailService } from '@/lib/data-sources/gmail'
import { getDriveService } from '@/lib/data-sources/drive'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { source_type } = await request.json()

    if (!source_type) {
      return NextResponse.json(
        { error: 'source_type is required (gmail or drive)' },
        { status: 400 }
      )
    }

    let memoriesCreated = 0

    if (source_type === 'gmail') {
      const gmailService = await getGmailService(user.id)
      if (!gmailService) {
        return NextResponse.json(
          { success: false, message: 'Gmail not connected. Please connect your Gmail account first.' }
        )
      }

      const messages = await gmailService.getMessages(10) // Limit to 10 for agent calls

      for (const message of messages) {
        const textContent = gmailService.extractTextContent(message)

        await supabase.from('memories').insert({
          user_id: user.id,
          content: textContent,
          content_type: 'text',
          extracted_data: {
            gmail_id: message.id,
            thread_id: message.threadId,
            snippet: message.snippet
          },
          temporal_marker: new Date(parseInt(message.internalDate)).toISOString()
        })

        memoriesCreated++
      }
    } else if (source_type === 'drive') {
      const driveService = await getDriveService(user.id)
      if (!driveService) {
        return NextResponse.json(
          { success: false, message: 'Drive not connected. Please connect your Google Drive first.' }
        )
      }

      const files = await driveService.listFiles(10) // Limit to 10 for agent calls

      for (const file of files) {
        try {
          const content = await driveService.getFileContent(file.id, file.mimeType)

          await supabase.from('memories').insert({
            user_id: user.id,
            content: content.substring(0, 10000),
            content_type: 'document',
            extracted_data: {
              drive_file_id: file.id,
              name: file.name,
              mime_type: file.mimeType,
              size: file.size
            },
            temporal_marker: new Date(file.modifiedTime).toISOString()
          })

          memoriesCreated++
        } catch (error) {
          console.error(`Error processing file ${file.id}:`, error)
          continue
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from('data_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('source_type', source_type)

    return NextResponse.json({
      success: true,
      message: `Synced ${memoriesCreated} items from ${source_type}.`,
      memoriesCreated
    })
  } catch (error: any) {
    console.error('Sync tool error:', error)
    return NextResponse.json(
      { success: false, message: `Sync failed: ${error.message}` },
      { status: 500 }
    )
  }
}
