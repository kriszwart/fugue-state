import { createServerSupabaseClient } from '@/lib/supabase'

export interface LocalFile {
  name: string
  content: string
  type: string
  size: number
}

export class LocalFileService {
  async processUpload(file: File): Promise<LocalFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve({
          name: file.name,
          content: content,
          type: file.type,
          size: file.size
        })
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      if (file.type.startsWith('text/')) {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
  }

  async saveToDatabase(userId: string, file: LocalFile, sourceId?: string): Promise<string> {
    const supabase = createServerSupabaseClient()
    
    // Extract text content if possible
    let textContent = ''
    if (file.type.startsWith('text/')) {
      textContent = file.content
    } else if (file.type === 'application/json') {
      try {
        const json = JSON.parse(file.content)
        textContent = JSON.stringify(json, null, 2)
      } catch {
        textContent = file.content
      }
    }

    // Save as memory
    const { data, error } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        data_source_id: sourceId,
        content: textContent || file.name,
        content_type: this.mapMimeTypeToContentType(file.type),
        extracted_data: {
          filename: file.name,
          size: file.size,
          type: file.type,
          hasBinaryContent: !file.type.startsWith('text/')
        }
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save file: ${error.message}`)
    }

    return data.id
  }

  private mapMimeTypeToContentType(mimeType: string): 'text' | 'image' | 'audio' | 'video' | 'document' {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('pdf')) {
      return 'document'
    }
    return 'text'
  }
}

export function getLocalFileService(): LocalFileService {
  return new LocalFileService()
}
























