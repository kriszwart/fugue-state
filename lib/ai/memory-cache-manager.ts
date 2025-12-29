/**
 * Memory Cache Manager
 *
 * Implements context caching for user memories to save 60% on API costs
 * Caches entire user memory corpus for reuse across multiple queries
 */

import { getEnhancedVertexGeminiLLM } from './providers/vertex-enhanced'
import { createServerSupabaseClient } from '@/lib/supabase'

export class MemoryCacheManager {
  private gemini = getEnhancedVertexGeminiLLM()
  private cacheMap = new Map<string, { cacheId: string; expiresAt: number }>()
  private enabled = process.env.ENABLE_CONTEXT_CACHING === 'true'

  /**
   * Cache all of a user's memories for fast querying
   * Returns cache ID for reuse
   */
  async cacheUserMemories(userId: string, ttl: number = 3600): Promise<string> {
    if (!this.enabled) {
      throw new Error('Context caching is not enabled. Set ENABLE_CONTEXT_CACHING=true in .env.local')
    }

    const supabase = createServerSupabaseClient()

    // Load all user memories (can handle up to 2M tokens!)
    const { data: memories, error } = await supabase
      .from('memories')
      .select('content, themes, emotional_tags, created_at, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error || !memories || memories.length === 0) {
      throw new Error('No memories found to cache')
    }

    console.log(`[Cache Manager] Caching ${memories.length} memories for user ${userId}`)

    // Format memories for caching
    const memoryContext = memories.map((m, i) =>
      `[Memory ${i + 1} from ${m.created_at}]
${m.content}
Themes: ${m.themes?.join(', ') || 'none'}
Emotional Tags: ${m.emotional_tags?.join(', ') || 'none'}
${m.metadata ? `Context: ${JSON.stringify(m.metadata)}` : ''}`
    ).join('\n\n---\n\n')

    // Cache the context
    const cached = await this.gemini.cacheContext([{
      role: 'system',
      content: `You are Dameris, analyzing a user's complete memory corpus. These ${memories.length} memories represent their life experiences, thoughts, and moments. Use this context to provide deep, personalized insights.`
    }, {
      role: 'user',
      content: `Here are all of my memories:\n\n${memoryContext}`
    }], {
      ttl,
      displayName: `User ${userId} Memory Corpus`
    })

    // Store cache ID with expiry
    this.cacheMap.set(userId, {
      cacheId: cached.name,
      expiresAt: Date.now() + (ttl * 1000)
    })

    console.log(`[Cache Manager] ✓ Cached ${memories.length} memories (ID: ${cached.name.split('/').pop()})`)

    return cached.name
  }

  /**
   * Query cached memories (60% cheaper!)
   * Auto-creates cache if it doesn't exist or is expired
   */
  async queryMemories(userId: string, query: string): Promise<{
    answer: string
    thinking?: string
    usage?: {
      totalTokens: number
      cachedTokens: number
      savings: string
    }
  }> {
    if (!this.enabled) {
      throw new Error('Context caching is not enabled')
    }

    // Get or create cache
    let cacheId: string
    const existing = this.cacheMap.get(userId)

    if (existing && existing.expiresAt > Date.now()) {
      cacheId = existing.cacheId
      console.log('[Cache Manager] Using existing cache (HIT)')
    } else {
      console.log('[Cache Manager] Cache MISS - creating new cache')
      cacheId = await this.cacheUserMemories(userId)
    }

    // Query using cached context
    const useThinking = process.env.ENABLE_THINKING_MODE === 'true'

    const response = await this.gemini.generateWithThinking([{
      role: 'user',
      content: query
    }], {
      cachedContext: cacheId,
      temperature: 0.7,
      maxTokens: 1500,
      useThinking
    })

    // Calculate savings
    const cachedTokens = response.usage?.cachedTokens || 0
    const totalTokens = response.usage?.totalTokens || 1
    const savingsPercent = ((cachedTokens / totalTokens) * 100).toFixed(0)

    console.log('[Cache Manager] Query complete:', {
      cachedTokens,
      newTokens: response.usage?.promptTokens,
      savings: `${savingsPercent}%`
    })

    return {
      answer: response.content,
      thinking: response.thinking,
      usage: {
        totalTokens,
        cachedTokens,
        savings: `${savingsPercent}%`
      }
    }
  }

  /**
   * Clear cache for a user (forces recreation on next query)
   */
  clearCache(userId: string): void {
    this.cacheMap.delete(userId)
    console.log(`[Cache Manager] Cleared cache for user ${userId}`)
  }

  /**
   * Get cache stats
   */
  getCacheStats(userId: string): { exists: boolean; expiresAt?: number; timeRemaining?: string } {
    const cached = this.cacheMap.get(userId)

    if (!cached) {
      return { exists: false }
    }

    const remaining = Math.max(0, cached.expiresAt - Date.now())
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    return {
      exists: true,
      expiresAt: cached.expiresAt,
      timeRemaining: `${minutes}m ${seconds}s`
    }
  }
}

// Singleton instance
let cacheManagerInstance: MemoryCacheManager | null = null

export function getMemoryCacheManager(): MemoryCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new MemoryCacheManager()
  }
  return cacheManagerInstance
}
