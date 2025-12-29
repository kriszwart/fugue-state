/**
 * Redis Client
 * Provides Redis connection and utility functions for caching, sessions, and real-time features
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL
  const redisHost = process.env.REDIS_HOST || 'localhost'
  const redisPort = parseInt(process.env.REDIS_PORT || '6379')
  const redisPassword = process.env.REDIS_PASSWORD
  const redisDb = parseInt(process.env.REDIS_DB || '0')

  if (redisUrl) {
    // Use connection URL (for Redis Cloud, Upstash, etc.)
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    })
  } else {
    // Use individual connection parameters
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      db: redisDb,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
    })
  }

  // Error handling
  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
  })

  redisClient.on('connect', () => {
    console.log('[Redis] Connecting...')
  })

  redisClient.on('ready', () => {
    console.log('[Redis] Ready')
  })

  redisClient.on('close', () => {
    console.log('[Redis] Connection closed')
  })

  return redisClient
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.error('[Redis] Not available:', error)
    return false
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient()
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`[Redis] Error getting key ${key}:`, error)
      return null
    }
  },

  /**
   * Set cached value with optional TTL (time to live in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const client = getRedisClient()
      const serialized = JSON.stringify(value)
      
      if (ttl) {
        await client.setex(key, ttl, serialized)
      } else {
        await client.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error(`[Redis] Error setting key ${key}:`, error)
      return false
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    try {
      const client = getRedisClient()
      await client.del(key)
      return true
    } catch (error) {
      console.error(`[Redis] Error deleting key ${key}:`, error)
      return false
    }
  },

  /**
   * Delete multiple keys by pattern using SCAN (production-safe)
   * Uses SCAN instead of KEYS to avoid blocking Redis
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = getRedisClient()
      let cursor = '0'
      let deletedCount = 0

      do {
        // SCAN returns [cursor, keys] - use MATCH to filter by pattern
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100 // Process 100 keys per iteration
        )

        cursor = newCursor

        if (keys.length > 0) {
          const deleted = await client.del(...keys)
          deletedCount += deleted
        }
      } while (cursor !== '0')

      return deletedCount
    } catch (error) {
      console.error(`[Redis] Error deleting pattern ${pattern}:`, error)
      return 0
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient()
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      console.error(`[Redis] Error checking key ${key}:`, error)
      return false
    }
  },

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.ttl(key)
    } catch (error) {
      console.error(`[Redis] Error getting TTL for key ${key}:`, error)
      return -1
    }
  },
}

/**
 * Rate limiting helper
 */
export const rateLimit = {
  /**
   * Check if rate limit is exceeded
   * @param key - Unique identifier (e.g., user ID, IP address)
   * @param limit - Maximum number of requests
   * @param window - Time window in seconds
   */
  async check(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; reset: number }> {
    try {
      const client = getRedisClient()
      const redisKey = `ratelimit:${key}`
      
      const current = await client.incr(redisKey)
      
      if (current === 1) {
        await client.expire(redisKey, window)
      }
      
      const ttl = await client.ttl(redisKey)
      const reset = Date.now() + (ttl * 1000)
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        reset
      }
    } catch (error) {
      console.error(`[Redis] Rate limit error for key ${key}:`, error)
      // Fail open - allow request if Redis fails
      return { allowed: true, remaining: limit, reset: Date.now() + (window * 1000) }
    }
  },
}

/**
 * Session helper functions
 */
export const session = {
  /**
   * Get session data
   */
  async get(sessionId: string): Promise<any | null> {
    return cache.get(`session:${sessionId}`)
  },

  /**
   * Set session data
   */
  async set(sessionId: string, data: any, ttl: number = 3600): Promise<boolean> {
    return cache.set(`session:${sessionId}`, data, ttl)
  },

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<boolean> {
    return cache.delete(`session:${sessionId}`)
  },
}

/**
 * Redis Streams - For real-time chat and activity feeds
 */
export const streams = {
  /**
   * Add message to chat stream
   */
  async addChatMessage(conversationId: string, message: { role: string; content: string; timestamp: string }) {
    try {
      const client = getRedisClient()
      await client.xadd(
        `chat:${conversationId}`,
        '*',
        'role', message.role,
        'content', message.content,
        'timestamp', message.timestamp
      )
      return true
    } catch (error) {
      console.error('[Redis] Stream error:', error)
      return false
    }
  },

  /**
   * Get recent chat messages from stream
   */
  async getChatMessages(conversationId: string, count: number = 50) {
    try {
      const client = getRedisClient()
      const messages = await client.xrevrange(`chat:${conversationId}`, '+', '-', 'COUNT', count)
      return messages.map(([id, fields]) => ({
        id,
        role: fields[1],
        content: fields[3],
        timestamp: fields[5]
      }))
    } catch (error) {
      console.error('[Redis] Stream read error:', error)
      return []
    }
  },

  /**
   * Add activity to activity stream
   */
  async addActivity(userId: string, activity: { type: string; data: any; timestamp: string }) {
    try {
      const client = getRedisClient()
      await client.xadd(
        `activity:${userId}`,
        '*',
        'type', activity.type,
        'data', JSON.stringify(activity.data),
        'timestamp', activity.timestamp
      )
      // Keep only last 1000 activities
      await client.xtrim(`activity:${userId}`, 'MAXLEN', '~', 1000)
      return true
    } catch (error) {
      console.error('[Redis] Activity stream error:', error)
      return false
    }
  },
}

/**
 * Pub/Sub for real-time notifications
 */
export const pubsub = {
  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.publish(channel, JSON.stringify(message))
    } catch (error) {
      console.error(`[Redis] Publish error for channel ${channel}:`, error)
      return 0
    }
  },

  /**
   * Subscribe to channel (returns subscriber client)
   */
  createSubscriber() {
    const subscriber = getRedisClient().duplicate()
    return subscriber
  },
}

/**
 * Sorted Sets - For rankings, trending, leaderboards
 */
export const sortedSets = {
  /**
   * Add score to sorted set
   */
  async add(key: string, member: string, score: number): Promise<boolean> {
    try {
      const client = getRedisClient()
      await client.zadd(key, score, member)
      return true
    } catch (error) {
      console.error(`[Redis] Sorted set error for key ${key}:`, error)
      return false
    }
  },

  /**
   * Get top members from sorted set
   */
  async getTop(key: string, count: number = 10): Promise<Array<{ member: string; score: number }>> {
    try {
      const client = getRedisClient()
      const results = await client.zrevrange(key, 0, count - 1, 'WITHSCORES')
      const top: Array<{ member: string; score: number }> = []
      for (let i = 0; i < results.length; i += 2) {
        top.push({ member: results[i], score: parseFloat(results[i + 1]) })
      }
      return top
    } catch (error) {
      console.error(`[Redis] Get top error for key ${key}:`, error)
      return []
    }
  },

  /**
   * Increment score
   */
  async increment(key: string, member: string, by: number = 1): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.zincrby(key, by, member)
    } catch (error) {
      console.error(`[Redis] Increment error for key ${key}:`, error)
      return 0
    }
  },
}

/**
 * HyperLogLog - For unique visitor/event counting
 */
export const hyperloglog = {
  /**
   * Add element to HyperLogLog
   */
  async add(key: string, element: string): Promise<boolean> {
    try {
      const client = getRedisClient()
      await client.pfadd(key, element)
      return true
    } catch (error) {
      console.error(`[Redis] HyperLogLog error for key ${key}:`, error)
      return false
    }
  },

  /**
   * Get count of unique elements
   */
  async count(key: string): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.pfcount(key)
    } catch (error) {
      console.error(`[Redis] HyperLogLog count error for key ${key}:`, error)
      return 0
    }
  },

  /**
   * Merge multiple HyperLogLogs
   */
  async merge(destKey: string, ...sourceKeys: string[]): Promise<boolean> {
    try {
      const client = getRedisClient()
      await client.pfmerge(destKey, ...sourceKeys)
      return true
    } catch (error) {
      console.error(`[Redis] HyperLogLog merge error:`, error)
      return false
    }
  },
}

/**
 * Bitmaps - For feature flags and activity tracking
 */
export const bitmaps = {
  /**
   * Set bit
   */
  async setBit(key: string, offset: number, value: 0 | 1): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.setbit(key, offset, value)
    } catch (error) {
      console.error(`[Redis] Bitmap error for key ${key}:`, error)
      return 0
    }
  },

  /**
   * Get bit
   */
  async getBit(key: string, offset: number): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.getbit(key, offset)
    } catch (error) {
      console.error(`[Redis] Bitmap get error for key ${key}:`, error)
      return 0
    }
  },

  /**
   * Count set bits
   */
  async bitCount(key: string): Promise<number> {
    try {
      const client = getRedisClient()
      return await client.bitcount(key)
    } catch (error) {
      console.error(`[Redis] Bitmap count error for key ${key}:`, error)
      return 0
    }
  },
}

/**
 * Advanced caching with intelligent invalidation
 */
export const smartCache = {
  /**
   * Cache with automatic invalidation tags
   */
  async setWithTags(key: string, value: any, ttl: number, tags: string[] = []): Promise<boolean> {
    try {
      await cache.set(key, value, ttl)
      
      // Store tags for invalidation
      if (tags.length > 0) {
        const client = getRedisClient()
        for (const tag of tags) {
          await client.sadd(`cache:tags:${tag}`, key)
          await client.expire(`cache:tags:${tag}`, ttl)
        }
      }
      
      return true
    } catch (error) {
      console.error(`[Redis] Smart cache error for key ${key}:`, error)
      return false
    }
  },

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateTag(tag: string): Promise<number> {
    try {
      const client = getRedisClient()
      const keys = await client.smembers(`cache:tags:${tag}`)
      if (keys.length === 0) return 0
      
      const deleted = await client.del(...keys)
      await client.del(`cache:tags:${tag}`)
      return deleted
    } catch (error) {
      console.error(`[Redis] Tag invalidation error for tag ${tag}:`, error)
      return 0
    }
  },
}

/**
 * Analytics and metrics
 */
export const analytics = {
  /**
   * Track event
   */
  async trackEvent(eventName: string, userId: string, metadata: any = {}): Promise<void> {
    try {
      const client = getRedisClient()
      const timestamp = Date.now()
      
      // Increment event counter
      await client.incr(`analytics:events:${eventName}`)
      
      // Add to user's event stream
      await client.zadd(`analytics:user:${userId}:events`, timestamp, JSON.stringify({
        event: eventName,
        metadata,
        timestamp
      }))
      
      // Track unique users per event (HyperLogLog)
      await hyperloglog.add(`analytics:unique:${eventName}`, userId)
      
      // Track daily events
      const today = new Date().toISOString().split('T')[0]
      await client.incr(`analytics:daily:${today}:${eventName}`)
      await client.expire(`analytics:daily:${today}:${eventName}`, 86400 * 7) // 7 days
    } catch (error) {
      console.error(`[Redis] Analytics error for event ${eventName}:`, error)
    }
  },

  /**
   * Get event count
   */
  async getEventCount(eventName: string): Promise<number> {
    try {
      const client = getRedisClient()
      const count = await client.get(`analytics:events:${eventName}`)
      return count ? parseInt(count) : 0
    } catch (error) {
      console.error(`[Redis] Get event count error for ${eventName}:`, error)
      return 0
    }
  },

  /**
   * Get unique users for event
   */
  async getUniqueUsers(eventName: string): Promise<number> {
    return hyperloglog.count(`analytics:unique:${eventName}`)
  },
}

/**
 * Close Redis connection (for cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

