'use client';

import { useState, useEffect } from 'react';

type ContextualHelpProps = {
  helpId: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
};

const STORAGE_KEY = 'fuguestate_contextual_help_dismissed';

export default function ContextualHelp({ 
  helpId, 
  message, 
  position = 'bottom',
  delay = 1000 
}: ContextualHelpProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if this help was previously dismissed
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const dismissedIds = JSON.parse(dismissed);
        if (Array.isArray(dismissedIds) && dismissedIds.includes(helpId)) {
          setIsDismissed(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking dismissed help:', error);
    }

    // Show help after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [helpId, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    
    // Save dismissal to localStorage
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      const dismissedIds = dismissed ? JSON.parse(dismissed) : [];
      if (!dismissedIds.includes(helpId)) {
        dismissedIds.push(helpId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissedIds));
      }
    } catch (error) {
      console.error('Error saving dismissed help:', error);
    }
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} z-50 opacity-0 animate-fadeIn`}
      role="tooltip"
      aria-live="polite"
    >
      <div className="bg-zinc-900 border border-white/20 rounded-lg p-3 shadow-xl max-w-xs text-xs text-zinc-200 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg pointer-events-none"></div>
        <div className="relative">
          <p className="mb-2">{message}</p>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleDismiss}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
              aria-label="Don't show this again"
            >
              Don't show again
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              aria-label="Close help"
            >
              <i data-lucide="x" className="w-3 h-3" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        {/* Arrow */}
        <div className={`absolute w-2 h-2 bg-zinc-900 border-r border-b border-white/20 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-4' :
          position === 'bottom' ? 'top-[-4px] left-4' :
          position === 'left' ? 'right-[-4px] top-4' :
          'left-[-4px] top-4'
        }`}></div>
      </div>
    </div>
  );
}
