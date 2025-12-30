import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
// @ts-ignore - JSZip types
import JSZip from 'jszip'

export async function GET(request: NextRequest) {
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
    const format = searchParams.get('format') || 'json'

    // Fetch all user data
    const [memoriesResult, conversationsResult, artefactsResult, patternsResult] = await Promise.all([
      supabase.from('memories').select('*').eq('user_id', user.id),
      supabase.from('conversations').select('*, messages(*)').eq('user_id', user.id),
      supabase.from('artefacts').select('*').eq('user_id', user.id),
      supabase.from('memory_patterns').select('*').eq('user_id', user.id)
    ])

    const memories = memoriesResult.data || []
    const conversations = conversationsResult.data || []
    const artefacts = artefactsResult.data || []
    const patterns = patternsResult.data || []

    if (format === 'json') {
      const exportData = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        memories,
        conversations,
        artefacts,
        patterns
      }

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="fugue-state-export-${Date.now()}.json"`
        }
      })
    }

    if (format === 'markdown') {
      let markdown = `# Fugue State Export\n\n`
      markdown += `Export Date: ${new Date().toISOString()}\n\n`

      markdown += `## Memories (${memories.length})\n\n`
      memories.forEach((memory: any, index: number) => {
        markdown += `### Memory ${index + 1}\n\n`
        markdown += `**Date:** ${memory.temporal_marker || memory.created_at}\n\n`
        markdown += `**Themes:** ${memory.themes?.join(', ') || 'None'}\n\n`
        markdown += `**Emotions:** ${memory.emotional_tags?.join(', ') || 'None'}\n\n`
        markdown += `**Content:**\n${memory.content}\n\n---\n\n`
      })

      markdown += `## Conversations (${conversations.length})\n\n`
      conversations.forEach((conv: any, index: number) => {
        markdown += `### Conversation ${index + 1}: ${conv.title || 'Untitled'}\n\n`
        if (conv.messages) {
          conv.messages.forEach((msg: any) => {
            markdown += `**${msg.role}:** ${msg.content}\n\n`
          })
        }
        markdown += `---\n\n`
      })

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="fugue-state-export-${Date.now()}.md"`
        }
      })
    }

    if (format === 'zip') {
      const zip = new JSZip()

      // Add JSON export
      zip.file('export.json', JSON.stringify({
        export_date: new Date().toISOString(),
        user_id: user.id,
        memories,
        conversations,
        artefacts,
        patterns
      }, null, 2))

      // Add markdown export
      let markdown = `# Fugue State Export\n\nExport Date: ${new Date().toISOString()}\n\n`
      markdown += `## Summary\n\n`
      markdown += `- Memories: ${memories.length}\n`
      markdown += `- Conversations: ${conversations.length}\n`
      markdown += `- Artefacts: ${artefacts.length}\n`
      markdown += `- Patterns: ${patterns.length}\n\n`
      zip.file('export.md', markdown)

      // Add images (if any)
      const imageArtefacts = artefacts.filter((a: any) => a.artefact_type === 'image')
      for (const artefact of imageArtefacts) {
        if (artefact.file_url) {
          try {
            const imageResponse = await fetch(artefact.file_url)
            const imageBlob = await imageResponse.blob()
            zip.file(`images/${artefact.id}.png`, imageBlob)
          } catch (error) {
            console.error(`Error downloading image ${artefact.id}:`, error)
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'arraybuffer' })

      return new NextResponse(zipBlob as BodyInit, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="fugue-state-export-${Date.now()}.zip"`
        }
      })
    }

    return NextResponse.json(
      { error: 'Unsupported format. Use: json, markdown, or zip' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

