/**
 * PrefetchLink Component
 * Prefetches data on hover/touch for instant page transitions
 * Makes navigation feel instant!
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useRef } from 'react';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  prefetchData?: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export default function PrefetchLink({
  href,
  children,
  prefetchData,
  className = '',
  disabled = false,
}: PrefetchLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  const handlePrefetch = async () => {
    // Only prefetch once
    if (prefetchedRef.current || disabled) return;
    prefetchedRef.current = true;

    try {
      // Prefetch Next.js route
      router.prefetch(href);

      // Prefetch custom data if provided
      if (prefetchData) {
        await prefetchData();
      }

      console.log(`[Prefetch] Loaded data for: ${href}`);
    } catch (error) {
      console.error('[Prefetch] Error:', error);
    }
  };

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {children}
    </Link>
  );
}

/**
 * Prefetch user data for studio page
 */
export function PrefetchStudioLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PrefetchLink
      href="/studio"
      className={className}
      prefetchData={async () => {
        // Warm cache for studio page
        await fetch('/api/cache/warm/user', { method: 'POST' });
      }}
    >
      {children}
    </PrefetchLink>
  );
}

/**
 * Prefetch initialization data
 */
export function PrefetchInitLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PrefetchLink
      href="/initialization"
      className={className}
      prefetchData={async () => {
        // Prefetch initialization status
        await fetch('/api/initialization/status');
        await fetch('/api/privacy/data-sources');
      }}
    >
      {children}
    </PrefetchLink>
  );
}

/**
 * Prefetch memory detail
 */
export function PrefetchMemoryLink({
  memoryId,
  children,
  className
}: {
  memoryId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PrefetchLink
      href={`/memory/${memoryId}`}
      className={className}
      prefetchData={async () => {
        // Prefetch memory detail
        await fetch(`/api/memories?id=${memoryId}`);
      }}
    >
      {children}
    </PrefetchLink>
  );
}

/**
 * Example usage:
 *
 * <PrefetchLink
 *   href="/studio"
 *   prefetchData={async () => {
 *     await fetch('/api/cache/warm/user', { method: 'POST' });
 *   }}
 * >
 *   Go to Studio
 * </PrefetchLink>
 *
 * Or use the pre-built components:
 * <PrefetchStudioLink>Go to Studio</PrefetchStudioLink>
 */
