/**
 * Image Memory Upload
 * Upload photos as visual memories with AI analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getEnhancedVertexGeminiLLM } from '@/lib/ai/providers/vertex-enhanced'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for image processing

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const image = formData.get('image') as File
    const userContext = formData.get('context') as string | null
    const title = formData.get('title') as string | null

    if (!image) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image must be less than 10MB' },
        { status: 400 }
      )
    }

    console.log(`[Image Upload] Processing ${image.name} (${(image.size / 1024).toFixed(1)}KB) for user ${user.id}`)

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Analyze image with Gemini Vision
    const gemini = getEnhancedVertexGeminiLLM()

    console.log('[Image Upload] Analyzing image with Gemini Vision...')

    const analysisPrompt = `Analyze this image as a personal memory. ${userContext ? `Context provided by user: "${userContext}"` : ''}

Please provide a comprehensive analysis including:

1. **Visual Description**: What's in the image (objects, people, places, setting)
2. **Mood & Atmosphere**: The emotional tone and feeling
3. **Visual Themes**: Colors, composition, lighting, style
4. **Symbolic Elements**: Any meaningful symbols or metaphors
5. **Memory Significance**: Why this might be meaningful as a memory
6. **Creative Potential**: How this could be used in dreams, remixes, collages
7. **Emotional Resonance**: What emotions this image evokes

Be poetic yet specific. This is someone's cherished memory.`

    const analysis = await gemini.analyzeMultimodal([
      { text: analysisPrompt },
      {
        inlineData: {
          mimeType: image.type,
          data: base64
        }
      }
    ], {
      model: 'gemini-1.5-pro-002', // Pro model for better vision
      temperature: 0.7,
      maxTokens: 1500
    })

    console.log('[Image Upload] ✓ Analysis complete')

    // Extract structured themes using function calling
    const themeExtraction = await gemini.generateWithFunctions(
      `Based on this image analysis, extract structured themes and metadata:

${analysis.content}

Extract:
- Visual themes (colors, composition elements)
- Emotional themes (moods, feelings)
- Tags for categorization
- Dominant colors (hex codes if possible)`,
      [{
        name: 'extract_visual_themes',
        description: 'Extract visual and emotional themes from image analysis',
        parameters: {
          type: 'object',
          properties: {
            visualThemes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Visual themes like "sunset", "nature", "urban", etc.'
            },
            emotionalThemes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Emotional themes like "nostalgia", "joy", "melancholy"'
            },
            dominantColors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Main colors in the image'
            },
            suggestedTags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization'
            },
            mood: {
              type: 'string',
              description: 'Overall mood in one word'
            },
            title: {
              type: 'string',
              description: 'Suggested title for this memory if none provided'
            }
          },
          required: ['visualThemes', 'emotionalThemes', 'suggestedTags', 'mood']
        }
      }],
      {
        temperature: 0.6
      }
    )

    const themes = themeExtraction.functionCall?.args || {}

    console.log('[Image Upload] ✓ Themes extracted:', themes)

    // Upload image to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${image.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('memories')
      .upload(fileName, image, {
        contentType: image.type,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('[Image Upload] Storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('memories')
      .getPublicUrl(fileName)

    console.log('[Image Upload] ✓ Image stored:', publicUrl)

    // Save memory to database
    const memoryTitle = title || themes.title || 'Visual Memory'
    const allThemes = [
      ...(themes.visualThemes || []),
      ...(themes.emotionalThemes || [])
    ].slice(0, 10) // Limit to 10 themes

    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        title: memoryTitle,
        content: analysis.content,
        media_type: 'image',
        media_url: publicUrl,
        themes: allThemes,
        emotional_tags: themes.emotionalThemes || [],
        metadata: {
          originalFileName: image.name,
          fileSize: image.size,
          mimeType: image.type,
          userContext: userContext || null,
          visualAnalysis: {
            description: analysis.content,
            dominantColors: themes.dominantColors,
            mood: themes.mood,
            tags: themes.suggestedTags,
            model: analysis.model
          }
        }
      })
      .select()
      .single()

    if (memoryError) {
      console.error('[Image Upload] Database error:', memoryError)
      return NextResponse.json(
        { error: 'Failed to save memory' },
        { status: 500 }
      )
    }

    console.log('[Image Upload] ✓ Memory saved:', memory.id)

    return NextResponse.json({
      success: true,
      memory: {
        id: memory.id,
        title: memoryTitle,
        imageUrl: publicUrl,
        analysis: analysis.content,
        themes: allThemes,
        mood: themes.mood,
        colors: themes.dominantColors,
        tags: themes.suggestedTags
      }
    })
  } catch (error: any) {
    console.error('[Image Upload] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    )
  }
}
