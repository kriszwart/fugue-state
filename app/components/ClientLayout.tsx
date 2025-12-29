/**
 * ClientLayout
 * Client-side wrapper for error boundary and other client components
 */

'use client';

import { ReactNode } from 'react';
import ErrorBoundaryWithRetry from './ErrorBoundaryWithRetry';
import { performanceMonitor } from '@/lib/performance-monitor';
import { useEffect } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Track page performance on mount
    const endTracking = performanceMonitor.trackPageLoad(window.location.pathname);

    // Log Core Web Vitals when available
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const vitals = performanceMonitor.getCoreWebVitals();
        if (vitals) {
          console.log('[Performance] Core Web Vitals:', vitals);
        }
      }, 3000);
    }

    return () => {
      endTracking();
    };
  }, []);

  return (
    <ErrorBoundaryWithRetry maxRetries={3}>
      {children}
    </ErrorBoundaryWithRetry>
  );
}
