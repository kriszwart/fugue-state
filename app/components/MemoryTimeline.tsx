'use client';

import { useEffect, useRef, useState } from 'react';
import type { MemoryTimelineNode } from '@/lib/types/fugue';

interface MemoryTimelineProps {
  data: MemoryTimelineNode[];
  onNodeClick?: (node: MemoryTimelineNode) => void;
  className?: string;
}

/**
 * MemoryTimeline Component
 * Interactive timeline visualization showing memory fragments over time
 */
export default function MemoryTimeline({ data, onNodeClick, className = '' }: MemoryTimelineProps) {
  const [selectedNode, setSelectedNode] = useState<MemoryTimelineNode | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to center on mount
  useEffect(() => {
    if (timelineRef.current) {
      const scrollWidth = timelineRef.current.scrollWidth;
      const clientWidth = timelineRef.current.clientWidth;
      timelineRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
    }
  }, []);

  const handleNodeClick = (node: MemoryTimelineNode) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDensityColor = (density: number) => {
    if (density < 0.3) return 'bg-zinc-700 border-zinc-600';
    if (density < 0.6) return 'bg-indigo-700 border-indigo-500';
    return 'bg-violet-600 border-violet-400';
  };

  return (
    <div className={`memory-timeline-container ${className}`}>
      {/* Timeline */}
      <div
        ref={timelineRef}
        className="overflow-x-auto pb-6 custom-scroll"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="inline-flex gap-4 px-6 min-w-full">
          {data.map((node, index) => {
            const isSelected = selectedNode?.date === node.date;
            const densityColor = getDensityColor(node.density);

            return (
              <div
                key={index}
                className="flex flex-col items-center min-w-[120px] cursor-pointer group"
                onClick={() => handleNodeClick(node)}
              >
                {/* Connector line */}
                {index > 0 && (
                  <div className="absolute h-0.5 bg-white/10 -ml-14 mt-16 w-24 group-hover:bg-white/20 transition-colors" />
                )}

                {/* Node */}
                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${densityColor} ${
                      isSelected ? 'scale-125 shadow-lg shadow-violet-500/50' : 'hover:scale-110'
                    }`}
                  >
                    <div className="text-xs font-mono text-white">
                      {node.fragments.length}
                    </div>
                  </div>

                  {/* Pulse animation for high density */}
                  {node.density > 0.6 && (
                    <div className="absolute inset-0 rounded-full border-2 border-violet-400 animate-ping opacity-75" />
                  )}
                </div>

                {/* Date label */}
                <div className="mt-2 text-xs text-zinc-400 text-center whitespace-nowrap">
                  {formatDate(node.date)}
                </div>

                {/* Theme label */}
                <div className="mt-1 text-[10px] text-zinc-500 text-center font-medium truncate max-w-[120px]">
                  {node.dominantTheme}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10 animate-fadeIn">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-sm font-medium text-zinc-200">
                {formatDate(selectedNode.date)}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {selectedNode.fragments.length} fragments • {selectedNode.dominantTheme}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close details"
            >
              <i data-lucide="x" className="w-4 h-4"></i>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll">
            {selectedNode.fragments.slice(0, 5).map((frag, i) => (
              <div
                key={i}
                className="p-2 rounded bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                    frag.type === 'memory' ? 'bg-indigo-500/20 text-indigo-300' :
                    frag.type === 'idea' ? 'bg-amber-500/20 text-amber-300' :
                    frag.type === 'reflection' ? 'bg-purple-500/20 text-purple-300' :
                    'bg-zinc-500/20 text-zinc-300'
                  }`}>
                    {frag.type}
                  </span>
                  {frag.emotional && (
                    <span className="text-[9px] text-zinc-500">
                      {frag.emotional}
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-300 leading-relaxed">
                  {frag.preview}
                </div>
              </div>
            ))}
          </div>

          {selectedNode.fragments.length > 5 && (
            <div className="mt-2 text-center text-xs text-zinc-500">
              +{selectedNode.fragments.length - 5} more fragments
            </div>
          )}
        </div>
      )}
    </div>
  );
}
