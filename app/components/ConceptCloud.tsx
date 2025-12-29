'use client';

import { useEffect, useState, useRef } from 'react';
import type { ConceptNode } from '@/lib/types/fugue';

interface ConceptCloudProps {
  data: ConceptNode[];
  onNodeClick?: (node: ConceptNode) => void;
  className?: string;
}

/**
 * ConceptCloud Component
 * Interactive 2D visualization of concept nodes with connections
 * (Simplified from 3D for easier implementation)
 */
export default function ConceptCloud({ data, onNodeClick, className = '' }: ConceptCloudProps) {
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<ConceptNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update dimensions on mount
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 800,
          height: rect.height || 600
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Normalize positions to fit canvas
  const normalizePosition = (pos: { x: number; y: number }) => {
    return {
      x: (pos.x + 1) * (dimensions.width / 2),
      y: (pos.y + 1) * (dimensions.height / 2)
    };
  };

  const handleNodeClick = (node: ConceptNode) => {
    setSelectedNode(node === selectedNode ? null : node);
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  // Get connected nodes
  const getConnectedNodes = (node: ConceptNode): ConceptNode[] => {
    return data.filter(n => node.connections.includes(n.id));
  };

  // Check if two nodes are connected
  const areConnected = (node1: ConceptNode, node2: ConceptNode): boolean => {
    return node1.connections.includes(node2.id) || node2.connections.includes(node1.id);
  };

  const getNodeOpacity = (node: ConceptNode): number => {
    if (!selectedNode && !hoveredNode) return 1;
    const activeNode = hoveredNode || selectedNode;
    if (!activeNode) return 1;
    if (node.id === activeNode.id) return 1;
    if (areConnected(node, activeNode)) return 0.8;
    return 0.2;
  };

  const getConnectionOpacity = (node1: ConceptNode, node2: ConceptNode): number => {
    if (!selectedNode && !hoveredNode) return 0.15;
    const activeNode = hoveredNode || selectedNode;
    if (!activeNode) return 0.15;
    if (node1.id === activeNode.id || node2.id === activeNode.id) {
      if (areConnected(node1, node2)) return 0.6;
    }
    return 0.05;
  };

  return (
    <div className={`concept-cloud-container relative ${className}`}>
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: '600px' }}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {/* Background */}
        <rect width={dimensions.width} height={dimensions.height} fill="transparent" />

        {/* Connections */}
        <g className="connections">
          {data.map((node1) =>
            data.map((node2) => {
              if (node1.id >= node2.id) return null;
              if (!areConnected(node1, node2)) return null;

              const pos1 = normalizePosition(node1.position);
              const pos2 = normalizePosition(node2.position);
              const opacity = getConnectionOpacity(node1, node2);

              return (
                <line
                  key={`${node1.id}-${node2.id}`}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={`${node1.color}`}
                  strokeWidth="2"
                  strokeOpacity={opacity}
                  className="transition-all duration-300"
                />
              );
            })
          )}
        </g>

        {/* Nodes */}
        <g className="nodes">
          {data.map((node) => {
            const pos = normalizePosition(node.position);
            const opacity = getNodeOpacity(node);
            const isActive = selectedNode?.id === node.id || hoveredNode?.id === node.id;
            const radius = Math.max(20, Math.min(50, 20 + node.size * 30));

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-all duration-300"
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={opacity}
              >
                {/* Glow effect for active node */}
                {isActive && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 10}
                    fill={node.color}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={node.color}
                  fillOpacity="0.3"
                  stroke={node.color}
                  strokeWidth={isActive ? "3" : "2"}
                  className="transition-all duration-300"
                />

                {/* Node label */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-zinc-100 pointer-events-none select-none"
                  style={{ fontSize: `${Math.max(10, radius / 3)}px` }}
                >
                  {node.concept.length > 15 ? node.concept.slice(0, 15) + '...' : node.concept}
                </text>

                {/* Frequency badge */}
                <text
                  x={pos.x + radius - 8}
                  y={pos.y - radius + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-bold fill-white pointer-events-none"
                >
                  {node.frequency}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-zinc-900/95 backdrop-blur-sm border border-white/10 shadow-2xl animate-fadeInUp max-w-md">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-lg font-medium text-zinc-100" style={{ color: selectedNode.color }}>
                {selectedNode.concept}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Appears {selectedNode.frequency} times
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Close details"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>

          {/* Connected concepts */}
          {selectedNode.connections.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-zinc-400 mb-2">Connected to:</div>
              <div className="flex flex-wrap gap-1">
                {getConnectedNodes(selectedNode).slice(0, 6).map((connectedNode) => (
                  <button
                    key={connectedNode.id}
                    onClick={() => handleNodeClick(connectedNode)}
                    className="px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                    style={{ borderColor: connectedNode.color + '40' }}
                  >
                    {connectedNode.concept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fragment previews */}
          {selectedNode.fragments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-zinc-400 mb-2">From memories:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scroll">
                {selectedNode.fragments.slice(0, 3).map((fragment, i) => (
                  <div
                    key={i}
                    className="text-xs text-zinc-300 p-2 rounded bg-black/20 border border-white/5"
                  >
                    {fragment.length > 100 ? fragment.slice(0, 100) + '...' : fragment}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 p-3 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/10 text-xs">
        <div className="text-zinc-400 font-medium mb-2">Concept Cloud</div>
        <div className="space-y-1 text-zinc-500">
          <div>• Size = frequency</div>
          <div>• Lines = connections</div>
          <div>• Click to explore</div>
        </div>
      </div>
    </div>
  );
}
