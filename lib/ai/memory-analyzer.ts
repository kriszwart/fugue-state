import { getLLMService, type LLMMessage } from './llm-service'
import { getCachedMemoryAnalysis, cacheMemoryAnalysis } from '../redis/cache-layer'

export interface MemoryAnalysis {
  emotionalPatterns: string[]
  themes: string[]
  connections: Array<{
    from: string
    to: string
    type: 'temporal' | 'thematic' | 'emotional'
    strength: number
  }>
  narrative: string
  insights: string[]
  missingIdeas?: string[] // For the "missing idea" demo feature
}

export class MemoryAnalyzer {
  private llmService: ReturnType<typeof getLLMService>

  constructor() {
    this.llmService = getLLMService()
  }

  async analyzeMemories(
    memories: Array<{
      id: string
      content: string
      themes: string[]
      emotionalTags: string[]
      temporalMarker?: string
    }>
  ): Promise<MemoryAnalysis> {
    // Check cache first
    const memoryIds = memories.map(m => m.id).sort()
    const cached = await getCachedMemoryAnalysis(memoryIds)
    if (cached) {
      return cached
    }

    // Build analysis prompt
    const memoryContext = memories
      .slice(0, 20) // Analyze up to 20 memories
      .map((m, i) => {
        return `Memory ${i + 1}:
Content: ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}
Themes: ${m.themes.join(', ') || 'None'}
Emotions: ${m.emotionalTags.join(', ') || 'None'}
Date: ${m.temporalMarker || 'Unknown'}`
      })
      .join('\n\n')

    const analysisPrompt = `You are an expert at analyzing digital memories and finding hidden patterns. Analyze the following memories and identify:

1. Emotional patterns and recurring emotional states
2. Thematic connections across memories
3. Temporal relationships and how memories relate over time
4. Hidden narratives and story threads
5. Key insights about the person's digital life
6. Missing ideas or thoughts that the person keeps circling but hasn't fully articulated

Memories to analyze:
${memoryContext}

Provide a detailed analysis in JSON format with:
- emotionalPatterns: array of recurring emotions
- themes: array of main themes
- connections: array of connections between memories with type and strength (0-1)
- narrative: a brief narrative thread connecting the memories
- insights: array of key insights
- missingIdeas: array of ideas or thoughts that seem to be emerging but not yet fully formed

Be specific and insightful. Look for patterns that might not be immediately obvious.`

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert memory analyst specializing in finding patterns, connections, and narratives in digital memories. You think deeply and make insightful connections.'
      },
      {
        role: 'user',
        content: analysisPrompt
      }
    ]

    try {
      const response = await this.llmService.generateResponse(messages, {
        modelType: 'thinking',
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2048
      })

      // Parse JSON response
      let analysis: MemoryAnalysis
      try {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: create analysis from response text
          analysis = this.parseAnalysisFromText(response.content, memories)
        }
      } catch {
        // Fallback parsing
        analysis = this.parseAnalysisFromText(response.content, memories)
      }

      // Cache the analysis
      await cacheMemoryAnalysis(memoryIds, analysis, 7200) // 2 hours

      return analysis
    } catch (error: any) {
      console.error('Memory analysis error:', error)
      // Return basic analysis as fallback
      return this.createBasicAnalysis(memories)
    }
  }

  private parseAnalysisFromText(
    text: string,
    memories: Array<{ themes: string[]; emotionalTags: string[] }>
  ): MemoryAnalysis {
    // Extract patterns from text and memory data
    const allEmotions = new Set<string>()
    const allThemes = new Set<string>()

    memories.forEach(m => {
      m.emotionalTags.forEach(e => allEmotions.add(e))
      m.themes.forEach(t => allThemes.add(t))
    })

    return {
      emotionalPatterns: Array.from(allEmotions),
      themes: Array.from(allThemes),
      connections: [],
      narrative: text.substring(0, 500),
      insights: []
    }
  }

  private createBasicAnalysis(
    memories: Array<{ themes: string[]; emotionalTags: string[] }>
  ): MemoryAnalysis {
    const emotionCounts: Record<string, number> = {}
    const themeCounts: Record<string, number> = {}

    memories.forEach(m => {
      m.emotionalTags.forEach(e => {
        emotionCounts[e] = (emotionCounts[e] || 0) + 1
      })
      m.themes.forEach(t => {
        themeCounts[t] = (themeCounts[t] || 0) + 1
      })
    })

    return {
      emotionalPatterns: Object.keys(emotionCounts).sort((a, b) => emotionCounts[b] - emotionCounts[a]).slice(0, 5),
      themes: Object.keys(themeCounts).sort((a, b) => themeCounts[b] - themeCounts[a]).slice(0, 5),
      connections: [],
      narrative: `Analysis of ${memories.length} memories reveals patterns in themes and emotions.`,
      insights: []
    }
  }
}

export function getMemoryAnalyzer(): MemoryAnalyzer {
  return new MemoryAnalyzer()
}

