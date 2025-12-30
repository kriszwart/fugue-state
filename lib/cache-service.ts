/**
 * Cache Service
 * High-performance caching layer for instant loading and smooth UX
 */

import { cache, smartCache } from './redis';

// Cache TTLs (in seconds)
const CACHE_TTL = {
  USER_PROFILE: 3600,        // 1 hour
  USER_INIT_STATUS: 1800,    // 30 minutes
  MUSE_CONFIG: 7200,         // 2 hours
  MEMORIES_LIST: 300,        // 5 minutes
  MEMORY_DETAIL: 600,        // 10 minutes
  FIRST_SCAN: 1800,          // 30 minutes
  ARTEFACTS: 900,            // 15 minutes
  DATA_SOURCES: 1800,        // 30 minutes
  CONVERSATIONS: 300,        // 5 minutes
};

/**
 * User Profile & Initialization Cache
 */
export const userCache = {
  /**
   * Cache user initialization status
   * Call this when user completes any init step
   */
  async cacheInitStatus(userId: string, status: {
    hasName: boolean;
    userName?: string;
    hasConnectedSources: boolean;
    connectedSources: string[];
    selectedMuse?: string;
    initCompleted: boolean;
    firstScanDone: boolean;
  }) {
    const key = `user:${userId}:init_status`;
    await smartCache.setWithTags(key, status, CACHE_TTL.USER_INIT_STATUS, [
      `user:${userId}`,
      'init_status'
    ]);
    return true;
  },

  /**
   * Get cached init status (instant!)
   */
  async getInitStatus(userId: string) {
    const key = `user:${userId}:init_status`;
    return await cache.get<any>(key);
  },

  /**
   * Cache user profile
   */
  async cacheProfile(userId: string, profile: {
    id: string;
    email: string;
    userName: string;
    createdAt: string;
    preferences?: any;
  }) {
    const key = `user:${userId}:profile`;
    await smartCache.setWithTags(key, profile, CACHE_TTL.USER_PROFILE, [
      `user:${userId}`,
      'profiles'
    ]);
    return true;
  },

  /**
   * Get cached profile
   */
  async getProfile(userId: string) {
    const key = `user:${userId}:profile`;
    return await cache.get<any>(key);
  },

  /**
   * Invalidate all user cache when they update settings
   */
  async invalidateUser(userId: string) {
    await smartCache.invalidateTag(`user:${userId}`);
  },
};

/**
 * Muse & First Scan Cache
 */
export const museCache = {
  /**
   * Cache first scan results
   */
  async cacheFirstScan(userId: string, scanData: any) {
    const key = `user:${userId}:first_scan`;
    await smartCache.setWithTags(key, scanData, CACHE_TTL.FIRST_SCAN, [
      `user:${userId}`,
      'scans'
    ]);
    return true;
  },

  /**
   * Get cached first scan (shows instantly while loading fresh data)
   */
  async getFirstScan(userId: string) {
    const key = `user:${userId}:first_scan`;
    return await cache.get<any>(key);
  },

  /**
   * Cache pending artefacts from initialization
   */
  async cachePendingArtefacts(userId: string, artefacts: {
    museType: string;
    memoryId: string;
    poem?: any;
    image?: any;
    collection?: any;
  }) {
    const key = `user:${userId}:pending_artefacts`;
    await smartCache.setWithTags(key, artefacts, CACHE_TTL.ARTEFACTS, [
      `user:${userId}`,
      'artefacts'
    ]);
    return true;
  },

  /**
   * Get pending artefacts
   */
  async getPendingArtefacts(userId: string) {
    const key = `user:${userId}:pending_artefacts`;
    return await cache.get<any>(key);
  },
};

/**
 * Memories Cache
 */
export const memoryCache = {
  /**
   * Cache memories list with pagination
   */
  async cacheMemoriesList(userId: string, page: number, memories: any[]) {
    const key = `user:${userId}:memories:page:${page}`;
    await smartCache.setWithTags(key, memories, CACHE_TTL.MEMORIES_LIST, [
      `user:${userId}`,
      `memories:${userId}`,
      'memories_list'
    ]);
    return true;
  },

  /**
   * Get cached memories list
   */
  async getMemoriesList(userId: string, page: number) {
    const key = `user:${userId}:memories:page:${page}`;
    return await cache.get<any[]>(key);
  },

  /**
   * Cache individual memory
   */
  async cacheMemory(userId: string, memoryId: string, memory: any) {
    const key = `user:${userId}:memory:${memoryId}`;
    await smartCache.setWithTags(key, memory, CACHE_TTL.MEMORY_DETAIL, [
      `user:${userId}`,
      `memories:${userId}`,
      `memory:${memoryId}`
    ]);
    return true;
  },

  /**
   * Get cached memory
   */
  async getMemory(userId: string, memoryId: string) {
    const key = `user:${userId}:memory:${memoryId}`;
    return await cache.get<any>(key);
  },

  /**
   * Invalidate all memories when new one is added
   */
  async invalidateMemoriesList(userId: string) {
    await smartCache.invalidateTag(`memories:${userId}`);
  },
};

/**
 * Data Sources Cache
 */
export const dataSourceCache = {
  /**
   * Cache connected data sources
   */
  async cacheDataSources(userId: string, sources: any[]) {
    const key = `user:${userId}:data_sources`;
    await smartCache.setWithTags(key, sources, CACHE_TTL.DATA_SOURCES, [
      `user:${userId}`,
      'data_sources'
    ]);
    return true;
  },

  /**
   * Get cached data sources
   */
  async getDataSources(userId: string) {
    const key = `user:${userId}:data_sources`;
    return await cache.get<any[]>(key);
  },

  /**
   * Invalidate when sources change
   */
  async invalidateDataSources(_userId: string) {
    await smartCache.invalidateTag('data_sources');
  },
};

/**
 * Conversations Cache
 */
export const conversationCache = {
  /**
   * Cache conversation list
   */
  async cacheConversations(userId: string, conversations: any[]) {
    const key = `user:${userId}:conversations`;
    await smartCache.setWithTags(key, conversations, CACHE_TTL.CONVERSATIONS, [
      `user:${userId}`,
      'conversations'
    ]);
    return true;
  },

  /**
   * Get cached conversations
   */
  async getConversations(userId: string) {
    const key = `user:${userId}:conversations`;
    return await cache.get<any[]>(key);
  },

  /**
   * Cache individual conversation messages
   */
  async cacheConversationMessages(userId: string, conversationId: string, messages: any[]) {
    const key = `user:${userId}:conversation:${conversationId}:messages`;
    await smartCache.setWithTags(key, messages, CACHE_TTL.CONVERSATIONS, [
      `user:${userId}`,
      `conversation:${conversationId}`
    ]);
    return true;
  },

  /**
   * Get cached conversation messages
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const key = `user:${userId}:conversation:${conversationId}:messages`;
    return await cache.get<any[]>(key);
  },
};

/**
 * Warm cache - Pre-load data during loading screens
 * Call this when showing loading animations to fetch and cache data in background
 */
export const warmCache = {
  /**
   * Warm all user data during loading screen
   * This runs in the background while showing the loading animation
   */
  async warmUserData(userId: string) {
    try {
      // Fetch all data in parallel
      const [profile, initStatus, dataSources, memories, conversations] = await Promise.allSettled([
        // Profile
        fetch(`/api/user/profile?userId=${userId}`).then(r => r.json()),
        // Init status
        fetch(`/api/initialization/status?userId=${userId}`).then(r => r.json()),
        // Data sources
        fetch(`/api/privacy/data-sources?userId=${userId}`).then(r => r.json()),
        // Recent memories
        fetch(`/api/memories?userId=${userId}&limit=20`).then(r => r.json()),
        // Conversations
        fetch(`/api/conversations?userId=${userId}`).then(r => r.json()),
      ]);

      // Cache all successful responses
      if (profile.status === 'fulfilled') {
        await userCache.cacheProfile(userId, profile.value);
      }
      if (initStatus.status === 'fulfilled') {
        await userCache.cacheInitStatus(userId, initStatus.value);
      }
      if (dataSources.status === 'fulfilled') {
        await dataSourceCache.cacheDataSources(userId, dataSources.value.dataSources || []);
      }
      if (memories.status === 'fulfilled') {
        await memoryCache.cacheMemoriesList(userId, 1, memories.value.memories || []);
      }
      if (conversations.status === 'fulfilled') {
        await conversationCache.cacheConversations(userId, conversations.value.conversations || []);
      }

      return true;
    } catch (error) {
      console.error('[Cache] Error warming user data:', error);
      return false;
    }
  },

  /**
   * Warm muse data after initialization
   */
  async warmMuseData(userId: string, museType: string) {
    try {
      // Fetch first scan and artefacts
      const [firstScan, artefacts] = await Promise.allSettled([
        fetch(`/api/muse/first-scan?userId=${userId}&museType=${museType}`).then(r => r.json()),
        fetch(`/api/artefacts?userId=${userId}&limit=10`).then(r => r.json()),
      ]);

      if (firstScan.status === 'fulfilled') {
        await museCache.cacheFirstScan(userId, firstScan.value);
      }
      if (artefacts.status === 'fulfilled') {
        // Cache artefacts individually
        for (const artefact of artefacts.value.artefacts || []) {
          const key = `user:${userId}:artefact:${artefact.id}`;
          await cache.set(key, artefact, CACHE_TTL.ARTEFACTS);
        }
      }

      return true;
    } catch (error) {
      console.error('[Cache] Error warming muse data:', error);
      return false;
    }
  },
};

/**
 * Optimistic Cache Helper
 * Returns cached data immediately while fetching fresh data in background
 */
export async function getCachedOrFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300,
  tags: string[] = []
): Promise<{ data: T; fromCache: boolean }> {
  // Try cache first
  const cached = await cache.get<T>(cacheKey);

  if (cached) {
    // Return cached data immediately
    // Refresh in background (fire and forget)
    fetchFn()
      .then(fresh => smartCache.setWithTags(cacheKey, fresh, ttl, tags))
      .catch(err => console.error('[Cache] Background refresh failed:', err));

    return { data: cached, fromCache: true };
  }

  // No cache, fetch fresh
  const fresh = await fetchFn();
  await smartCache.setWithTags(cacheKey, fresh, ttl, tags);

  return { data: fresh, fromCache: false };
}
