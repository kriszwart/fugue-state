'use client';

import { useEffect, useState } from 'react';

interface MemoryMorphLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function MemoryMorphLoader({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}: MemoryMorphLoaderProps) {
  const [stage, setStage] = useState(0);

  const sizeMap = {
    sm: 64,
    md: 96,
    lg: 128,
    xl: 192,
  };

  const iconSize = sizeMap[size];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const stages = [
    { name: 'seed', label: 'Planting memories...' },
    { name: 'brain', label: 'Processing thoughts...' },
    { name: 'chip', label: 'Encoding data...' },
    { name: 'datacentre', label: 'Synchronizing...' },
  ];

  const content = (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite" aria-label={message || stages[stage]?.label || 'Processing'}>
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 200 200"
          className="drop-shadow-2xl"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="morphGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" className="animate-pulse">
                <animate attributeName="stop-color" values="#8b5cf6;#6366f1;#3b82f6;#8b5cf6" dur="4s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#3b82f6">
                <animate attributeName="stop-color" values="#3b82f6;#8b5cf6;#6366f1;#3b82f6" dur="4s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="neon">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feComposite in="blur" in2="SourceGraphic" operator="over"/>
            </filter>
          </defs>

          {/* Seed Stage */}
          <g className={`transition-all duration-1000 ${stage === 0 ? 'opacity-100' : 'opacity-0'}`}>
            <ellipse cx="100" cy="140" rx="15" ry="35" fill="url(#morphGradient)" filter="url(#glow)">
              <animate attributeName="ry" values="35;38;35" dur="2s" repeatCount="indefinite" />
            </ellipse>
            <path d="M 100 105 Q 85 85 75 60 Q 73 50 78 45 Q 85 42 88 50 Q 90 60 95 75 Q 98 85 100 95"
                  fill="url(#morphGradient)" opacity="0.8" filter="url(#glow)">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="15 100 100" dur="3s" repeatCount="indefinite" />
            </path>
            <circle cx="78" cy="45" r="3" fill="#60a5fa">
              <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Brain Stage */}
          <g className={`transition-all duration-1000 ${stage === 1 ? 'opacity-100' : 'opacity-0'}`}>
            <ellipse cx="100" cy="100" rx="50" ry="60" fill="url(#morphGradient)" filter="url(#glow)" opacity="0.9"/>

            {/* Brain folds - left hemisphere */}
            <path d="M 70 80 Q 65 85 70 90 Q 75 95 70 100 Q 65 105 70 110"
                  stroke="#60a5fa" strokeWidth="3" fill="none" filter="url(#neon)">
              <animate attributeName="d"
                       values="M 70 80 Q 65 85 70 90 Q 75 95 70 100 Q 65 105 70 110;
                               M 70 80 Q 67 85 70 90 Q 73 95 70 100 Q 67 105 70 110;
                               M 70 80 Q 65 85 70 90 Q 75 95 70 100 Q 65 105 70 110"
                       dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 80 75 Q 75 80 80 85 Q 85 90 80 95"
                  stroke="#60a5fa" strokeWidth="3" fill="none" filter="url(#neon)"/>

            {/* Brain folds - right hemisphere */}
            <path d="M 130 80 Q 135 85 130 90 Q 125 95 130 100 Q 135 105 130 110"
                  stroke="#60a5fa" strokeWidth="3" fill="none" filter="url(#neon)">
              <animate attributeName="d"
                       values="M 130 80 Q 135 85 130 90 Q 125 95 130 100 Q 135 105 130 110;
                               M 130 80 Q 133 85 130 90 Q 127 95 130 100 Q 133 105 130 110;
                               M 130 80 Q 135 85 130 90 Q 125 95 130 100 Q 135 105 130 110"
                       dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 120 75 Q 125 80 120 85 Q 115 90 120 95"
                  stroke="#60a5fa" strokeWidth="3" fill="none" filter="url(#neon)"/>

            {/* Synapses */}
            {[...Array(6)].map((_, i) => (
              <circle key={i} cx={70 + i * 12} cy={95 + (i % 2) * 10} r="2" fill="#60a5fa">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>

          {/* Memory Chip Stage */}
          <g className={`transition-all duration-1000 ${stage === 2 ? 'opacity-100' : 'opacity-0'}`}>
            <rect x="60" y="70" width="80" height="60" rx="4" fill="url(#morphGradient)" filter="url(#glow)"/>

            {/* Chip pins - left */}
            {[...Array(5)].map((_, i) => (
              <rect key={`left-${i}`} x="45" y={75 + i * 12} width="15" height="4" fill="#60a5fa">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
              </rect>
            ))}

            {/* Chip pins - right */}
            {[...Array(5)].map((_, i) => (
              <rect key={`right-${i}`} x="140" y={75 + i * 12} width="15" height="4" fill="#60a5fa">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
              </rect>
            ))}

            {/* Circuit traces */}
            <path d="M 70 85 L 85 85 L 85 95 L 100 95" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.7">
              <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 100 105 L 115 105 L 115 95 L 130 95" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.7">
              <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="2s" begin="0.3s" repeatCount="indefinite" />
            </path>

            {/* Memory cells */}
            <g opacity="0.8">
              <rect x="75" y="85" width="10" height="10" fill="#3b82f6"/>
              <rect x="90" y="85" width="10" height="10" fill="#6366f1"/>
              <rect x="105" y="85" width="10" height="10" fill="#8b5cf6"/>
              <rect x="120" y="85" width="10" height="10" fill="#3b82f6"/>
              <rect x="75" y="105" width="10" height="10" fill="#6366f1"/>
              <rect x="90" y="105" width="10" height="10" fill="#8b5cf6"/>
              <rect x="105" y="105" width="10" height="10" fill="#3b82f6"/>
              <rect x="120" y="105" width="10" height="10" fill="#6366f1"/>
            </g>
          </g>

          {/* Data Centre Stage */}
          <g className={`transition-all duration-1000 ${stage === 3 ? 'opacity-100' : 'opacity-0'}`}>
            {/* Server racks */}
            {[0, 1, 2].map((rack) => (
              <g key={rack} transform={`translate(${55 + rack * 30}, 60)`}>
                <rect width="25" height="80" rx="2" fill="url(#morphGradient)" filter="url(#glow)" opacity="0.9"/>

                {/* Server slots */}
                {[...Array(8)].map((_, i) => (
                  <g key={i}>
                    <rect x="3" y={5 + i * 9} width="19" height="6" fill="#1e293b" opacity="0.8"/>
                    <circle cx="6" cy={8 + i * 9} r="1" fill="#60a5fa">
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin={`${(rack * 0.2 + i * 0.1)}s`} repeatCount="indefinite" />
                    </circle>
                    <circle cx="10" cy={8 + i * 9} r="1" fill="#3b82f6">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" begin={`${(rack * 0.2 + i * 0.1)}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </g>
            ))}

            {/* Network connections */}
            <path d="M 67 100 Q 100 90 133 100" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0.6">
              <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="2s" repeatCount="indefinite" />
            </path>
            <path d="M 67 110 Q 100 120 133 110" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.6">
              <animate attributeName="stroke-dasharray" values="0 100;100 0" dur="2.5s" repeatCount="indefinite" />
            </path>
          </g>

          {/* Pulsing outer ring */}
          <circle cx="100" cy="100" r="90" stroke="url(#morphGradient)" strokeWidth="2" fill="none" opacity="0.3">
            <animate attributeName="r" values="85;95;85" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Rotating particles */}
          {[...Array(8)].map((_, i) => (
            <circle key={i} r="2" fill="#60a5fa">
              <animateMotion dur="6s" repeatCount="indefinite" path="M 100 10 A 90 90 0 1 1 100 10 Z" begin={`${i * 0.75}s`}/>
              <animate attributeName="opacity" values="0;1;0" dur="6s" begin={`${i * 0.75}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      </div>

      {message && (
        <p className="mt-6 text-zinc-400 text-sm font-medium" aria-label={message}>
          {message}
        </p>
      )}

      {!message && (
        <p className="mt-6 text-zinc-400 text-sm font-medium animate-pulse">
          {stages[stage]?.label || 'Processing...'}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        {content}
      </div>
    );
  }

  return content;
}
