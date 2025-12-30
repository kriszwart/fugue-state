/**
 * useOptimisticUpdate Hook
 * Updates UI immediately, syncs to server in background
 * Provides instant feedback to users
 */

import { useState, useCallback } from 'react';

interface OptimisticUpdateOptions<T> {
  initialData: T;
  cacheKey?: string;
  onError?: (error: Error, rollbackData: T) => void;
  onSuccess?: (data: T) => void;
}

export function useOptimisticUpdate<T>({
  initialData,
  cacheKey,
  onError,
  onSuccess,
}: OptimisticUpdateOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Update data optimistically (UI updates immediately)
   */
  const update = useCallback(
    async (
      newData: T | ((prev: T) => T),
      serverUpdate: (data: T) => Promise<void>
    ) => {
      const rollbackData = data;
      const updatedData = typeof newData === 'function' ? (newData as (prev: T) => T)(data) : newData;

      // Update UI immediately
      setData(updatedData);
      setIsUpdating(true);
      setError(null);

      try {
        // Sync to server in background
        await serverUpdate(updatedData);

        // Update cache if provided
        if (cacheKey) {
          await fetch('/api/cache/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: cacheKey, value: updatedData }),
          });
        }

        setIsUpdating(false);
        onSuccess?.(updatedData);
      } catch (err) {
        // Rollback on error
        const error = err instanceof Error ? err : new Error('Update failed');
        setData(rollbackData);
        setError(error);
        setIsUpdating(false);
        onError?.(error, rollbackData);
      }
    },
    [data, cacheKey, onError, onSuccess]
  );

  /**
   * Force set data without server sync
   */
  const setOptimisticData = useCallback((newData: T | ((prev: T) => T)) => {
    setData(typeof newData === 'function' ? (newData as (prev: T) => T)(data) : newData);
  }, [data]);

  /**
   * Reset to initial data
   */
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsUpdating(false);
  }, [initialData]);

  return {
    data,
    isUpdating,
    error,
    update,
    setData: setOptimisticData,
    reset,
  };
}

/**
 * Example usage:
 *
 * const { data: profile, update, isUpdating } = useOptimisticUpdate({
 *   initialData: userProfile,
 *   cacheKey: `user:${userId}:profile`,
 *   onError: (error) => showToast(error.message, 'error'),
 * });
 *
 * const handleUpdateName = async () => {
 *   await update(
 *     { ...profile, name: newName },
 *     async (updatedProfile) => {
 *       await fetch('/api/user/profile', {
 *         method: 'PUT',
 *         body: JSON.stringify(updatedProfile),
 *       });
 *     }
 *   );
 * };
 */
