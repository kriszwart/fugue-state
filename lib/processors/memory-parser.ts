import { DataExtractor } from './data-extractor'
import { createServerSupabaseClient } from '@/lib/supabase'

export interface MemoryFragment {
  content: string
  emotionalTags: string[]
  themes: string[]
  keywords: string[]
  temporalMarker?: string
  source: string
}

export class MemoryParser {
  private extractor: DataExtractor

  constructor() {
    this.extractor = new DataExtractor()
  }

  parseMemory(rawData: any): MemoryFragment {
    const extracted = this.extractor.extractText(rawData, rawData.source_type || 'unknown')
    const cleanedText = this.extractor.cleanText(extracted.text)
    const keywords = this.extractor.extractKeywords(cleanedText)

    return {
      content: cleanedText,
      emotionalTags: this.detectEmotions(cleanedText),
      themes: this.detectThemes(cleanedText, keywords),
      keywords,
      temporalMarker: extracted.metadata.timestamp,
      source: extracted.metadata.source
    }
  }

  private detectEmotions(text: string): string[] {
    // Simple emotion detection based on keywords
    // In production, use NLP models or sentiment analysis
    const emotionKeywords: Record<string, string[]> = {
      joy: ['happy', 'excited', 'joy', 'celebrate', 'wonderful', 'amazing', 'love'],
      sadness: ['sad', 'depressed', 'lonely', 'cry', 'miss', 'loss', 'hurt'],
      anger: ['angry', 'furious', 'mad', 'frustrated', 'annoyed', 'hate'],
      fear: ['afraid', 'scared', 'worried', 'anxious', 'nervous', 'panic'],
      surprise: ['surprised', 'shocked', 'unexpected', 'wow', 'incredible']
    }

    const textLower = text.toLowerCase()
    const detected: string[] = []

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        detected.push(emotion)
      }
    }

    return detected.length > 0 ? detected : ['neutral']
  }

  private detectThemes(text: string, keywords: string[]): string[] {
    // Simple theme detection
    // In production, use topic modeling or classification
    const themeKeywords: Record<string, string[]> = {
      work: ['meeting', 'project', 'deadline', 'colleague', 'office', 'work', 'job'],
      family: ['family', 'parent', 'child', 'sibling', 'home', 'relative'],
      travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'destination'],
      health: ['health', 'doctor', 'medical', 'exercise', 'fitness', 'wellness'],
      learning: ['learn', 'study', 'course', 'education', 'book', 'reading'],
      relationships: ['friend', 'relationship', 'partner', 'date', 'social']
    }

    const textLower = text.toLowerCase()
    const detected: string[] = []

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => textLower.includes(keyword)) || 
          keywords.some(keyword => keywords.includes(keyword))) {
        detected.push(theme)
      }
    }

    return detected.length > 0 ? detected : ['general']
  }

  chunkMemory(memory: MemoryFragment, maxChunkSize: number = 1000): MemoryFragment[] {
    if (memory.content.length <= maxChunkSize) {
      return [memory]
    }

    const chunks: MemoryFragment[] = []
    const sentences = memory.content.split(/[.!?]\s+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push({
          ...memory,
          content: currentChunk.trim()
        })
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      }
    }

    if (currentChunk) {
      chunks.push({
        ...memory,
        content: currentChunk.trim()
      })
    }

    return chunks
  }

  /**
   * Parse text into memory fragments and save them to the database
   * Returns array of created memory IDs
   */
  async parseToMemoryFragments(
    text: string,
    sourceType: string,
    metadata: Record<string, any>,
    userId?: string
  ): Promise<string[]> {
    // Clean and extract keywords from text
    const cleanedText = this.extractor.cleanText(text)
    const keywords = this.extractor.extractKeywords(cleanedText)

    // Create initial memory fragment
    const fragment: MemoryFragment = {
      content: cleanedText,
      emotionalTags: this.detectEmotions(cleanedText),
      themes: this.detectThemes(cleanedText, keywords),
      keywords,
      temporalMarker: metadata.timestamp || new Date().toISOString(),
      source: metadata.source || sourceType
    }

    // Chunk if too large
    const chunks = this.chunkMemory(fragment, 1000)

    // If no userId provided, we can't save to database - return empty array
    if (!userId) {
      console.warn('parseToMemoryFragments: No userId provided, skipping database save')
      return []
    }

    // Save each chunk to database
    const supabase = createServerSupabaseClient()
    const memoryIds: string[] = []

    for (const chunk of chunks) {
      const { data, error } = await supabase
        .from('memories')
        .insert({
          user_id: userId,
          content: chunk.content,
          source_type: sourceType,
          emotional_tags: chunk.emotionalTags,
          themes: chunk.themes,
          keywords: chunk.keywords,
          temporal_marker: chunk.temporalMarker,
          metadata: {
            ...metadata,
            fragmentIndex: chunks.length > 1 ? chunks.indexOf(chunk) : undefined,
            totalFragments: chunks.length > 1 ? chunks.length : undefined
          }
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error saving memory fragment:', error)
        continue
      }

      if (data?.id) {
        memoryIds.push(data.id)
      }
    }

    return memoryIds
  }
}

export function getMemoryParser(): MemoryParser {
  return new MemoryParser()
}
























