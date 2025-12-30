'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Brain, Feather, Eye, Mic2, Wand2 } from 'lucide-react'
import { getReturningUserGreeting, getContextualPrompt, type MuseType } from '@/lib/ai/muse-personalities'

interface DamerisGreetingProps {
  museType: MuseType;
  userName?: string;
  lastVisit?: Date;
  recentMemoriesCount?: number;
  hasNewImages?: boolean;
  onClose?: () => void;
  onStartConversation?: (prompt: string) => void;
}

const MUSE_ICONS = {
  analyst: Brain,
  poet: Feather,
  visualist: Eye,
  narrator: Mic2,
  synthesis: Wand2
}

const MUSE_COLORS = {
  analyst: 'from-indigo-600 to-blue-600',
  poet: 'from-violet-600 to-purple-600',
  visualist: 'from-amber-600 to-orange-600',
  narrator: 'from-emerald-600 to-teal-600',
  synthesis: 'from-purple-600 to-fuchsia-600'
}

export default function DamerisGreeting({
  museType,
  userName,
  lastVisit,
  recentMemoriesCount = 0,
  hasNewImages = false,
  onClose,
  onStartConversation
}: DamerisGreetingProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [contextPrompt, setContextPrompt] = useState('')
  const [audioPlaying, setAudioPlaying] = useState(false)

  const Icon = MUSE_ICONS[museType]
  const colorGradient = MUSE_COLORS[museType]

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100)

    // Generate personalized greeting
    const personalGreeting = getReturningUserGreeting(museType, userName, lastVisit)
    setGreeting(personalGreeting)

    // Generate contextual prompt
    const timeOfDay = getTimeOfDay()
    const prompt = getContextualPrompt(museType, {
      recentMemories: recentMemoriesCount,
      hasImages: hasNewImages,
      timeOfDay
    })
    setContextPrompt(prompt)

    // Speak greeting if TTS enabled
    speakGreeting(personalGreeting)

    return () => clearTimeout(timer)
  }, [museType, userName, lastVisit, recentMemoriesCount, hasNewImages])

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 21) return 'evening'
    return 'night'
  }

  const speakGreeting = async (text: string) => {
    try {
      setAudioPlaying(true)
      const response = await fetch('/api/tts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: '21m00Tcm4TlvDq8ikWAM' // Dameris voice
        })
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.onended = () => {
          setAudioPlaying(false)
          URL.revokeObjectURL(audioUrl)
        }

        await audio.play()
      }
    } catch (error) {
      console.log('TTS not available, continuing without voice')
      setAudioPlaying(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  const handleStartConversation = () => {
    handleClose()
    onStartConversation?.(contextPrompt)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative max-w-2xl w-full mx-4 bg-gradient-to-br from-zinc-900 to-zinc-900/95 rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${colorGradient} opacity-10 blur-3xl`}></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-violet-600/10 to-fuchsia-600/10 blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorGradient} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Dameris Awaits</h2>
                <p className="text-sm text-zinc-400">{museType.charAt(0).toUpperCase() + museType.slice(1)} Muse</p>
              </div>
            </div>

            {audioPlaying && (
              <div className="flex items-center gap-2 text-violet-400 text-sm">
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-violet-400 rounded-full animate-wave"></div>
                  <div className="w-1 h-4 bg-violet-400 rounded-full animate-wave" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-4 bg-violet-400 rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></div>
                </div>
                Speaking...
              </div>
            )}
          </div>

          {/* Greeting Message */}
          <div className="mb-6 p-6 bg-zinc-800/30 rounded-xl border border-white/5">
            <p className="text-zinc-200 leading-relaxed">{greeting}</p>
          </div>

          {/* Contextual Prompt */}
          <div className="mb-6 p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-lg border border-violet-500/20">
            <p className="text-sm text-violet-200/90 italic">{contextPrompt}</p>
          </div>

          {/* Stats */}
          {recentMemoriesCount > 0 && (
            <div className="flex gap-4 mb-6">
              <div className="flex-1 p-3 bg-zinc-800/40 rounded-lg border border-white/5">
                <div className="text-2xl font-bold text-zinc-100">{recentMemoriesCount}</div>
                <div className="text-xs text-zinc-500">New Memories</div>
              </div>
              {hasNewImages && (
                <div className="flex-1 p-3 bg-zinc-800/40 rounded-lg border border-white/5">
                  <div className="text-2xl font-bold text-amber-400">📸</div>
                  <div className="text-xs text-zinc-500">Visual Memories</div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleStartConversation}
              className={`flex-1 px-4 py-3 rounded-lg bg-gradient-to-r ${colorGradient} hover:opacity-90 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg`}
            >
              <Sparkles className="w-4 h-4" />
              Let's Talk
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes wave {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(1.5);
          }
        }

        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
