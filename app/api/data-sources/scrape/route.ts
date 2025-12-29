import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getToolhouseService } from '@/lib/data-sources/toolhouse'

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

    const { url, includeLinks, includeImages, maxDepth, format, sourceName } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    const toolhouseService = getToolhouseService()

    // Scrape the website
    const scrapeResult = await toolhouseService.scrapeWebsite({
      url,
      includeLinks: includeLinks ?? true,
      includeImages: includeImages ?? false,
      maxDepth: maxDepth ?? 1,
      format: format || 'markdown'
    })

    // Process and store as memories
    const memoryIds = await toolhouseService.processAndStoreScrapedContent(
      user.id,
      scrapeResult,
      sourceName || `Web: ${new URL(url).hostname}`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully scraped and processed ${memoryIds.length} memory fragments`,
      memoryIds,
      metadata: scrapeResult.metadata
    })
  } catch (error: any) {
    console.error('Website scrape error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape website' },
      { status: 500 }
    )
  }
}
























