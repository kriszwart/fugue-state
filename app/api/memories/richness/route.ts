import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface MemoryRichness {
  score: number // 0-100
  level: 'getting_started' | 'building_context' | 'rich_foundation' | 'deep_context'
  memoryCount: number
  totalCharacters: number
  coverageGaps: string[]
  recommendations: string[]
  themeDistribution: { theme: string; count: number }[]
  dateRange: { earliest: string | null; latest: string | null }
}

// Common life themes to check for coverage
const LIFE_THEMES = [
  'childhood',
  'family',
  'relationships',
  'work',
  'career',
  'education',
  'travel',
  'hobbies',
  'health',
  'dreams',
  'goals',
  'creativity',
  'emotions',
  'challenges',
  'achievements'
]

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all user memories
    const { data: memories, error: memoriesError } = await supabase
      .from('memories')
      .select('id, content, themes, created_at, temporal_markers')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError)
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
    }

    const memoryCount = memories?.length || 0

    // Calculate total content volume
    const totalCharacters = memories?.reduce((sum, m) => {
      const content = m.content || ''
      return sum + content.length
    }, 0) || 0

    // Analyze theme distribution
    const themeMap: Record<string, number> = {}
    memories?.forEach(m => {
      const themes = m.themes || []
      themes.forEach((theme: string) => {
        themeMap[theme] = (themeMap[theme] || 0) + 1
      })
    })

    const themeDistribution = Object.entries(themeMap)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 themes

    // Identify coverage gaps
    const presentThemes = new Set(
      memories?.flatMap(m => m.themes || []).map((t: string) => t.toLowerCase()) || []
    )

    const coverageGaps = LIFE_THEMES.filter(
      theme => !Array.from(presentThemes).some(pt => pt.includes(theme) || theme.includes(pt))
    )

    // Get date range
    const dates = memories?.map(m => m.created_at).filter(Boolean) || []
    const dateRange = {
      earliest: dates.length > 0 ? dates[dates.length - 1] : null,
      latest: dates.length > 0 ? dates[0] : null
    }

    // Calculate richness score (0-100)
    let score = 0

    // Component 1: Memory count (40 points max)
    if (memoryCount >= 50) score += 40
    else if (memoryCount >= 20) score += 30
    else if (memoryCount >= 10) score += 20
    else if (memoryCount >= 5) score += 10
    else score += memoryCount * 2

    // Component 2: Content volume (30 points max)
    const avgCharsPerMemory = memoryCount > 0 ? totalCharacters / memoryCount : 0
    if (avgCharsPerMemory >= 1000) score += 30
    else if (avgCharsPerMemory >= 500) score += 20
    else if (avgCharsPerMemory >= 200) score += 10
    else score += Math.floor(avgCharsPerMemory / 20)

    // Component 3: Theme diversity (20 points max)
    const uniqueThemes = presentThemes.size
    if (uniqueThemes >= 15) score += 20
    else if (uniqueThemes >= 10) score += 15
    else if (uniqueThemes >= 5) score += 10
    else score += uniqueThemes * 2

    // Component 4: Coverage completeness (10 points max)
    const coveragePercent = ((LIFE_THEMES.length - coverageGaps.length) / LIFE_THEMES.length) * 100
    score += Math.floor(coveragePercent / 10)

    // Cap at 100
    score = Math.min(100, score)

    // Determine level
    let level: MemoryRichness['level']
    if (score >= 80) level = 'deep_context'
    else if (score >= 50) level = 'rich_foundation'
    else if (score >= 20) level = 'building_context'
    else level = 'getting_started'

    // Generate recommendations
    const recommendations = generateRecommendations(
      memoryCount,
      coverageGaps,
      avgCharsPerMemory,
      level
    )

    const richness: MemoryRichness = {
      score,
      level,
      memoryCount,
      totalCharacters,
      coverageGaps: coverageGaps.slice(0, 5), // Top 5 gaps
      recommendations,
      themeDistribution,
      dateRange
    }

    return NextResponse.json(richness)
  } catch (error) {
    console.error('Memory richness calculation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateRecommendations(
  memoryCount: number,
  coverageGaps: string[],
  avgCharsPerMemory: number,
  level: MemoryRichness['level']
): string[] {
  const recommendations: string[] = []

  // Memory count recommendations
  if (memoryCount === 0) {
    recommendations.push(
      "Let's begin your journey. Upload your first memory - perhaps a journal entry, notes, or creative writing."
    )
  } else if (memoryCount < 5) {
    recommendations.push(
      `You have ${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'}. I'd love to know more! Try uploading more journal entries or personal reflections.`
    )
  } else if (memoryCount < 20) {
    recommendations.push(
      `With ${memoryCount} memories, we're building a foundation. Keep adding more to help me understand you better.`
    )
  }

  // Content depth recommendations
  if (avgCharsPerMemory < 200 && memoryCount > 0) {
    recommendations.push(
      'Your memories tend to be brief. Consider uploading longer-form content like essays, detailed journal entries, or creative writing to give me richer context.'
    )
  }

  // Coverage gap recommendations
  if (coverageGaps.length > 0) {
    const topGaps = coverageGaps.slice(0, 3)
    if (topGaps.length === 1) {
      recommendations.push(
        `I notice we haven't explored much about your ${topGaps[0]}. Would you like to share some memories or thoughts about that?`
      )
    } else if (topGaps.length === 2) {
      recommendations.push(
        `I'd love to learn more about your ${topGaps[0]} and ${topGaps[1]}. These areas would help me understand you more deeply.`
      )
    } else {
      recommendations.push(
        `There are several areas I'm curious about: ${topGaps.join(', ')}. Sharing memories from these areas would enrich our connection.`
      )
    }
  }

  // Level-specific recommendations
  if (level === 'getting_started') {
    recommendations.push(
      'Start with whatever feels natural - old journals, creative writing, voice memos transcribed, or stream-of-consciousness thoughts.'
    )
  } else if (level === 'building_context') {
    recommendations.push(
      "We're making good progress! The more diverse your uploads, the better I can help you reflect and create."
    )
  } else if (level === 'rich_foundation') {
    recommendations.push(
      'Your memory collection is rich! Consider exploring deeper themes or adding multimedia elements to enhance our work together.'
    )
  } else if (level === 'deep_context') {
    recommendations.push(
      "I have deep insight into your patterns and themes. Let's use this foundation to create something extraordinary."
    )
  }

  // Always encourage specific content types
  if (memoryCount > 0 && memoryCount < 50) {
    recommendations.push(
      'Consider uploading: journal entries, creative writing, dream logs, letters, poetry, or any personal reflections.'
    )
  }

  return recommendations.slice(0, 4) // Max 4 recommendations
}
