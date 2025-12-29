import { createServerSupabaseClient } from '@/lib/supabase'
import crypto from 'crypto'

// Simple decryption (in production, use proper encryption)
function decrypt(encrypted: string, key: string): string {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body: {
      data?: string
    }
    parts?: Array<{
      mimeType: string
      body: {
        data?: string
      }
    }>
  }
  internalDate: string
}

export class GmailService {
  private accessToken: string
  private refreshToken: string
  private encryptionKey: string

  constructor(accessToken: string, refreshToken: string, encryptionKey: string) {
    this.accessToken = decrypt(accessToken, encryptionKey)
    this.refreshToken = decrypt(refreshToken, encryptionKey)
    this.encryptionKey = encryptionKey
  }

  async getMessages(maxResults: number = 50): Promise<GmailMessage[]> {
    // First, get message list
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    )

    if (!listResponse.ok) {
      if (listResponse.status === 401) {
        // Token expired, refresh it
        await this.refreshAccessToken()
        return this.getMessages(maxResults)
      }
      throw new Error(`Gmail API error: ${listResponse.statusText}`)
    }

    const listData = await listResponse.json()
    const messageIds = listData.messages?.map((m: { id: string }) => m.id) || []

    // Fetch full message details
    const messages = await Promise.all(
      messageIds.map(async (id: string) => {
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`
            }
          }
        )

        if (!messageResponse.ok) {
          return null
        }

        return await messageResponse.json()
      })
    )

    return messages.filter((m): m is GmailMessage => m !== null)
  }

  private async refreshAccessToken(): Promise<void> {
    const { getGoogleOAuthHandler } = await import('@/lib/oauth/google')
    const googleOAuth = getGoogleOAuthHandler()
    const tokens = await googleOAuth.refreshAccessToken(this.refreshToken)
    this.accessToken = tokens.access_token

    // Update in database
    const supabase = createServerSupabaseClient()
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure token storage')
    }
    const encryptionKey = process.env.ENCRYPTION_KEY
    
    // Note: In production, you'd need to know the user_id and data_source_id
    // This is a simplified version
  }

  extractTextContent(message: GmailMessage): string {
    let text = ''

    // Get subject and from headers
    const headers = message.payload.headers
    const subject = headers.find(h => h.name === 'Subject')?.value || ''
    const from = headers.find(h => h.name === 'From')?.value || ''

    text += `Subject: ${subject}\n`
    text += `From: ${from}\n\n`

    // Extract body text
    if (message.payload.body?.data) {
      text += Buffer.from(message.payload.body.data, 'base64').toString('utf-8')
    } else if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text += Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    }

    return text
  }
}

export async function getGmailService(userId: string): Promise<GmailService | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'gmail')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for secure token storage')
  }
  const encryptionKey = process.env.ENCRYPTION_KEY

  return new GmailService(
    data.access_token_encrypted,
    data.refresh_token_encrypted || '',
    encryptionKey
  )
}













