'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/app/components/ui/Card'
import { DashboardSkeleton } from '@/app/components/LoadingSkeleton'
import FadeIn from '@/app/components/FadeIn'

interface Stats {
  totalMemories: number
  totalArtefacts: number
  conversationCount: number
  totalCharacters: number
  themeDistribution: { theme: string; count: number }[]
  emotionalTrends: { emotion: string; count: number }[]
  activityByMonth: { month: string; count: number }[]
  averageMemoryLength: number
  longestStreak: number
  creativeScore: number
}

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch user stats from API
      const [memoriesRes, artefactsRes] = await Promise.all([
        fetch('/api/memories?limit=1000'),
        fetch('/api/artefacts/recent?limit=1000')
      ])

      const memoriesData = await memoriesRes.json()
      const artefactsData = await artefactsRes.json()

      const memories = memoriesData.memories || []
      const artefacts = artefactsData.artefacts || []

      // Calculate stats
      const totalCharacters = memories.reduce((sum: number, m: any) => sum + (m.content?.length || 0), 0)
      const averageLength = memories.length > 0 ? Math.round(totalCharacters / memories.length) : 0

      // Theme distribution
      const themeMap = new Map<string, number>()
      memories.forEach((m: any) => {
        m.themes?.forEach((theme: string) => {
          themeMap.set(theme, (themeMap.get(theme) || 0) + 1)
        })
      })
      const themeDistribution = Array.from(themeMap.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Emotional trends
      const emotionMap = new Map<string, number>()
      memories.forEach((m: any) => {
        m.emotional_tags?.forEach((emotion: string) => {
          emotionMap.set(emotion, (emotionMap.get(emotion) || 0) + 1)
        })
      })
      const emotionalTrends = Array.from(emotionMap.entries())
        .map(([emotion, count]) => ({ emotion, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      // Activity by month
      const monthMap = new Map<string, number>()
      memories.forEach((m: any) => {
        if (m.created_at) {
          const date = new Date(m.created_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1)
        }
      })
      const activityByMonth = Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12)

      // Creative score (simple algorithm based on activity and variety)
      const varietyScore = themeDistribution.length * 5
      const volumeScore = Math.min(memories.length * 2, 100)
      const consistencyScore = Math.min(activityByMonth.length * 8, 100)
      const creativeScore = Math.round((varietyScore + volumeScore + consistencyScore) / 3)

      setStats({
        totalMemories: memories.length,
        totalArtefacts: artefacts.length,
        conversationCount: 0, // TODO: Get from API
        totalCharacters,
        themeDistribution,
        emotionalTrends,
        activityByMonth,
        averageMemoryLength: averageLength,
        longestStreak: Math.min(activityByMonth.length, 30),
        creativeScore: Math.min(creativeScore, 100)
      })
    } catch (err: any) {
      console.error('Error fetching stats:', err)
      setError('Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        <Card variant="elevated" padding="lg">
          <p className="text-red-400">{error || 'Failed to load stats'}</p>
        </Card>
      </div>
    )
  }

  const maxThemeCount = Math.max(...stats.themeDistribution.map(t => t.count), 1)
  const maxEmotionCount = Math.max(...stats.emotionalTrends.map(e => e.count), 1)
  const maxActivityCount = Math.max(...stats.activityByMonth.map(a => a.count), 1)

  return (
    <FadeIn duration={400}>
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Your Creative Journey</h1>
            <p className="text-zinc-400">Analytics and insights from your memories</p>
          </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" padding="md">
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-400 mb-2">{stats.totalMemories}</div>
              <div className="text-sm text-zinc-500">Memories Captured</div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <div className="text-4xl font-bold text-violet-400 mb-2">{stats.totalArtefacts}</div>
              <div className="text-sm text-zinc-500">Artefacts Created</div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">{stats.longestStreak}</div>
              <div className="text-sm text-zinc-500">Day Streak</div>
            </div>
          </Card>

          <Card variant="elevated" padding="md">
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">{stats.creativeScore}</div>
              <div className="text-sm text-zinc-500">Creative Score</div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Theme Distribution */}
          <Card variant="elevated" padding="lg">
            <h3 className="text-xl font-semibold mb-6">Top Themes</h3>
            <div className="space-y-4">
              {stats.themeDistribution.map((theme, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-zinc-300 capitalize">{theme.theme}</span>
                    <span className="text-zinc-500">{theme.count}</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                      style={{ width: `${(theme.count / maxThemeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.themeDistribution.length === 0 && (
                <p className="text-zinc-500 text-center py-8">No themes yet. Start capturing memories!</p>
              )}
            </div>
          </Card>

          {/* Emotional Trends */}
          <Card variant="elevated" padding="lg">
            <h3 className="text-xl font-semibold mb-6">Emotional Landscape</h3>
            <div className="space-y-4">
              {stats.emotionalTrends.map((emotion, idx) => (
                <div key={idx}>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-zinc-300 capitalize">{emotion.emotion}</span>
                    <span className="text-zinc-500">{emotion.count}</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(emotion.count / maxEmotionCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.emotionalTrends.length === 0 && (
                <p className="text-zinc-500 text-center py-8">No emotional data yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card variant="elevated" padding="lg" className="mb-6">
          <h3 className="text-xl font-semibold mb-6">Activity Over Time</h3>
          {stats.activityByMonth.length > 0 ? (
            <div className="flex items-end justify-between gap-2 h-48">
              {stats.activityByMonth.map((activity, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-500 to-violet-500 rounded-t transition-all hover:from-indigo-400 hover:to-violet-400"
                      style={{
                        height: `${(activity.count / maxActivityCount) * 100}%`,
                        minHeight: '8px'
                      }}
                      title={`${activity.count} memories`}
                    />
                  </div>
                  <div className="text-xs text-zinc-600 text-center whitespace-nowrap">
                    {new Date(activity.month + '-01').toLocaleDateString('en-US', {
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-center py-16">No activity data yet. Start your creative journey!</p>
          )}
        </Card>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card variant="default" padding="md">
            <h4 className="text-sm text-zinc-500 mb-1">Total Words</h4>
            <p className="text-2xl font-bold">{Math.round(stats.totalCharacters / 5).toLocaleString()}</p>
          </Card>

          <Card variant="default" padding="md">
            <h4 className="text-sm text-zinc-500 mb-1">Avg. Memory Length</h4>
            <p className="text-2xl font-bold">{stats.averageMemoryLength} chars</p>
          </Card>

          <Card variant="default" padding="md">
            <h4 className="text-sm text-zinc-500 mb-1">Unique Themes</h4>
            <p className="text-2xl font-bold">{stats.themeDistribution.length}</p>
          </Card>
        </div>
      </div>
    </div>
    </FadeIn>
  )
}
