'use client';

import { useState, useEffect, useRef } from 'react';

type FirstScanResult = {
  muse: 'synthesis'
  briefing: string
  reflect: { truths: string[]; tensions: string[]; questions: string[]; missingIdeas: string[] }
  recompose: { emailDraft: string; tweetThread: string; outline: string }
  visualise: { imagePrompts: string[]; palette: string[]; storyboardBeats: string[] }
  curate: { tags: string[]; quotes: string[]; collections: Array<{ name: string; description: string; items: string[] }> }
  nextActions: string[]
}

type CreationPromptProps = {
  firstScan: FirstScanResult;
  onAction: (action: string, data?: any) => void;
}

type ActionStyle = {
  gradient: string;
  borderColor: string;
  hoverBorder: string;
  textColor: string;
  iconBg: string;
  iconBorder: string;
  iconHoverBg: string;
  iconHoverBorder: string;
  shadowColor: string;
  hoverTextColor: string;
}

const actionStyles: Record<string, ActionStyle> = {
  visualise: {
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    hoverBorder: 'hover:border-amber-500/50',
    textColor: 'text-amber-200',
    iconBg: 'bg-amber-500/20',
    iconBorder: 'border-amber-500/30',
    iconHoverBg: 'group-hover:bg-amber-500/30',
    iconHoverBorder: 'group-hover:border-amber-500/50',
    shadowColor: 'shadow-amber-500/30',
    hoverTextColor: 'group-hover:text-amber-100'
  },
  reflect: {
    gradient: 'from-indigo-500/20 to-purple-500/20',
    borderColor: 'border-indigo-500/30',
    hoverBorder: 'hover:border-indigo-500/50',
    textColor: 'text-indigo-200',
    iconBg: 'bg-indigo-500/20',
    iconBorder: 'border-indigo-500/30',
    iconHoverBg: 'group-hover:bg-indigo-500/30',
    iconHoverBorder: 'group-hover:border-indigo-500/50',
    shadowColor: 'shadow-indigo-500/30',
    hoverTextColor: 'group-hover:text-indigo-100'
  },
  recompose: {
    gradient: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'border-violet-500/30',
    hoverBorder: 'hover:border-violet-500/50',
    textColor: 'text-violet-200',
    iconBg: 'bg-violet-500/20',
    iconBorder: 'border-violet-500/30',
    iconHoverBg: 'group-hover:bg-violet-500/30',
    iconHoverBorder: 'group-hover:border-violet-500/50',
    shadowColor: 'shadow-violet-500/30',
    hoverTextColor: 'group-hover:text-violet-100'
  },
  curate: {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'border-emerald-500/30',
    hoverBorder: 'hover:border-emerald-500/50',
    textColor: 'text-emerald-200',
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconHoverBg: 'group-hover:bg-emerald-500/30',
    iconHoverBorder: 'group-hover:border-emerald-500/50',
    shadowColor: 'shadow-emerald-500/30',
    hoverTextColor: 'group-hover:text-emerald-100'
  },
  collage: {
    gradient: 'from-pink-500/20 to-rose-500/20',
    borderColor: 'border-pink-500/30',
    hoverBorder: 'hover:border-pink-500/50',
    textColor: 'text-pink-200',
    iconBg: 'bg-pink-500/20',
    iconBorder: 'border-pink-500/30',
    iconHoverBg: 'group-hover:bg-pink-500/30',
    iconHoverBorder: 'group-hover:border-pink-500/50',
    shadowColor: 'shadow-pink-500/30',
    hoverTextColor: 'group-hover:text-pink-100'
  },
  dream: {
    gradient: 'from-purple-500/20 to-fuchsia-500/20',
    borderColor: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/50',
    textColor: 'text-purple-200',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconHoverBg: 'group-hover:bg-purple-500/30',
    iconHoverBorder: 'group-hover:border-purple-500/50',
    shadowColor: 'shadow-purple-500/30',
    hoverTextColor: 'group-hover:text-purple-100'
  },
  remix: {
    gradient: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    hoverBorder: 'hover:border-cyan-500/50',
    textColor: 'text-cyan-200',
    iconBg: 'bg-cyan-500/20',
    iconBorder: 'border-cyan-500/30',
    iconHoverBg: 'group-hover:bg-cyan-500/30',
    iconHoverBorder: 'group-hover:border-cyan-500/50',
    shadowColor: 'shadow-cyan-500/30',
    hoverTextColor: 'group-hover:text-cyan-100'
  },
  echo: {
    gradient: 'from-teal-500/20 to-emerald-500/20',
    borderColor: 'border-teal-500/30',
    hoverBorder: 'hover:border-teal-500/50',
    textColor: 'text-teal-200',
    iconBg: 'bg-teal-500/20',
    iconBorder: 'border-teal-500/30',
    iconHoverBg: 'group-hover:bg-teal-500/30',
    iconHoverBorder: 'group-hover:border-teal-500/50',
    shadowColor: 'shadow-teal-500/30',
    hoverTextColor: 'group-hover:text-teal-100'
  },
  surprise: {
    gradient: 'from-violet-500/20 via-fuchsia-500/20 to-pink-500/20',
    borderColor: 'border-violet-500/30',
    hoverBorder: 'hover:border-fuchsia-500/50',
    textColor: 'text-violet-200',
    iconBg: 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20',
    iconBorder: 'border-violet-500/30',
    iconHoverBg: 'group-hover:from-violet-500/30 group-hover:to-fuchsia-500/30',
    iconHoverBorder: 'group-hover:border-fuchsia-500/50',
    shadowColor: 'shadow-violet-500/30',
    hoverTextColor: 'group-hover:text-violet-100'
  },
  explore: {
    gradient: 'from-zinc-500/20 to-zinc-600/20',
    borderColor: 'border-zinc-500/30',
    hoverBorder: 'hover:border-zinc-500/50',
    textColor: 'text-zinc-200',
    iconBg: 'bg-zinc-500/20',
    iconBorder: 'border-zinc-500/30',
    iconHoverBg: 'group-hover:bg-zinc-500/30',
    iconHoverBorder: 'group-hover:border-zinc-500/50',
    shadowColor: 'shadow-zinc-500/30',
    hoverTextColor: 'group-hover:text-zinc-100'
  }
};

export default function CreationPrompt({ firstScan, onAction }: CreationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);
    
    // Focus first button after animation
    setTimeout(() => {
      if (buttonRefs.current[0]) {
        buttonRefs.current[0].focus();
        setFocusedIndex(0);
      }
    }, 500);
    
    // Ensure Lucide icons are loaded
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
    
    // Re-create icons after a delay to ensure they render
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.lucide) {
        window.lucide.createIcons();
      }
    }, 200);
    
    // Keyboard navigation handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusedIndex === null) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = focusedIndex < actions.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(nextIndex);
        buttonRefs.current[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : actions.length - 1;
        setFocusedIndex(prevIndex);
        buttonRefs.current[prevIndex]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex !== null && buttonRefs.current[focusedIndex]) {
          buttonRefs.current[focusedIndex]?.click();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex]);

  const actions = [
    {
      id: 'visualise',
      label: 'Visualise',
      icon: 'image',
      description: 'Create images from your memories',
      data: firstScan.visualise
    },
    {
      id: 'reflect',
      label: 'Reflect',
      icon: 'brain',
      description: 'Deep insights and patterns',
      data: firstScan.reflect
    },
    {
      id: 'recompose',
      label: 'Recompose',
      icon: 'feather',
      description: 'Create poems, text, entries',
      data: firstScan.recompose
    },
    {
      id: 'curate',
      label: 'Curate',
      icon: 'layers',
      description: 'Build collections',
      data: firstScan.curate
    },
    {
      id: 'collage',
      label: 'Collage',
      icon: 'layout',
      description: 'Layer memory fragments into visual collages',
      data: { style: 'hybrid', fragmentCount: 5 }
    },
    {
      id: 'dream',
      label: 'Dream',
      icon: 'moon',
      description: 'Generate surreal narratives from memories',
      data: { intensity: 'medium' }
    },
    {
      id: 'remix',
      label: 'Remix',
      icon: 'shuffle',
      description: 'Blend fragments into new creations',
      data: { technique: 'blend', format: 'narrative' }
    },
    {
      id: 'echo',
      label: 'Echo',
      icon: 'repeat',
      description: 'Find recurring patterns and themes',
      data: { lookback: 'all', sensitivity: 0.7 }
    },
    {
      id: 'surprise',
      label: '✨ Surprise Me',
      icon: 'sparkles',
      description: 'Let the Fugue Engine surprise you',
      data: { config: { fragmentCount: 5, mode: 'random', creativity: 0.8 } }
    }
  ];

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);
    
    // Focus first button after animation
    setTimeout(() => {
      if (buttonRefs.current[0]) {
        buttonRefs.current[0].focus();
        setFocusedIndex(0);
      }
    }, 500);
    
    // Ensure Lucide icons are loaded
    if (typeof window !== 'undefined' && window.lucide) {
      window.lucide.createIcons();
    }
    
    // Re-create icons after a delay to ensure they render
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.lucide) {
        window.lucide.createIcons();
      }
    }, 200);
    
    // Keyboard navigation handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusedIndex === null) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = focusedIndex < actions.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(nextIndex);
        buttonRefs.current[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : actions.length - 1;
        setFocusedIndex(prevIndex);
        buttonRefs.current[prevIndex]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedIndex !== null && buttonRefs.current[focusedIndex]) {
          buttonRefs.current[focusedIndex]?.click();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex, actions.length]);

  return (
    <div 
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Contextual Message */}
      <div className="flex gap-3 mb-6" role="article">
        <div className="flex-1 space-y-1">
          <div className="text-[10px] text-zinc-500 ml-1" aria-label="Message timestamp">
            Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="relative p-4 rounded-2xl rounded-tl-none bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-amber-500/10 border border-indigo-500/20 text-xs text-zinc-200 leading-relaxed backdrop-blur-sm shadow-lg shadow-indigo-500/10">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-amber-500/5 opacity-50 pointer-events-none"></div>
            <p className="relative whitespace-pre-wrap">{firstScan.briefing}</p>
          </div>
        </div>
      </div>

      {/* Interactive Action Buttons */}
      <div className="mt-4 space-y-2">
        <div className="text-[10px] text-zinc-500 ml-1 mb-4 uppercase tracking-wider font-medium">
          What would you like to create?
        </div>
        <div className="text-[9px] text-zinc-600 ml-1 mb-2">
          Use arrow keys to navigate, Enter to select
        </div>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => {
            const style = actionStyles[action.id];
            return (
              <button
                key={action.id}
                ref={(el) => { buttonRefs.current[index] = el; }}
                onClick={() => onAction(action.id, action.data)}
                onFocus={() => setFocusedIndex(index)}
                className={`
                  group relative p-4 rounded-xl border-2 transition-all duration-300 ease-out
                  bg-gradient-to-br ${style.gradient}
                  ${style.borderColor} ${style.hoverBorder}
                  hover:shadow-xl ${style.shadowColor}
                  hover:scale-[1.02] active:scale-[0.98]
                  hover:-translate-y-0.5
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900
                  ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                  ${focusedIndex === index ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-900' : ''}
                `}
                style={{
                  transitionDelay: `${index * 75}ms`,
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 75}ms`
                }}
                aria-label={`${action.label}: ${action.description}`}
                aria-describedby={`action-desc-${action.id}`}
                onMouseEnter={() => {
                  setFocusedIndex(index);
                  // Re-create icons on hover to ensure they're visible
                  if (typeof window !== 'undefined' && window.lucide) {
                    window.lucide.createIcons();
                  }
                }}
              >
                <div className="flex items-center gap-4 relative z-10">
                  {/* Icon with enhanced styling */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    ${style.iconBg} border-2 ${style.iconBorder}
                    ${style.iconHoverBg} ${style.iconHoverBorder}
                    group-hover:scale-110 group-hover:rotate-3
                    transition-all duration-300 shadow-lg
                  `}>
                    <i 
                      data-lucide={action.icon} 
                      className={`w-5 h-5 ${style.textColor} group-hover:scale-110 transition-transform duration-300`}
                      aria-hidden="true"
                    ></i>
                  </div>
                  
                  {/* Label and Description */}
                  <div className="flex-1 text-left min-w-0">
                    <div className={`text-sm font-semibold ${style.textColor} ${style.hoverTextColor} transition-colors duration-300 mb-0.5`}>
                      {action.label}
                    </div>
                    <div 
                      id={`action-desc-${action.id}`}
                      className="text-[10px] text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300 leading-relaxed"
                    >
                      {action.description}
                    </div>
                    {focusedIndex === index && (
                      <div className="text-[9px] text-zinc-500 mt-1">
                        Press Enter or Space to select
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator with animation */}
                  <div className={`
                    opacity-0 group-hover:opacity-100 transition-all duration-300
                    ${style.textColor} transform translate-x-0 group-hover:translate-x-1
                  `}>
                    <i data-lucide="arrow-right" className="w-5 h-5" aria-hidden="true"></i>
                  </div>
                </div>

                {/* Enhanced hover glow effect */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-opacity duration-300 pointer-events-none blur-sm"></div>
                
                {/* Shimmer effect on hover */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-opacity duration-500 pointer-events-none"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite'
                  }}
                ></div>
              </button>
            );
          })}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
