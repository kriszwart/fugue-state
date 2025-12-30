import { createServerSupabaseClient } from '@/lib/supabase'
import type { MemoryFragment } from '../processors/memory-parser'

export interface Thread {
  id: string
  title: string
  memories: string[]
  connections: Array<{
    from: string
    to: string
    strength: number
    type: 'temporal' | 'thematic' | 'emotional' | 'topical'
  }>
  narrative: string
}

export class NeuralThreading {
  async createThreads(_userId: string, memories: MemoryFragment[]): Promise<Thread[]> {
    const threads: Thread[] = []

    // Group memories by themes
    const themeGroups = this.groupByThemes(memories)
    
    // Group memories by temporal proximity
    const temporalGroups = this.groupByTemporalProximity(memories)

    // Group memories by emotional similarity
    const emotionalGroups = this.groupByEmotions(memories)

    // Create threads from groups
    for (const [theme, memoryIds] of Object.entries(themeGroups)) {
      if (memoryIds.length >= 3) {
        threads.push({
          id: `thread_${theme}_${Date.now()}`,
          title: `Thread: ${theme}`,
          memories: memoryIds,
          connections: this.buildConnections(memoryIds, memories, 'thematic' as const),
          narrative: this.generateNarrative(memoryIds, memories, theme)
        })
      }
    }

    for (const [period, memoryIds] of Object.entries(temporalGroups)) {
      if (memoryIds.length >= 3) {
        threads.push({
          id: `thread_${period}_${Date.now()}`,
          title: `Period: ${period}`,
          memories: memoryIds,
          connections: this.buildConnections(memoryIds, memories, 'temporal' as const),
          narrative: this.generateNarrative(memoryIds, memories, period)
        })
      }
    }

    for (const [emotion, memoryIds] of Object.entries(emotionalGroups)) {
      if (memoryIds.length >= 3) {
        threads.push({
          id: `thread_${emotion}_${Date.now()}`,
          title: `Emotional Arc: ${emotion}`,
          memories: memoryIds,
          connections: this.buildConnections(memoryIds, memories, 'emotional' as const),
          narrative: this.generateNarrative(memoryIds, memories, emotion)
        })
      }
    }

    return threads
  }

  private groupByThemes(memories: MemoryFragment[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      memory.themes.forEach(theme => {
        if (!groups[theme]) {
          groups[theme] = []
        }
        groups[theme].push(`memory_${index}`)
      })
    })

    return groups
  }

  private groupByTemporalProximity(memories: MemoryFragment[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      if (memory.temporalMarker) {
        const date = new Date(memory.temporalMarker)
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (!groups[period]) {
          groups[period] = []
        }
        groups[period].push(`memory_${index}`)
      }
    })

    return groups
  }

  private groupByEmotions(memories: MemoryFragment[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {}

    memories.forEach((memory, index) => {
      memory.emotionalTags.forEach(emotion => {
        if (!groups[emotion]) {
          groups[emotion] = []
        }
        groups[emotion].push(`memory_${index}`)
      })
    })

    return groups
  }

  private buildConnections(
    memoryIds: string[],
    memories: MemoryFragment[],
    type: 'temporal' | 'thematic' | 'emotional' | 'topical'
  ): Array<{ from: string; to: string; strength: number; type: 'temporal' | 'thematic' | 'emotional' | 'topical' }> {
    const connections: Array<{ from: string; to: string; strength: number; type: 'temporal' | 'thematic' | 'emotional' | 'topical' }> = []

    for (let i = 0; i < memoryIds.length; i++) {
      for (let j = i + 1; j < memoryIds.length; j++) {
        const fromIndex = parseInt(memoryIds[i]?.split('_')[1] || '0')
        const toIndex = parseInt(memoryIds[j]?.split('_')[1] || '0')
        const fromMemory = memories[fromIndex]
        const toMemory = memories[toIndex]

        if (!fromMemory || !toMemory) continue

        let strength = 0

        if (type === 'thematic') {
          const commonThemes = fromMemory.themes.filter(t => toMemory.themes.includes(t))
          strength = commonThemes.length / Math.max(fromMemory.themes.length, toMemory.themes.length, 1)
        } else if (type === 'emotional') {
          const commonEmotions = fromMemory.emotionalTags.filter(e => toMemory.emotionalTags.includes(e))
          strength = commonEmotions.length / Math.max(fromMemory.emotionalTags.length, toMemory.emotionalTags.length, 1)
        } else if (type === 'temporal') {
          if (fromMemory.temporalMarker && toMemory.temporalMarker) {
            const timeDiff = Math.abs(
              new Date(fromMemory.temporalMarker).getTime() -
              new Date(toMemory.temporalMarker).getTime()
            )
            // Closer in time = stronger connection (inverse relationship)
            strength = 1 / (1 + timeDiff / (1000 * 60 * 60 * 24 * 30)) // Normalize to months
          }
        } else {
          // Topical
          const commonKeywords = fromMemory.keywords.filter(k => toMemory.keywords.includes(k))
          strength = commonKeywords.length / Math.max(fromMemory.keywords.length, toMemory.keywords.length, 1)
        }

        if (strength > 0.3 && memoryIds[i] && memoryIds[j]) {
          connections.push({
            from: memoryIds[i] as string,
            to: memoryIds[j] as string,
            strength,
            type
          })
        }
      }
    }

    return connections
  }

  private generateNarrative(
    memoryIds: string[],
    memories: MemoryFragment[],
    context: string
  ): string {
    const selectedMemories = memoryIds
      .map(id => {
        const index = parseInt(id?.split('_')[1] || '0')
        return memories[index]
      })
      .filter(Boolean)

    if (selectedMemories.length === 0) {
      return `A thread connecting memories related to ${context}.`
    }

    const snippets = selectedMemories
      .slice(0, 5)
      .map(m => m?.content.substring(0, 100) || '')
      .join('... ')

    return `This thread weaves together ${selectedMemories.length} memories related to ${context}. ${snippets}...`
  }

  async saveThreads(userId: string, threads: Thread[]): Promise<void> {
    const supabase = createServerSupabaseClient()

    // Store threads as memory patterns with type 'neural_thread'
    for (const thread of threads) {
      await supabase.from('memory_patterns').insert({
        user_id: userId,
        pattern_type: 'thematic', // Use existing type
        pattern_data: {
          type: 'neural_thread',
          thread_id: thread.id,
          title: thread.title,
          narrative: thread.narrative,
          connections: thread.connections
        },
        confidence_score: 0.8,
        memory_ids: thread.memories
      })
    }
  }
}

export function getNeuralThreading(): NeuralThreading {
  return new NeuralThreading()
}

























