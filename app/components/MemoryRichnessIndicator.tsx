'use client'

import { useState, useEffect } from 'react'
import { Database, TrendingUp, Sparkles, AlertCircle, Upload } from 'lucide-react'

interface MemoryRichness {
  score: number
  level: 'getting_started' | 'building_context' | 'rich_foundation' | 'deep_context'
  memoryCount: number
  totalCharacters: number
  coverageGaps: string[]
  recommendations: string[]
  themeDistribution: { theme: string; count: number }[]
  dateRange: { earliest: string | null; latest: string | null }
}

interface MemoryRichnessIndicatorProps {
  onUploadClick?: () => void
  compact?: boolean
}

const LEVEL_CONFIG = {
  getting_started: {
    label: 'Getting Started',
    color: 'from-slate-600 to-gray-600',
    icon: AlertCircle,
    description: 'Just beginning your journey'
  },
  building_context: {
    label: 'Building Context',
    color: 'from-blue-600 to-cyan-600',
    icon: TrendingUp,
    description: 'Developing your memory foundation'
  },
  rich_foundation: {
    label: 'Rich Foundation',
    color: 'from-violet-600 to-purple-600',
    icon: Database,
    description: 'Strong contextual understanding'
  },
  deep_context: {
    label: 'Deep Context',
    color: 'from-fuchsia-600 to-pink-600',
    icon: Sparkles,
    description: 'Profound insight and connection'
  }
}

export default function MemoryRichnessIndicator({
  onUploadClick,
  compact = false
}: MemoryRichnessIndicatorProps) {
  const [richness, setRichness] = useState<MemoryRichness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRichness()
  }, [])

  const fetchRichness = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/memories/richness')
      if (!response.ok) {
        throw new Error('Failed to fetch memory richness')
      }

      const data = await response.json()
      setRichness(data)
    } catch (err) {
      console.error('Error fetching richness:', err)
      setError('Unable to load memory insights')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-2 bg-gray-700 rounded w-1/2"></div>
      </div>
    )
  }

  if (error || !richness) {
    return null
  }

  const levelConfig = LEVEL_CONFIG[richness.level]
  const Icon = levelConfig.icon

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className={`p-2 bg-gradient-to-br ${levelConfig.color} rounded-lg`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-white">{richness.score}%</span>
            <span className="text-xs text-gray-400">{levelConfig.label}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full bg-gradient-to-r ${levelConfig.color} transition-all duration-500`}
              style={{ width: `${richness.score}%` }}
            />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {richness.memoryCount} {richness.memoryCount === 1 ? 'memory' : 'memories'}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 bg-gradient-to-br ${levelConfig.color} rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{levelConfig.label}</h3>
            <p className="text-sm text-gray-400">{levelConfig.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">{richness.score}</div>
          <div className="text-xs text-gray-400">out of 100</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full bg-gradient-to-r ${levelConfig.color} transition-all duration-700 shadow-lg`}
            style={{ width: `${richness.score}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Getting Started</span>
          <span>Deep Context</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{richness.memoryCount}</div>
          <div className="text-xs text-gray-400">Memories</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">
            {Math.floor(richness.totalCharacters / 1000)}k
          </div>
          <div className="text-xs text-gray-400">Characters</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">
            {richness.themeDistribution.length}
          </div>
          <div className="text-xs text-gray-400">Themes</div>
        </div>
      </div>

      {/* Recommendations */}
      {richness.recommendations.length > 0 && (
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Dameris suggests
          </h4>
          {richness.recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 text-sm text-gray-300 leading-relaxed"
            >
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* Coverage Gaps */}
      {richness.coverageGaps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Areas to explore</h4>
          <div className="flex flex-wrap gap-2">
            {richness.coverageGaps.map(gap => (
              <span
                key={gap}
                className="px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-full text-xs text-gray-400"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Themes */}
      {richness.themeDistribution.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Top themes</h4>
          <div className="flex flex-wrap gap-2">
            {richness.themeDistribution.slice(0, 5).map(({ theme, count }) => (
              <span
                key={theme}
                className={`px-3 py-1 bg-gradient-to-r ${levelConfig.color} bg-opacity-20 border border-gray-700 rounded-full text-xs text-white`}
              >
                {theme} <span className="text-gray-400">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upload CTA */}
      {richness.score < 80 && onUploadClick && (
        <button
          onClick={onUploadClick}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
        >
          <Upload className="w-4 h-4" />
          Upload More Memories
        </button>
      )}

      {/* Date Range */}
      {richness.dateRange.earliest && richness.dateRange.latest && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 text-center">
          Memories from {new Date(richness.dateRange.earliest).toLocaleDateString()} to{' '}
          {new Date(richness.dateRange.latest).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
