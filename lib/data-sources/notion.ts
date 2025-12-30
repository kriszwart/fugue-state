import { createServerSupabaseClient } from '@/lib/supabase'
import crypto from 'crypto'

function decrypt(encrypted: string, key: string): string {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0] || '', 'hex')
  const encryptedText = parts[1] || ''
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key || '', 'hex'), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export interface NotionPage {
  id: string
  created_time: string
  last_edited_time: string
  properties: Record<string, any>
  url: string
}

export interface NotionBlock {
  id: string
  type: string
  [key: string]: any
}

export class NotionService {
  private accessToken: string

  constructor(accessToken: string, encryptionKey: string) {
    this.accessToken = decrypt(accessToken, encryptionKey)
  }

  async searchPages(query?: string): Promise<NotionPage[]> {
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query || '',
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 50
      })
    })

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []
  }

  async getPageContent(pageId: string): Promise<NotionBlock[]> {
    const response = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get page content: ${response.statusText}`)
    }

    const data = await response.json()
    return data.results || []
  }

  extractTextFromBlocks(blocks: NotionBlock[]): string {
    return blocks
      .map(block => {
        if (block.type === 'paragraph' && block.paragraph?.rich_text) {
          return block.paragraph.rich_text.map((text: any) => text.plain_text).join('')
        }
        if (block.type === 'heading_1' && block.heading_1?.rich_text) {
          return block.heading_1.rich_text.map((text: any) => text.plain_text).join('')
        }
        if (block.type === 'heading_2' && block.heading_2?.rich_text) {
          return block.heading_2.rich_text.map((text: any) => text.plain_text).join('')
        }
        if (block.type === 'heading_3' && block.heading_3?.rich_text) {
          return block.heading_3.rich_text.map((text: any) => text.plain_text).join('')
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }
}

export async function getNotionService(userId: string): Promise<NotionService | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'notion')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for secure token storage')
  }
  const encryptionKey = process.env.ENCRYPTION_KEY

  return new NotionService(
    data.access_token_encrypted,
    encryptionKey
  )
}

























