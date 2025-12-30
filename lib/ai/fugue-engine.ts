/**
 * Fugue Engine - Intelligent Fragment Mixing Service
 * Selects and combines memory fragments in unexpected, creative ways
 */

import type {
  FugueEngineConfig,
  FugueEnginResult,
  RecomposeFormat
} from '@/lib/types/fugue'

interface Fragment {
  id: string
  content: string
  themes?: string[]
  emotionalTags?: string[]
  temporalMarker?: string
  created_at?: string
}

/**
 * Fugue Engine Class
 * Intelligently selects and combines fragments for creative generation
 */
export class FugueEngine {
  /**
   * Select fragments based on configuration
   */
  async selectFragments(
    fragments: Fragment[],
    config: FugueEngineConfig
  ): Promise<Fragment[]> {
    const { fragmentCount, mode, creativity } = config

    // Ensure we don't request more fragments than available
    const count = Math.min(fragmentCount, fragments.length)

    switch (mode) {
      case 'random':
        return this.selectRandom(fragments, count, creativity)

      case 'thematic':
        return this.selectThematic(fragments, count, creativity)

      case 'temporal':
        return this.selectTemporal(fragments, count, creativity)

      case 'emotional':
        return this.selectEmotional(fragments, count, creativity)

      default:
        return this.selectRandom(fragments, count, creativity)
    }
  }

  /**
   * Random selection with creativity bias
   * Higher creativity = more diverse selection
   */
  private selectRandom(
    fragments: Fragment[],
    count: number,
    creativity: number
  ): Fragment[] {
    const shuffled = [...fragments].sort(() => Math.random() - 0.5)

    if (creativity > 0.7) {
      // Very creative: spread selection across entire collection
      const step = Math.floor(fragments.length / count)
      return shuffled.filter((_, i) => i % step === 0).slice(0, count)
    } else {
      // Less creative: just take first N after shuffle
      return shuffled.slice(0, count)
    }
  }

  /**
   * Select fragments with thematic connections
   * Lower creativity = tighter theme clustering
   */
  private selectThematic(
    fragments: Fragment[],
    count: number,
    creativity: number
  ): Fragment[] {
    // Find most common themes
    const themeFrequency = new Map<string, number>()
    fragments.forEach((f) => {
      f.themes?.forEach((theme) => {
        themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1)
      })
    })

    const sortedThemes = Array.from(themeFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])

    if (creativity > 0.6) {
      // High creativity: mix multiple themes
      const selectedThemes = sortedThemes.slice(0, Math.ceil(count / 2))
      const selected: Fragment[] = []

      selectedThemes.forEach((theme) => {
        const matching = fragments.filter((f) => f.themes?.includes(theme))
        if (matching.length > 0) {
          const randomIndex = Math.floor(Math.random() * matching.length)
          selected.push(matching[randomIndex]!)
        }
      })

      // Fill remaining with random
      while (selected.length < count && selected.length < fragments.length) {
        const randomIndex = Math.floor(Math.random() * fragments.length)
        const random = fragments[randomIndex]!
        if (!selected.includes(random)) {
          selected.push(random)
        }
      }

      return selected.slice(0, count)
    } else {
      // Low creativity: stick to one theme
      const mainTheme = sortedThemes[0]
      if (!mainTheme) return fragments.slice(0, count)
      const themeFragments = fragments.filter((f) =>
        f.themes?.includes(mainTheme)
      )
      return themeFragments.slice(0, count)
    }
  }

  /**
   * Select fragments across time periods
   * Higher creativity = wider time spread
   */
  private selectTemporal(
    fragments: Fragment[],
    count: number,
    creativity: number
  ): Fragment[] {
    const sorted = [...fragments].sort((a, b) => {
      const dateA = new Date(a.temporalMarker || a.created_at || 0)
      const dateB = new Date(b.temporalMarker || b.created_at || 0)
      return dateA.getTime() - dateB.getTime()
    })

    if (creativity > 0.6) {
      // High creativity: maximum time spread
      const step = Math.floor(sorted.length / count)
      return sorted.filter((_, i) => i % step === 0).slice(0, count)
    } else {
      // Low creativity: recent fragments
      return sorted.slice(-count)
    }
  }

  /**
   * Select fragments with emotional variety/similarity
   * Higher creativity = more emotional variety
   */
  private selectEmotional(
    fragments: Fragment[],
    count: number,
    creativity: number
  ): Fragment[] {
    const emotionalMap = new Map<string, Fragment[]>()

    fragments.forEach((f) => {
      const emotions = f.emotionalTags || ['neutral']
      emotions.forEach((emotion) => {
        if (!emotionalMap.has(emotion)) {
          emotionalMap.set(emotion, [])
        }
        emotionalMap.get(emotion)!.push(f)
      })
    })

    const emotions = Array.from(emotionalMap.keys())

    if (creativity > 0.6) {
      // High creativity: diverse emotions
      const selected: Fragment[] = []
      emotions.forEach((emotion) => {
        const pool = emotionalMap.get(emotion) || []
        if (pool.length > 0 && selected.length < count) {
          const randomIndex = Math.floor(Math.random() * pool.length)
          selected.push(pool[randomIndex]!)
        }
      })
      return selected.slice(0, count)
    } else {
      // Low creativity: similar emotions
      const dominantEmotion = emotions[0] || 'neutral'
      const pool = emotionalMap.get(dominantEmotion) || []
      return pool.slice(0, count)
    }
  }

  /**
   * Find connections between fragments
   */
  findConnections(
    fragments: Fragment[]
  ): Array<{ fragment1: number; fragment2: number; connection: string }> {
    const connections: Array<{
      fragment1: number
      fragment2: number
      connection: string
    }> = []

    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        const connection = this.detectConnection(fragments[i]!, fragments[j]!)
        if (connection) {
          connections.push({
            fragment1: i,
            fragment2: j,
            connection,
          })
        }
      }
    }

    return connections
  }

  /**
   * Detect connection between two fragments
   */
  private detectConnection(f1: Fragment, f2: Fragment): string | null {
    // Thematic overlap
    const sharedThemes = (f1.themes || []).filter((t) =>
      (f2.themes || []).includes(t)
    )
    if (sharedThemes.length > 0) {
      return `Both explore: ${sharedThemes.join(', ')}`
    }

    // Emotional resonance
    const sharedEmotions = (f1.emotionalTags || []).filter((e) =>
      (f2.emotionalTags || []).includes(e)
    )
    if (sharedEmotions.length > 0) {
      return `Shared emotional tone: ${sharedEmotions.join(', ')}`
    }

    // Word overlap (simple)
    const words1 = new Set(
      f1.content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    )
    const words2 = f2.content
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)

    const sharedWords = words2.filter((w) => words1.has(w))
    if (sharedWords.length > 2) {
      return `Recurring concepts: ${sharedWords.slice(0, 3).join(', ')}`
    }

    return null
  }

  /**
   * Generate creative prompt from selected fragments
   */
  generatePrompt(
    fragments: Fragment[],
    _connections: Array<{ fragment1: number; fragment2: number; connection: string }>,
    creativity: number
  ): string {
    const prompts = [
      // Low creativity
      `Explore the connections between these ${fragments.length} fragments. What patterns emerge?`,
      `What story connects these moments from your memory?`,
      `Find the thread that ties these ideas together.`,

      // Medium creativity
      `What would happen if ${this.preview(fragments[0]!)} met ${this.preview(fragments[1]!)} in an unexpected way?`,
      `Imagine a world where these ${fragments.length} fragments are chapters in the same book.`,
      `What new insight emerges when you layer these memories on top of each other?`,

      // High creativity
      `Create a surreal narrative where ${this.preview(fragments[0]!)} becomes the metaphor for ${this.preview(fragments[fragments.length - 1]!)}.`,
      `Build a collage from these fragments that reveals a truth you haven't seen before.`,
      `Transform these ${fragments.length} memories into a dreamlike journey. Where does it lead?`,

      // Very high creativity
      `What if ${this.preview(fragments[0]!)} and ${this.preview(fragments[Math.floor(fragments.length / 2)]!)} were two sides of the same coin, viewed from parallel universes?`,
      `Remix these fragments into something completely unexpected. Break all rules.`,
      `Let these memories collide and see what new reality emerges from the wreckage.`,
    ]

    const index = Math.min(
      Math.floor(creativity * prompts.length),
      prompts.length - 1
    )
    return prompts[index]!
  }

  /**
   * Suggest format based on content analysis
   */
  suggestFormat(fragments: Fragment[], creativity: number): RecomposeFormat {
    // Analyze fragments
    const totalLength = fragments.reduce((sum, f) => sum + f.content.length, 0)
    const avgLength = totalLength / fragments.length

    const emotions = new Set<string>()
    fragments.forEach((f) => {
      f.emotionalTags?.forEach((e) => emotions.add(e))
    })

    const hasStrongEmotions = emotions.size > 3

    // Decision logic
    if (creativity > 0.8) {
      return hasStrongEmotions ? 'songLyrics' : 'dreamLog'
    } else if (creativity > 0.6) {
      return avgLength < 200 ? 'microStory' : 'dialogue'
    } else if (creativity > 0.4) {
      return hasStrongEmotions ? 'poem' : 'narrative'
    } else if (avgLength < 100) {
      return 'aphorisms'
    } else {
      return 'manifesto'
    }
  }

  /**
   * Generate reason for selection
   */
  generateSelectionReason(_fragment: Fragment, mode: string): string {
    const reasons = {
      random: [
        'Chosen by chance - sometimes randomness reveals truth',
        'A wild card selection',
        'Unexpected choice to spark creativity',
      ],
      thematic: [
        'Thematically connected to the cluster',
        'Shares key themes with other selections',
        'Part of a larger pattern',
      ],
      temporal: [
        'Selected from a specific time period',
        'Represents a moment in your evolution',
        'Temporally significant',
      ],
      emotional: [
        'Emotionally resonant with the set',
        'Carries a specific emotional signature',
        'Adds emotional depth',
      ],
    }

    const pool = reasons[mode as keyof typeof reasons] || reasons.random
    const randomIndex = Math.floor(Math.random() * pool.length)
    return pool[randomIndex]!
  }

  /**
   * Main generation method
   */
  async generate(
    fragments: Fragment[],
    config: FugueEngineConfig
  ): Promise<FugueEnginResult> {
    const selected = await this.selectFragments(fragments, config)

    const connections = this.findConnections(selected)

    const prompt = this.generatePrompt(selected, connections, config.creativity)

    const format = this.suggestFormat(selected, config.creativity)

    return {
      prompt,
      selectedFragments: selected.map((f) => ({
        content: f.content,
        reason: this.generateSelectionReason(f, config.mode),
      })),
      connections,
      suggestion: `Try creating a ${format} that explores: ${prompt}`,
      format,
    }
  }

  /**
   * Helper: Create preview of fragment
   */
  private preview(fragment: Fragment): string {
    const words = fragment.content.split(/\s+/).slice(0, 10).join(' ')
    return words.length < fragment.content.length ? words + '...' : words
  }
}

/**
 * Singleton instance
 */
let fugueEngineInstance: FugueEngine | null = null

export function getFugueEngine(): FugueEngine {
  if (!fugueEngineInstance) {
    fugueEngineInstance = new FugueEngine()
  }
  return fugueEngineInstance
}
