import { createServerSupabaseClient } from '@/lib/supabase'
import crypto from 'crypto'

function decrypt(encrypted: string, key: string): string {
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
  webViewLink?: string
  webContentLink?: string
}

export class DriveService {
  private accessToken: string
  private refreshToken: string
  private encryptionKey: string

  constructor(accessToken: string, refreshToken: string, encryptionKey: string) {
    this.accessToken = decrypt(accessToken, encryptionKey)
    this.refreshToken = decrypt(refreshToken, encryptionKey)
    this.encryptionKey = encryptionKey
  }

  async listFiles(maxResults: number = 50): Promise<DriveFile[]> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,webContentLink)`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        await this.refreshAccessToken()
        return this.listFiles(maxResults)
      }
      throw new Error(`Drive API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.files || []
  }

  async getFileContent(fileId: string, mimeType?: string): Promise<string> {
    // Check if this is a Google Docs file that needs to be exported
    const googleDocsMimeTypes: Record<string, string> = {
      'application/vnd.google-apps.document': 'text/plain',
      'application/vnd.google-apps.spreadsheet': 'text/csv',
      'application/vnd.google-apps.presentation': 'text/plain'
    }

    let url: string
    if (mimeType && googleDocsMimeTypes[mimeType]) {
      // Use export API for Google Docs
      const exportMimeType = googleDocsMimeTypes[mimeType]
      url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`
    } else if (mimeType && mimeType.startsWith('application/vnd.google-apps.')) {
      // Skip other Google Workspace files (drawings, forms, sites, etc.)
      throw new Error(`Unsupported Google Workspace file type: ${mimeType}`)
    } else {
      // Use standard download for regular files
      url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    }

    const fileResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!fileResponse.ok) {
      if (fileResponse.status === 401) {
        await this.refreshAccessToken()
        return this.getFileContent(fileId, mimeType)
      }
      throw new Error(`Failed to get file content: ${fileResponse.statusText}`)
    }

    return await fileResponse.text()
  }

  private async refreshAccessToken(): Promise<void> {
    const { getGoogleOAuthHandler } = await import('@/lib/oauth/google')
    const googleOAuth = getGoogleOAuthHandler()
    const tokens = await googleOAuth.refreshAccessToken(this.refreshToken)
    this.accessToken = tokens.access_token
  }
}

export async function getDriveService(userId: string): Promise<DriveService | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', userId)
    .eq('source_type', 'drive')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for secure token storage')
  }
  const encryptionKey = process.env.ENCRYPTION_KEY

  return new DriveService(
    data.access_token_encrypted,
    data.refresh_token_encrypted || '',
    encryptionKey
  )
}













