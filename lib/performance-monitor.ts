/**
 * Performance Monitoring
 * Tracks page load times, API calls, and user interactions
 * Essential for optimizing production performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Track page load performance
   */
  trackPageLoad(pageName: string): () => void {
    const startTime = performance.now();
    const startMark = `page_load_${pageName}_start`;

    performance.mark(startMark);

    return () => {
      const loadTime = performance.now() - startTime;
      const endMark = `page_load_${pageName}_end`;

      performance.mark(endMark);
      performance.measure(`page_load_${pageName}`, startMark, endMark);

      this.recordMetric({
        name: 'page_load',
        value: loadTime,
        timestamp: Date.now(),
        metadata: { page: pageName },
      });

      console.log(`[Perf] Page load: ${pageName} - ${loadTime.toFixed(2)}ms`);

      // Send to analytics
      this.sendToAnalytics('page_load', {
        page: pageName,
        loadTime,
      });
    };
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      this.recordMetric({
        name: 'api_call',
        value: duration,
        timestamp: Date.now(),
        metadata: { endpoint },
      });

      console.log(`[Perf] API call: ${endpoint} - ${duration.toFixed(2)}ms`);

      // Send to analytics
      this.sendToAnalytics('api_call', {
        endpoint,
        duration,
      });
    };
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name: 'interaction',
      value: Date.now(),
      timestamp: Date.now(),
      metadata: { action, ...metadata },
    };

    this.recordMetric(metric);

    console.log(`[Perf] Interaction: ${action}`, metadata);

    // Send to analytics
    this.sendToAnalytics('interaction', {
      action,
      ...metadata,
    });
  }

  /**
   * Custom timing measurement
   */
  startMeasure(name: string) {
    this.marks.set(name, performance.now());
    performance.mark(`${name}_start`);
  }

  endMeasure(name: string, metadata?: Record<string, any>) {
    const startTime = this.marks.get(name);

    if (!startTime) {
      console.warn(`[Perf] No start mark found for: ${name}`);
      return;
    }

    const duration = performance.now() - startTime;

    performance.mark(`${name}_end`);
    performance.measure(name, `${name}_start`, `${name}_end`);

    this.recordMetric({
      name: 'custom_measure',
      value: duration,
      timestamp: Date.now(),
      metadata: { measureName: name, ...metadata },
    });

    this.marks.delete(name);

    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals() {
    if (typeof window === 'undefined') return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!navigation) return null;

    // Use PerformanceObserver for LCP to avoid deprecated API
    let lcpValue = 0;
    try {
      // Try to get LCP from existing entries (if available)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcpValue = (lcpEntries[lcpEntries.length - 1] as any)?.startTime || 0;
      }
    } catch (e) {
      // If deprecated API fails, LCP will be 0
      // Modern browsers should use PerformanceObserver instead
      console.warn('[Perf] LCP measurement unavailable:', e);
    }

    return {
      // First Contentful Paint
      FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,

      // Largest Contentful Paint (may be 0 if using deprecated API)
      LCP: lcpValue,

      // Time to First Byte
      TTFB: navigation.responseStart - navigation.requestStart,

      // DOM Content Loaded
      DCL: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,

      // Load Complete
      Load: navigation.loadEventEnd - navigation.loadEventStart,
    };
  }

  /**
   * Record metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Send metrics to analytics
   */
  private async sendToAnalytics(eventName: string, data: Record<string, any>) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      // Silently fail - don't break app if analytics fails
      console.error('[Perf] Analytics error:', error);
    }
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      coreWebVitals: this.getCoreWebVitals(),
      timestamp: Date.now(),
    }, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.marks.clear();
    console.log('[Perf] Metrics cleared');
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance tracking
 */
export function usePerformanceTracker(pageName: string) {
  React.useEffect(() => {
    const endTracking = performanceMonitor.trackPageLoad(pageName);

    return () => {
      endTracking();
    };
  }, [pageName]);
}

/**
 * Example usage:
 *
 * // In page component:
 * usePerformanceTracker('studio');
 *
 * // Track API call:
 * const endTracking = performanceMonitor.trackAPICall('/api/memories');
 * const data = await fetch('/api/memories');
 * endTracking();
 *
 * // Custom measurement:
 * performanceMonitor.startMeasure('image_processing');
 * // ... process images ...
 * performanceMonitor.endMeasure('image_processing');
 *
 * // Track interaction:
 * performanceMonitor.trackInteraction('create_memory', {
 *   memoryType: 'text',
 *   source: 'manual',
 * });
 */

import React from 'react';
