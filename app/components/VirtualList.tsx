/**
 * VirtualList Component
 * Renders only visible items for massive performance gains with long lists
 * Handles 10,000+ items smoothly
 */

'use client';

import { useRef, useState, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number; // Container height in pixels
  itemHeight: number; // Height of each item in pixels
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number; // Number of items to render outside viewport
  className?: string;
  onEndReached?: () => void; // Callback when scrolled near bottom
  endReachedThreshold?: number; // Pixels from bottom to trigger onEndReached
}

export default function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  onEndReached,
  endReachedThreshold = 300,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + height) / itemHeight);

  // Add overscan
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  const visibleItems = items.slice(startIndex, endIndex);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);

    // Check if near bottom
    if (onEndReached) {
      const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (scrollBottom < endReachedThreshold) {
        onEndReached();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: `${index * itemHeight}px`,
                height: `${itemHeight}px`,
                width: '100%',
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Variable height virtual list (for items with different heights)
 */
export function VirtualListVariable<T>({
  items,
  height,
  estimatedItemHeight = 100,
  renderItem,
  className = '',
}: {
  items: T[];
  height: number;
  estimatedItemHeight?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure items as they render
  const measureItem = (index: number, element: HTMLElement | null) => {
    if (!element) return;
    const newHeights = [...itemHeights];
    newHeights[index] = element.offsetHeight;
    setItemHeights(newHeights);
  };

  // Calculate positions
  const positions = items.map((_, i) => {
    let pos = 0;
    for (let j = 0; j < i; j++) {
      pos += itemHeights[j] || estimatedItemHeight;
    }
    return pos;
  });

  const totalHeight = (positions[positions.length - 1] || 0) + (itemHeights[items.length - 1] || estimatedItemHeight);

  // Find visible range
  let startIndex = 0;
  let endIndex = items.length;

  for (let i = 0; i < positions.length; i++) {
    if ((positions[i] || 0) < scrollTop) {
      startIndex = i;
    }
    if ((positions[i] || 0) > scrollTop + height) {
      endIndex = i;
      break;
    }
  }

  const visibleItems = items.slice(Math.max(0, startIndex - 3), Math.min(items.length, endIndex + 3));

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = Math.max(0, startIndex - 3) + i;
          return (
            <div
              key={index}
              ref={(el) => measureItem(index, el)}
              style={{
                position: 'absolute',
                top: `${positions[index]}px`,
                width: '100%',
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Example usage:
 *
 * <VirtualList
 *   items={memories}
 *   height={600}
 *   itemHeight={100}
 *   renderItem={(memory, index) => (
 *     <MemoryCard memory={memory} />
 *   )}
 *   onEndReached={() => loadMoreMemories()}
 * />
 */
