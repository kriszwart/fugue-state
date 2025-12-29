'use client'

import { useState, useEffect } from 'react'
import { Brain, Sparkles, TrendingUp, Calendar, Layers, Lightbulb, Heart, Target, Compass, BookOpen, Download, Share2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface Analysis {
  id: string
  content: string
  thinking?: string
  stats: {
    memoriesAnalyzed: number
    timespan: {
      years: number
      days: number
      from: string
      to: string
    }
    tokensUsed?: number
    tokensCached?: number
    costSavings?: string
    model?: string
  }
}

interface PreviousAnalysis {
  id: string
  title: string
  created_at: string
  metadata: any
}

const SECTION_ICONS = {
  'LIFE NARRATIVE': BookOpen,
  'MAJOR LIFE THEMES': Layers,
  'EMOTIONAL EVOLUTION': TrendingUp,
  'LIFE CHAPTERS': Calendar,
  'HIDDEN PATTERNS': Compass,
  'TURNING POINTS': Target,
  'STRENGTHS & GROWTH': Heart,
  'AREAS FOR REFLECTION': Lightbulb,
  'FUTURE INSIGHTS': Sparkles,
  'SYNTHESIS': Brain
}

export default function DeepAnalysisPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [previousAnalyses, setPreviousAnalyses] = useState<PreviousAnalysis[]>([])
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2]))
  const [progress, setProgress] = useState(0)

  // Load previous analyses on mount
  useEffect(() => {
    loadPreviousAnalyses()
  }, [])

  const loadPreviousAnalyses = async () => {
    try {
      const response = await fetch('/api/memories/deep-analysis')
      if (response.ok) {
        const data = await response.json()
        setPreviousAnalyses(data.analyses || [])
      }
    } catch (err) {
      console.error('Failed to load previous analyses:', err)
    }
  }

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    setProgress(0)

    // Simulate progress (real analysis takes 30-300 seconds)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + Math.random() * 5
      })
    }, 2000)

    try {
      const response = await fetch('/api/memories/deep-analysis', {
        method: 'POST'
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const data = await response.json()
      setProgress(100)
      setAnalysis(data.analysis)

      // Reload previous analyses list
      await loadPreviousAnalyses()
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Failed to perform analysis')
      clearInterval(progressInterval)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const exportAnalysis = () => {
    if (!analysis) return

    const blob = new Blob([analysis.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `life-analysis-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareAnalysis = async () => {
    if (!analysis) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Life Analysis',
          text: analysis.content.substring(0, 500) + '...'
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(analysis.content)
      alert('Analysis copied to clipboard!')
    }
  }

  // Parse analysis content into sections
  const parseAnalysisSections = (content: string) => {
    const sections: Array<{ title: string; content: string; icon: any }> = []
    const lines = content.split('\n')
    let currentSection: { title: string; content: string; icon: any } | null = null

    for (const line of lines) {
      // Check if line is a section header (starts with ###)
      if (line.trim().startsWith('###')) {
        if (currentSection) {
          sections.push(currentSection)
        }
        const title = line.replace(/^###\s*\d*\.?\s*/, '').trim()
        const iconKey = Object.keys(SECTION_ICONS).find(key =>
          title.toUpperCase().includes(key)
        )
        currentSection = {
          title,
          content: '',
          icon: iconKey ? SECTION_ICONS[iconKey as keyof typeof SECTION_ICONS] : Brain
        }
      } else if (currentSection && line.trim()) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }

  const sections = analysis ? parseAnalysisSections(analysis.content) : []

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-violet-400" />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Deep Life Analysis
            </h1>
          </div>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Let Dameris analyze your entire memory corpus to discover patterns, themes, and insights across your life journey
          </p>
        </div>

        {/* No analysis yet - Show start button */}
        {!analysis && !isAnalyzing && (
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 p-8 sm:p-12 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
                <Sparkles className="w-10 h-10 text-violet-400" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-200 mb-3">
                Ready to Explore Your Life Story?
              </h2>
              <p className="text-zinc-400 mb-2">
                Dameris will analyze all your memories to reveal:
              </p>
              <ul className="text-sm text-zinc-500 space-y-1 max-w-md mx-auto mb-6">
                <li>• Your life narrative and story arc</li>
                <li>• Major themes and how they evolved</li>
                <li>• Emotional patterns over time</li>
                <li>• Hidden connections and insights</li>
                <li>• Turning points and growth</li>
              </ul>
              <div className="text-xs text-zinc-600">
                Analysis typically takes 30 seconds to 5 minutes depending on memory count
              </div>
            </div>

            <button
              onClick={startAnalysis}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium text-lg transition-all transform hover:scale-105 shadow-lg shadow-violet-500/25 flex items-center gap-3 mx-auto"
            >
              <Brain className="w-6 h-6" />
              Start Deep Analysis
            </button>

            {/* Previous Analyses */}
            {previousAnalyses.length > 0 && (
              <div className="mt-12 pt-8 border-t border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">Previous Analyses</h3>
                <div className="space-y-2">
                  {previousAnalyses.map((prev) => (
                    <div
                      key={prev.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-sm font-medium text-zinc-300">{prev.title}</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(prev.created_at).toLocaleDateString()} • {prev.metadata?.memoryCount || 0} memories
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Analyzing state */}
        {isAnalyzing && (
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 p-12 text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6 animate-pulse">
                <Brain className="w-10 h-10 text-violet-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-200 mb-3">
                Analyzing Your Life Journey...
              </h2>
              <p className="text-zinc-400 mb-6">
                Dameris is reading through all your memories, finding patterns, and discovering insights
              </p>
            </div>

            {/* Progress bar */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Processing...</span>
                <span className="text-violet-400">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-4 text-xs text-zinc-500">
                This may take a few minutes for large memory collections
              </div>
            </div>

            {/* Animated thinking messages */}
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="animate-pulse">
                {progress < 30 && "Reading your memories..."}
                {progress >= 30 && progress < 60 && "Finding patterns and themes..."}
                {progress >= 60 && progress < 90 && "Analyzing emotional evolution..."}
                {progress >= 90 && "Generating insights..."}
              </span>
            </div>
          </div>
        )}

        {/* Analysis results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Stats card */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-zinc-200">Your Life Story</h2>
                <div className="flex gap-2">
                  <button
                    onClick={shareAnalysis}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={exportAnalysis}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors"
                    title="Export as Markdown"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-violet-400">{analysis.stats.memoriesAnalyzed}</div>
                  <div className="text-xs text-zinc-500">Memories Analyzed</div>
                </div>
                <div className="bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-fuchsia-400">{analysis.stats.timespan.years}</div>
                  <div className="text-xs text-zinc-500">Years Covered</div>
                </div>
                <div className="bg-pink-500/5 border border-pink-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-pink-400">{analysis.stats.timespan.days}</div>
                  <div className="text-xs text-zinc-500">Days</div>
                </div>
                {analysis.stats.costSavings && (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-emerald-400">{analysis.stats.costSavings}</div>
                    <div className="text-xs text-zinc-500">Cost Savings</div>
                  </div>
                )}
              </div>

              <div className="text-xs text-zinc-600 text-center">
                Timespan: {analysis.stats.timespan.from} → {analysis.stats.timespan.to}
                {analysis.stats.model && ` • Model: ${analysis.stats.model}`}
              </div>
            </div>

            {/* Analysis sections */}
            <div className="space-y-3">
              {sections.map((section, index) => {
                const Icon = section.icon
                const isExpanded = expandedSections.has(index)

                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleSection(index)}
                      className="w-full p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-zinc-200">{section.title}</h3>
                          <p className="text-xs text-zinc-500">
                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 animate-in fade-in duration-300">
                        <div className="prose prose-sm prose-invert max-w-none">
                          <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {section.content.trim()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Thinking process (if available) */}
            {analysis.thinking && (
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Dameris's Reasoning Process
                </h3>
                <div className="text-xs text-zinc-500 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {analysis.thinking}
                </div>
              </div>
            )}

            {/* Start new analysis */}
            <div className="text-center pt-6">
              <button
                onClick={() => {
                  setAnalysis(null)
                  setProgress(0)
                }}
                className="px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                Run New Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
