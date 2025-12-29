'use client';

import { useEffect, useState } from 'react';
import MemoryMorphLoader from './MemoryMorphLoader';

interface SmartLoaderProps {
  userId?: string;
  warmData?: 'user' | 'muse' | 'all';
  museType?: string;
  onCacheWarmed?: () => void;
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  minimumDuration?: number; // Minimum time to show loader (for smooth UX)
}

/**
 * SmartLoader
 * Shows beautiful loading animation while pre-fetching and caching data in background
 * This makes subsequent page loads instant!
 */
export default function SmartLoader({
  userId,
  warmData,
  museType,
  onCacheWarmed,
  message = 'Loading...',
  size = 'lg',
  fullScreen = true,
  minimumDuration = 1500,
}: SmartLoaderProps) {
  const [cacheWarming, setCacheWarming] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!userId || !warmData) return;

    const warmCache = async () => {
      setCacheWarming(true);
      const startTime = Date.now();

      try {
        // Simulate progress for smooth UX
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 10, 90));
        }, 150);

        if (warmData === 'user' || warmData === 'all') {
          // Warm user data (profile, init status, data sources, memories, conversations)
          await fetch('/api/cache/warm/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
        }

        if ((warmData === 'muse' || warmData === 'all') && museType) {
          // Warm muse data (first scan, artefacts)
          await fetch('/api/cache/warm/muse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, museType }),
          });
        }

        clearInterval(progressInterval);
        setProgress(100);

        // Ensure minimum duration for smooth UX
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minimumDuration - elapsed);

        setTimeout(() => {
          setCacheWarming(false);
          onCacheWarmed?.();
        }, remaining);
      } catch (error) {
        console.error('[SmartLoader] Cache warming failed:', error);
        setCacheWarming(false);
        onCacheWarmed?.(); // Continue anyway
      }
    };

    warmCache();
  }, [userId, warmData, museType, minimumDuration, onCacheWarmed]);

  return (
    <div className="relative">
      <MemoryMorphLoader
        fullScreen={fullScreen}
        size={size}
        message={message}
      />

      {/* Progress indicator (subtle) */}
      {cacheWarming && progress > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">Preparing your data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
