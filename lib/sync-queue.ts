/**
 * Background Sync Queue
 * Queues actions when offline, syncs when back online
 * Provides offline-first functionality
 */

interface QueuedAction {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

class SyncQueue {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private listeners: Set<(queue: QueuedAction[]) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupOnlineListener();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[SyncQueue] Error loading queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('[SyncQueue] Error saving queue:', error);
    }
  }

  /**
   * Setup online/offline listeners
   */
  private setupOnlineListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SyncQueue] Back online, processing queue');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncQueue] Gone offline');
    });

    // Process queue immediately if online
    if (navigator.onLine && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Add action to queue
   */
  async queueAction(action: string, data: any, options: { maxRetries?: number } = {}) {
    const queuedAction: QueuedAction = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries || MAX_RETRIES,
    };

    this.queue.push(queuedAction);
    this.saveQueue();

    console.log(`[SyncQueue] Queued: ${action}`, queuedAction.id);

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return queuedAction.id;
  }

  /**
   * Process entire queue
   */
  async processQueue() {
    if (this.isProcessing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[SyncQueue] Processing ${this.queue.length} items`);

    const failedItems: QueuedAction[] = [];

    for (const item of this.queue) {
      try {
        await this.processItem(item);
        console.log(`[SyncQueue] Completed: ${item.action}`, item.id);
      } catch (error) {
        console.error(`[SyncQueue] Failed: ${item.action}`, error);

        item.retries++;

        if (item.retries < item.maxRetries) {
          failedItems.push(item);
        } else {
          console.error(`[SyncQueue] Max retries reached for: ${item.action}`, item.id);
        }
      }
    }

    // Update queue with only failed items
    this.queue = failedItems;
    this.saveQueue();
    this.isProcessing = false;

    console.log(`[SyncQueue] Processing complete. ${this.queue.length} items remaining`);
  }

  /**
   * Process single item
   */
  private async processItem(item: QueuedAction): Promise<void> {
    const response = await fetch(`/api/${item.action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear entire queue
   */
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('[SyncQueue] Queue cleared');
  }

  /**
   * Remove specific item from queue
   */
  removeItem(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedAction[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.queue));
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();

/**
 * React hook for sync queue
 */
export function useSyncQueue() {
  const [queue, setQueue] = React.useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = syncQueue.subscribe(setQueue);

    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get initial queue
    setQueue(syncQueue.getQueue());

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    queue,
    queueSize: queue.length,
    isOnline,
    queueAction: syncQueue.queueAction.bind(syncQueue),
    processQueue: syncQueue.processQueue.bind(syncQueue),
    clearQueue: syncQueue.clearQueue.bind(syncQueue),
  };
}

/**
 * Example usage:
 *
 * // Queue an action
 * await syncQueue.queueAction('memories/create', {
 *   content: 'My new memory',
 *   user_id: userId,
 * });
 *
 * // In component:
 * const { queue, queueSize, isOnline } = useSyncQueue();
 *
 * {!isOnline && queueSize > 0 && (
 *   <div>Offline: {queueSize} actions queued</div>
 * )}
 */

import React from 'react';
