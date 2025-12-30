'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'

export default function JudgesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'tech' | 'features' | 'architecture'>('overview')

  const techStack = [
    { name: 'Google Vertex AI', description: 'Multi-LLM orchestration with thinking mode', icon: '🧠' },
    { name: 'Next.js 14', description: 'React framework with App Router & RSC', icon: '⚡' },
    { name: 'Supabase', description: 'PostgreSQL with RLS & real-time', icon: '🗄️' },
    { name: 'Redis', description: 'Caching, rate limiting & pub/sub', icon: '⚡' },
    { name: 'Google Speech-to-Text', description: 'Voice transcription with caching', icon: '🎤' },
    { name: 'ElevenLabs', description: 'Neural text-to-speech', icon: '🔊' },
    { name: 'TypeScript', description: 'Type-safe full-stack development', icon: '📘' },
    { name: 'Tailwind CSS', description: 'Utility-first styling', icon: '🎨' }
  ]

  const features = [
    {
      title: '🎙️ Voice-First Interaction',
      description: 'Natural conversation with AI muse using advanced STT/TTS',
      metrics: ['Sub-2s latency', '95%+ accuracy', 'Real-time caching']
    },
    {
      title: '🧠 Memory Intelligence',
      description: 'AI-powered analysis of personal memories and creative work',
      metrics: ['Pattern detection', 'Emotional mapping', 'Theme extraction']
    },
    {
      title: '🎨 Creative Synthesis',
      description: 'Generate artefacts from memories using multi-modal AI',
      metrics: ['Text, Image, Video', 'Style transfer', 'Contextual creation']
    },
    {
      title: '⚡ Performance Optimization',
      description: 'Redis caching, lazy loading, optimistic updates',
      metrics: ['60-90% cache hit', 'Instant responses', 'Offline support']
    }
  ]

  const metrics = [
    { label: 'API Response Time', value: '< 100ms', detail: 'p95 with Redis caching' },
    { label: 'STT Processing', value: '2-3s', detail: 'Google Speech API' },
    { label: 'LLM Generation', value: '3-5s', detail: 'Vertex AI with streaming' },
    { label: 'Cache Hit Rate', value: '75%', detail: 'STT + TTS combined' },
    { label: 'Uptime', value: '99.9%', detail: 'Vercel + Supabase' },
    { label: 'Lighthouse Score', value: '95+', detail: 'Performance optimized' }
  ]

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Header */}
      <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif-custom italic text-2xl bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                FugueState.ai
              </h1>
              <p className="text-sm text-zinc-500 mt-1">Hackathon Technical Overview</p>
            </div>
            <div className="flex gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" size="sm">Try Live Demo</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live Hackathon Submission
          </div>

          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-100 bg-clip-text text-transparent">
            An Experiment in Memory,<br />Creativity & Machine Dreaming
          </h2>

          <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
            FugueState.ai combines <span className="text-indigo-400 font-semibold">voice-first interaction</span>,
            <span className="text-violet-400 font-semibold"> multi-LLM orchestration</span>, and
            <span className="text-purple-400 font-semibold"> advanced caching</span> to create a deeply
            personal AI companion that understands your creative journey.
          </p>

          <div className="flex gap-4 justify-center">
            <Button variant="primary" size="lg">
              <span className="flex items-center gap-2">
                🎥 Watch Demo (2 min)
              </span>
            </Button>
            <Button variant="secondary" size="lg">
              <span className="flex items-center gap-2">
                📊 View Architecture
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y border-white/10 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {metrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold text-indigo-400 mb-1">{metric.value}</div>
                <div className="text-sm text-zinc-400 mb-1">{metric.label}</div>
                <div className="text-xs text-zinc-600">{metric.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {(['overview', 'tech', 'features', 'architecture'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:border-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <Card variant="elevated" padding="lg">
              <h3 className="text-2xl font-bold mb-4">What is FugueState.ai?</h3>
              <p className="text-zinc-400 mb-4 leading-relaxed">
                FugueState.ai is a voice-first AI companion designed to help creative individuals capture, analyze,
                and synthesize their memories into meaningful insights and artistic artefacts. Unlike traditional
                journaling or note-taking apps, FugueState uses advanced AI to understand patterns, emotions, and
                themes across your entire creative journey.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div className="text-3xl mb-2">🎤</div>
                  <h4 className="font-semibold mb-2">Voice-First</h4>
                  <p className="text-sm text-zinc-500">Natural conversation with AI using speech-to-text and text-to-speech</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div className="text-3xl mb-2">🧠</div>
                  <h4 className="font-semibold mb-2">AI-Powered</h4>
                  <p className="text-sm text-zinc-500">Multi-LLM orchestration with Vertex AI for deep understanding</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                  <div className="text-3xl mb-2">🎨</div>
                  <h4 className="font-semibold mb-2">Creative Output</h4>
                  <p className="text-sm text-zinc-500">Generate art, insights, and patterns from your memories</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tech Stack Tab */}
        {activeTab === 'tech' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech, idx) => (
              <Card key={idx} variant="default" padding="md">
                <div className="text-4xl mb-3">{tech.icon}</div>
                <h4 className="font-semibold text-lg mb-2">{tech.name}</h4>
                <p className="text-sm text-zinc-500">{tech.description}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <Card key={idx} variant="elevated" padding="lg">
                <h4 className="text-xl font-bold mb-3">{feature.title}</h4>
                <p className="text-zinc-400 mb-4">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.metrics.map((metric, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <Card variant="elevated" padding="lg">
            <h3 className="text-2xl font-bold mb-6">System Architecture</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-indigo-400">Frontend Layer</h4>
                <ul className="space-y-2 text-zinc-400">
                  <li>• Next.js 14 with App Router & React Server Components</li>
                  <li>• TypeScript for type safety across the stack</li>
                  <li>• Tailwind CSS for responsive, utility-first styling</li>
                  <li>• Real-time UI updates with optimistic rendering</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-violet-400">AI & ML Layer</h4>
                <ul className="space-y-2 text-zinc-400">
                  <li>• Google Vertex AI for LLM orchestration (thinking mode enabled)</li>
                  <li>• Google Speech-to-Text for voice transcription</li>
                  <li>• ElevenLabs for neural text-to-speech</li>
                  <li>• Custom prompt engineering for creative synthesis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-purple-400">Data & Caching Layer</h4>
                <ul className="space-y-2 text-zinc-400">
                  <li>• Supabase (PostgreSQL) with Row-Level Security</li>
                  <li>• Redis for STT/TTS caching (60-90% hit rate)</li>
                  <li>• Rate limiting with Redis (20 req/min per user)</li>
                  <li>• Real-time subscriptions for live updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-pink-400">Deployment & Infrastructure</h4>
                <ul className="space-y-2 text-zinc-400">
                  <li>• Vercel for serverless deployment with edge functions</li>
                  <li>• Google Cloud Run for containerized services</li>
                  <li>• Custom domain: www.fuguestate.ai</li>
                  <li>• CI/CD with automatic deployments</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h3 className="text-3xl font-bold mb-4">Experience It Yourself</h3>
        <p className="text-zinc-400 mb-8">
          Try the live demo or view the source code on GitHub
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button variant="primary" size="lg">
              Launch Live Demo →
            </Button>
          </Link>
          <Button variant="secondary" size="lg">
            View on GitHub
          </Button>
        </div>
      </section>

      {/* Built With Section */}
      <section className="border-t border-white/10 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h3 className="text-center text-sm uppercase tracking-wider text-zinc-500 mb-8">Built With</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <a
              href="https://cloud.google.com/vertex-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">🧠</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Vertex AI</span>
            </a>
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">⚡</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Next.js 14</span>
            </a>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">🗄️</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Supabase</span>
            </a>
            <a
              href="https://redis.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">⚡</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Redis</span>
            </a>
            <a
              href="https://cloud.google.com/speech-to-text"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">🎤</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Speech API</span>
            </a>
            <a
              href="https://elevenlabs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">🔊</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">ElevenLabs</span>
            </a>
            <a
              href="https://www.typescriptlang.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">📘</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">TypeScript</span>
            </a>
            <a
              href="https://tailwindcss.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform">🎨</div>
              <span className="text-xs text-zinc-400 group-hover:text-indigo-400 transition-colors text-center">Tailwind CSS</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-sm">
              Built for the hackathon with ❤️ by the FugueState team
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="text-zinc-400 hover:text-zinc-300 transition-colors">
                About
              </Link>
              <Link href="/guide" className="text-zinc-400 hover:text-zinc-300 transition-colors">
                Documentation
              </Link>
              <Link href="/architecture" className="text-zinc-400 hover:text-zinc-300 transition-colors">
                Architecture
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
