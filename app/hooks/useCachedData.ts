/**
 * useCachedData Hook
 * React hook for instant data loading with Redis cache
 * Returns cached data immediately while fetching fresh data in background
 */

import { useState, useEffect } from 'react';

interface UseCachedDataOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T, fromCache: boolean) => void;
  onError?: (error: Error) => void;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  fromCache: boolean;
  refetch: () => Promise<void>;
}

export function useCachedData<T>({
  cacheKey,
  fetchFn,
  enabled = true,
  onSuccess,
  onError,
}: UseCachedDataOptions<T>): UseCachedDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call API endpoint that uses Redis cache
      const response = await fetch(`/api/cache/get?key=${encodeURIComponent(cacheKey)}`);

      if (!response.ok) {
        throw new Error('Cache fetch failed');
      }

      const result = await response.json();

      if (result.data) {
        // We have cached data! Show it immediately
        setData(result.data);
        setFromCache(result.fromCache);
        setIsLoading(false);
        onSuccess?.(result.data, result.fromCache);

        // If from cache, fetch fresh data in background
        if (result.fromCache) {
          fetchFn()
            .then(fresh => {
              setData(fresh);
              setFromCache(false);
              // Update cache via API
              fetch('/api/cache/set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: cacheKey, value: fresh }),
              });
            })
            .catch(err => console.error('Background refresh failed:', err));
        }
      } else {
        // No cache, fetch fresh
        const fresh = await fetchFn();
        setData(fresh);
        setFromCache(false);
        setIsLoading(false);
        onSuccess?.(fresh, false);

        // Cache the fresh data
        fetch('/api/cache/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: cacheKey, value: fresh }),
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setIsLoading(false);
      onError?.(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cacheKey, enabled]);

  return {
    data,
    isLoading,
    error,
    fromCache,
    refetch: fetchData,
  };
}

/**
 * Hook for initialization status with instant loading
 */
export function useInitStatus(userId: string | null) {
  return useCachedData({
    cacheKey: userId ? `user:${userId}:init_status` : '',
    fetchFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/initialization/status`);
      return res.json();
    },
    enabled: !!userId,
  });
}

/**
 * Hook for user profile with instant loading
 */
export function useUserProfile(userId: string | null) {
  return useCachedData({
    cacheKey: userId ? `user:${userId}:profile` : '',
    fetchFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/user/profile`);
      return res.json();
    },
    enabled: !!userId,
  });
}

/**
 * Hook for memories with instant loading
 */
export function useMemories(userId: string | null, page: number = 1) {
  return useCachedData({
    cacheKey: userId ? `user:${userId}:memories:page:${page}` : '',
    fetchFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/memories?page=${page}&limit=20`);
      const data = await res.json();
      return data.memories || [];
    },
    enabled: !!userId,
  });
}

/**
 * Hook for first scan results with instant loading
 */
export function useFirstScan(userId: string | null, museType: string | null) {
  return useCachedData({
    cacheKey: userId && museType ? `user:${userId}:first_scan` : '',
    fetchFn: async () => {
      if (!userId || !museType) return null;
      const res = await fetch(`/api/muse/first-scan?museType=${museType}`);
      return res.json();
    },
    enabled: !!userId && !!museType,
  });
}
