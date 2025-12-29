'use client';

import { useState, useEffect } from 'react';

type VoiceControlsProps = {
  autoVoice: boolean;
  onAutoVoiceChange: (enabled: boolean) => void;
};

export default function VoiceControls({ autoVoice, onAutoVoiceChange }: VoiceControlsProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Check if Dameris voice is available
    if (typeof window !== 'undefined' && (window as any).damerisVoice) {
      // Listen for speaking state changes
      const originalSpeak = (window as any).damerisVoice.speak;
      if (originalSpeak) {
        (window as any).damerisVoice.speak = function(...args: any[]) {
          setIsSpeaking(true);
          const result = originalSpeak.apply(this, args);
          if (result && typeof result.then === 'function') {
            result.finally(() => setIsSpeaking(false));
          } else {
            setTimeout(() => setIsSpeaking(false), 1000);
          }
          return result;
        };
      }
    }
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onAutoVoiceChange(!autoVoice)}
        className={`p-1.5 rounded-lg transition-colors ${
          autoVoice 
            ? 'text-indigo-300 hover:text-indigo-200 bg-indigo-500/20' 
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
        aria-label={autoVoice ? 'Disable auto-voice' : 'Enable auto-voice'}
        title={autoVoice ? 'Auto-voice enabled' : 'Auto-voice disabled'}
      >
        <i 
          data-lucide={autoVoice ? 'volume-2' : 'volume-x'} 
          className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        ></i>
      </button>
      {isSpeaking && (
        <div className="flex items-center gap-1">
          <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
          <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-4 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
    </div>
  );
}
