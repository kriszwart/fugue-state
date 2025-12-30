export interface ExtractedData {
  text: string
  metadata: {
    source: string
    type: string
    timestamp?: string
    [key: string]: any
  }
}

export class DataExtractor {
  extractText(data: any, sourceType: string): ExtractedData {
    switch (sourceType) {
      case 'gmail':
        return this.extractFromGmail(data)
      case 'drive':
        return this.extractFromDrive(data)
      case 'notion':
        return this.extractFromNotion(data)
      case 'local':
        return this.extractFromLocal(data)
      default:
        return {
          text: typeof data === 'string' ? data : JSON.stringify(data),
          metadata: { source: sourceType, type: 'unknown' }
        }
    }
  }

  private extractFromGmail(data: any): ExtractedData {
    const text = data.content || data.snippet || ''
    return {
      text,
      metadata: {
        source: 'gmail',
        type: 'email',
        timestamp: data.temporal_marker,
        gmail_id: data.extracted_data?.gmail_id,
        thread_id: data.extracted_data?.thread_id
      }
    }
  }

  private extractFromDrive(data: any): ExtractedData {
    const text = data.content || ''
    return {
      text,
      metadata: {
        source: 'drive',
        type: data.content_type || 'document',
        timestamp: data.temporal_marker,
        file_id: data.extracted_data?.drive_file_id,
        file_name: data.extracted_data?.name,
        mime_type: data.extracted_data?.mime_type
      }
    }
  }

  private extractFromNotion(data: any): ExtractedData {
    const text = data.content || ''
    return {
      text,
      metadata: {
        source: 'notion',
        type: 'page',
        timestamp: data.temporal_marker,
        page_id: data.extracted_data?.notion_page_id,
        url: data.extracted_data?.url
      }
    }
  }

  private extractFromLocal(data: any): ExtractedData {
    const text = data.content || ''
    return {
      text,
      metadata: {
        source: 'local',
        type: data.content_type || 'text',
        filename: data.extracted_data?.filename,
        size: data.extracted_data?.size
      }
    }
  }

  cleanText(text: string): string {
    // Remove excessive whitespace
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    // Simple keyword extraction (in production, use NLP libraries)
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)

    const wordFreq: Record<string, number> = {}
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    })

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word)
  }
}

export function getDataExtractor(): DataExtractor {
  return new DataExtractor()
}

























