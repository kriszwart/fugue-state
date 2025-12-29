/**
 * Request Deduplication
 * Prevents duplicate API calls when multiple components request the same data
 * Dramatically reduces server load and improves performance
 */

const pendingRequests = new Map<string, Promise<any>>();
const requestTimestamps = new Map<string, number>();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Deduplicated fetch - returns existing promise if request is in flight
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    maxAge?: number; // Don't deduplicate if last request was > maxAge ms ago
    force?: boolean; // Force new request even if one is pending
  } = {}
): Promise<T> {
  const { maxAge = CACHE_DURATION, force = false } = options;

  // Check if we should reuse existing request
  if (!force && pendingRequests.has(key)) {
    const lastRequest = requestTimestamps.get(key);

    if (lastRequest && Date.now() - lastRequest < maxAge) {
      console.log(`[Dedup] Reusing pending request: ${key}`);
      return pendingRequests.get(key)!;
    }
  }

  // Start new request
  console.log(`[Dedup] Starting new request: ${key}`);
  requestTimestamps.set(key, Date.now());

  const promise = fetcher()
    .finally(() => {
      // Clean up after request completes
      setTimeout(() => {
        pendingRequests.delete(key);
        requestTimestamps.delete(key);
      }, 100);
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Clear all pending requests (useful for logout)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
  requestTimestamps.clear();
}

/**
 * Cancel specific request
 */
export function cancelRequest(key: string) {
  pendingRequests.delete(key);
  requestTimestamps.delete(key);
}

/**
 * Get stats about pending requests (for debugging)
 */
export function getRequestStats() {
  return {
    pendingCount: pendingRequests.size,
    oldestRequest: Math.min(...Array.from(requestTimestamps.values())),
    keys: Array.from(pendingRequests.keys()),
  };
}
