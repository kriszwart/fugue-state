import { createServerSupabaseClient } from '@/lib/supabase'
import type { MemoryFragment } from './memory-parser'

export interface Pattern {
  type: 'emotional' | 'thematic' | 'temporal' | 'topical'
  patternData: {
    name: string
    description: string
    confidence: number
    memoryIds: string[]
    metadata?: Record<string, any>
  }
}

export class PatternDetector {
  async detectPatterns(userId: string, memories: MemoryFragment[]): Promise<Pattern[]> {
    const patterns: Pattern[] = []

    // Emotional patterns
    patterns.push(...this.detectEmotionalPatterns(memories))

    // Thematic patterns
    patterns.push(...this.detectThematicPatterns(memories))

    // Temporal patterns
    patterns.push(...this.detectTemporalPatterns(memories))

    // Topical patterns
    patterns.push(...this.detectTopicalPatterns(memories))

    return patterns
  }

  private detectEmotionalPatterns(memories: MemoryFragment[]): Pattern[] {
    const emotionCounts: Record<string, number> = {}
    const emotionMemories: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      memory.emotionalTags.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
        if (!emotionMemories[emotion]) {
          emotionMemories[emotion] = []
        }
        emotionMemories[emotion].push(`memory_${index}`)
      })
    })

    const patterns: Pattern[] = []
    const threshold = memories.length * 0.3 // 30% threshold

    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count >= threshold) {
        patterns.push({
          type: 'emotional',
          patternData: {
            name: `Recurring ${emotion}`,
            description: `${emotion} appears in ${count} out of ${memories.length} memories`,
            confidence: count / memories.length,
            memoryIds: emotionMemories[emotion]
          }
        })
      }
    }

    return patterns
  }

  private detectThematicPatterns(memories: MemoryFragment[]): Pattern[] {
    const themeCounts: Record<string, number> = {}
    const themeMemories: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      memory.themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1
        if (!themeMemories[theme]) {
          themeMemories[theme] = []
        }
        themeMemories[theme].push(`memory_${index}`)
      })
    })

    const patterns: Pattern[] = []
    const threshold = memories.length * 0.2 // 20% threshold

    for (const [theme, count] of Object.entries(themeCounts)) {
      if (count >= threshold) {
        patterns.push({
          type: 'thematic',
          patternData: {
            name: `Theme: ${theme}`,
            description: `${theme} appears in ${count} memories`,
            confidence: count / memories.length,
            memoryIds: themeMemories[theme]
          }
        })
      }
    }

    return patterns
  }

  private detectTemporalPatterns(memories: MemoryFragment[]): Pattern[] {
    const patterns: Pattern[] = []
    
    // Group by time periods
    const timeGroups: Record<string, string[]> = {}
    
    memories.forEach((memory, index) => {
      if (memory.temporalMarker) {
        const date = new Date(memory.temporalMarker)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!timeGroups[month]) {
          timeGroups[month] = []
        }
        timeGroups[month].push(`memory_${index}`)
      }
    })

    // Find months with high activity
    for (const [month, memoryIds] of Object.entries(timeGroups)) {
      if (memoryIds.length >= 5) {
        patterns.push({
          type: 'temporal',
          patternData: {
            name: `Activity in ${month}`,
            description: `${memoryIds.length} memories from ${month}`,
            confidence: Math.min(memoryIds.length / 20, 1),
            memoryIds,
            metadata: { month }
          }
        })
      }
    }

    return patterns
  }

  private detectTopicalPatterns(memories: MemoryFragment[]): Pattern[] {
    const keywordCounts: Record<string, number> = {}
    const keywordMemories: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      memory.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1
        if (!keywordMemories[keyword]) {
          keywordMemories[keyword] = []
        }
        keywordMemories[keyword].push(`memory_${index}`)
      })
    })

    const patterns: Pattern[] = []
    const threshold = memories.length * 0.15 // 15% threshold

    // Get top keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [keyword, count] of topKeywords) {
      if (count >= threshold) {
        patterns.push({
          type: 'topical',
          patternData: {
            name: `Topic: ${keyword}`,
            description: `${keyword} appears frequently`,
            confidence: count / memories.length,
            memoryIds: keywordMemories[keyword]
          }
        })
      }
    }

    return patterns
  }

  async savePatterns(userId: string, patterns: Pattern[]): Promise<void> {
    const supabase = createServerSupabaseClient()

    for (const pattern of patterns) {
      await supabase.from('memory_patterns').insert({
        user_id: userId,
        pattern_type: pattern.type,
        pattern_data: pattern.patternData,
        confidence_score: pattern.patternData.confidence,
        memory_ids: pattern.patternData.memoryIds
      })
    }
  }
}

export function getPatternDetector(): PatternDetector {
  return new PatternDetector()
}
























