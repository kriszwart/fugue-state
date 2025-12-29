import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    // Check if this is JSON (storage registration) or FormData (direct upload)
    const contentType = request.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (isJson) {
      // Handle storage registration (file already uploaded to Supabase Storage)
      const body = await request.json()
      const { bucket, storagePath, name, size, type, content } = body

      if (!storagePath || !name) {
        return NextResponse.json(
          { error: 'Storage path and name are required' },
          { status: 400 }
        )
      }

      // Store as memory
      const { data: memory, error: memoryError } = await supabase
        .from('memories')
        .insert({
          user_id: user.id,
          data_source_id: null,
          content: content || '',
          content_type: 'document',
          extracted_data: {
            filename: name,
            size: size || 0,
            type: type || 'application/octet-stream',
            uploaded_at: new Date().toISOString(),
            source: 'vault_upload',
            storage_path: storagePath,
            bucket: bucket || 'artefacts'
          }
        })
        .select()
        .single()

      if (memoryError) {
        console.error('Error saving memory:', memoryError)
        return NextResponse.json(
          { error: 'Failed to save file metadata' },
          { status: 500 }
        )
      }

      // Check if this is user's first memory
      const { count: totalMemories } = await supabase
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const isFirstMemory = (totalMemories || 0) === 1

      return NextResponse.json({
        success: true,
        memoryId: memory.id,
        filename: name,
        size: size,
        isFirstMemory,
        message: 'File registered as memory'
      })
    }

    // Handle direct file upload via FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file type - support TXT and MD files
    const fileName = file.name.toLowerCase()
    const fileType = file.type
    const isSupportedType =
      fileType === 'text/plain' ||
      fileType === 'text/markdown' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md')

    if (!isSupportedType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload TXT or MD files.' },
        { status: 400 }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const textContent = new TextDecoder().decode(arrayBuffer)

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }

    // Store as memory (data_source_id is optional)
    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        data_source_id: null,
        content: textContent,
        content_type: 'document',
        extracted_data: {
          filename: file.name,
          size: file.size,
          type: fileType || 'text/plain',
          uploaded_at: new Date().toISOString(),
          source: 'local_upload'
        }
      })
      .select()
      .single()

    if (memoryError) {
      console.error('Error saving memory:', memoryError)
      return NextResponse.json(
        { error: 'Failed to save file content' },
        { status: 500 }
      )
    }

    // Check if this is user's first memory
    const { count: totalMemories } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const isFirstMemory = (totalMemories || 0) === 1

    return NextResponse.json({
      success: true,
      memoryId: memory.id,
      filename: file.name,
      size: file.size,
      isFirstMemory,
      message: 'File uploaded and imported as memory'
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred during upload' },
      { status: 500 }
    )
  }
}
