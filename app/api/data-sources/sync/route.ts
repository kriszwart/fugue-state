import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getGmailService } from '@/lib/data-sources/gmail'
import { getDriveService } from '@/lib/data-sources/drive'
import { getNotionService } from '@/lib/data-sources/notion'

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

    const { sourceType } = await request.json()

    if (!sourceType) {
      return NextResponse.json(
        { error: 'Source type is required' },
        { status: 400 }
      )
    }

    let memoriesCreated = 0

    if (sourceType === 'gmail') {
      const gmailService = await getGmailService(user.id)
      if (!gmailService) {
        return NextResponse.json(
          { error: 'Gmail not connected' },
          { status: 400 }
        )
      }

      const messages = await gmailService.getMessages(50)
      
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
    } else if (sourceType === 'drive') {
      const driveService = await getDriveService(user.id)
      if (!driveService) {
        return NextResponse.json(
          { error: 'Drive not connected' },
          { status: 400 }
        )
      }

      const files = await driveService.listFiles(50)
      
      for (const file of files) {
        try {
          const content = await driveService.getFileContent(file.id, file.mimeType)

          await supabase.from('memories').insert({
            user_id: user.id,
            content: content.substring(0, 10000), // Limit content size
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
          // Skip files that can't be processed (unsupported types, etc.)
          continue
        }
      }
    } else if (sourceType === 'notion') {
      const notionService = await getNotionService(user.id)
      if (!notionService) {
        return NextResponse.json(
          { error: 'Notion not connected' },
          { status: 400 }
        )
      }

      const pages = await notionService.searchPages()
      
      for (const page of pages) {
        try {
          const blocks = await notionService.getPageContent(page.id)
          const textContent = notionService.extractTextFromBlocks(blocks)
          
          await supabase.from('memories').insert({
            user_id: user.id,
            content: textContent,
            content_type: 'document',
            extracted_data: {
              notion_page_id: page.id,
              url: page.url,
              properties: page.properties
            },
            temporal_marker: new Date(page.last_edited_time).toISOString()
          })

          memoriesCreated++
        } catch (error) {
          console.error(`Error processing page ${page.id}:`, error)
        }
      }
    }

    // Update last_synced_at
    await supabase
      .from('data_sources')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('source_type', sourceType)

    // Check if this is user's first memory import
    const { count: totalMemories } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    const isFirstImport = (totalMemories || 0) === memoriesCreated

    return NextResponse.json({
      success: true,
      memoriesCreated,
      isFirstImport: isFirstImport,
      onboardingEvent: isFirstImport && memoriesCreated > 0 ? 'memoryImported' : null
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}













