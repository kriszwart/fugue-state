// Toolhouse.ai integration for website scraping and AI agent connections
import { createServiceRoleClient } from '@/lib/supabase'
import { DataExtractor } from '@/lib/processors/data-extractor'
import { MemoryParser } from '@/lib/processors/memory-parser'
import { PatternDetector } from '@/lib/processors/pattern-detector'

export interface ToolhouseScrapeOptions {
  url: string
  includeLinks?: boolean
  includeImages?: boolean
  maxDepth?: number
  format?: 'markdown' | 'html' | 'text'
}

export interface ToolhouseScrapeResult {
  content: string
  title?: string
  metadata?: {
    url: string
    scrapedAt: string
    format: string
    links?: string[]
    images?: string[]
  }
}

export class ToolhouseService {
  private apiKey: string
  private apiUrl: string = 'https://api.toolhouse.ai'
  private supabase = createServiceRoleClient()
  private dataExtractor = new DataExtractor()
  private memoryParser = new MemoryParser()
  private patternDetector = new PatternDetector()

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Scrape a website URL using Toolhouse.ai
   * Uses Toolhouse's "Get page contents" tool via agent API
   */
  async scrapeWebsite(options: ToolhouseScrapeOptions): Promise<ToolhouseScrapeResult> {
    try {
      // Toolhouse uses agent-based API - we'll use their scraping agent
      const response = await fetch(`${this.apiUrl}/agents/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: options.url,
          options: {
            include_links: options.includeLinks ?? true,
            include_images: options.includeImages ?? false,
            max_depth: options.maxDepth ?? 1,
            format: options.format ?? 'markdown'
          }
        })
      })

      if (!response.ok) {
        // Try alternative endpoint format
        const altResponse = await fetch(`${this.apiUrl}/v1/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: options.url,
            options: {
              include_links: options.includeLinks ?? true,
              include_images: options.includeImages ?? false,
              max_depth: options.maxDepth ?? 1,
              format: options.format ?? 'markdown'
            }
          })
        })

        if (!altResponse.ok) {
          const error = await altResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`Toolhouse API error: ${error.error || altResponse.statusText}`)
        }

        const data = await altResponse.json()
        return this.parseScrapeResult(data, options)
      }

      const data = await response.json()
      return this.parseScrapeResult(data, options)
    } catch (error: any) {
      console.error('Toolhouse scrape error:', error)
      throw new Error(`Failed to scrape website: ${error.message}`)
    }
  }

  /**
   * Parse scrape result from Toolhouse API response
   */
  private parseScrapeResult(data: any, options: ToolhouseScrapeOptions): ToolhouseScrapeResult {
    // Handle different response formats
    const content = data.content || data.text || data.body || data.html || ''
    const title = data.title || data.pageTitle || ''
    const links = data.links || data.hrefs || []
    const images = data.images || data.imgs || []

    return {
      content,
      title,
      metadata: {
        url: options.url,
        scrapedAt: new Date().toISOString(),
        format: options.format || 'markdown',
        links,
        images
      }
    }
  }

  /**
   * Connect to an AI agent or MCP endpoint via Toolhouse
   */
  async connectAgent(agentUrl: string, agentType: 'mcp' | 'agent' = 'agent'): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/agents/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: agentUrl,
          type: agentType
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Toolhouse agent connection error: ${error.error || response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      console.error('Toolhouse agent connection error:', error)
      throw new Error(`Failed to connect to agent: ${error.message}`)
    }
  }

  /**
   * Process scraped content and store as memories
   */
  async processAndStoreScrapedContent(
    userId: string,
    scrapeResult: ToolhouseScrapeResult,
    sourceName: string = 'Web Scrape'
  ): Promise<string[]> {
    const extracted = this.dataExtractor.extractText(scrapeResult.content, 'text')

    // parseToMemoryFragments now handles database insertion and returns memory IDs
    const memoryIds = await this.memoryParser.parseToMemoryFragments(
      extracted.text,
      'web_scrape',
      {
        ...extracted.metadata,
        ...scrapeResult.metadata,
        source: 'toolhouse',
        title: scrapeResult.title
      },
      userId
    )

    // Store data source record
    await this.supabase
      .from('data_sources')
      .upsert({
        user_id: userId,
        source_type: 'mcp',
        source_name: sourceName,
        metadata: {
          toolhouse_url: scrapeResult.metadata?.url,
          scraped_at: scrapeResult.metadata?.scrapedAt,
          agent_type: 'web_scrape'
        },
        is_active: true,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,source_type'
      })

    // Note: Pattern detection could be added here in the future
    // For now, just return the created memory IDs
    return memoryIds
  }

  /**
   * Legacy pattern detection code (preserved for reference)
   * TODO: Re-implement pattern detection after memory fragments are stored
   */
  private async detectPatternsForMemories(userId: string, memoryIds: string[]): Promise<void> {
    // Future implementation: detect patterns across stored memories
    // const patterns = await this.patternDetector.detectPatterns(userId, fragments)
    // for (const pattern of patterns) {
    //   await this.supabase.from('memory_patterns').insert({
    //     user_id: userId,
    //     pattern_type: pattern.type,
    //     pattern_data: pattern.patternData,
    //     confidence_score: pattern.patternData.confidence,
    //     memory_ids: [memory.id]
    //   })
    // }
  }
}

export function getToolhouseService(): ToolhouseService {
  const apiKey = process.env.TOOLHOUSE_API_KEY
  if (!apiKey) {
    throw new Error('TOOLHOUSE_API_KEY environment variable is required')
  }
  return new ToolhouseService(apiKey)
}

