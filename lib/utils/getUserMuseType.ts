/**
 * Get user's selected muse type from database
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import type { MuseType } from '@/lib/ai/muse-personalities'

export async function getUserMuseType(userId: string): Promise<MuseType> {
  try {
    const supabase = createServerSupabaseClient()

    // Try to get from user_preferences first
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('muse_type')
      .eq('user_id', userId)
      .single()

    if (preferences?.muse_type) {
      return preferences.muse_type as MuseType
    }

    // Fallback: try to get from initialization status
    const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/initialization/status`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      if (statusData.museType) {
        return statusData.museType as MuseType
      }
    }

    // Default to synthesis if nothing found
    return 'synthesis'
  } catch (error) {
    console.error('Error getting user muse type:', error)
    return 'synthesis' // Default fallback
  }
}

/**
 * Get user's muse type from client-side preferences
 */
export async function getClientMuseType(): Promise<MuseType> {
  try {
    const response = await fetch('/api/initialization/status')
    const data = await response.json()
    return (data.museType || 'synthesis') as MuseType
  } catch (error) {
    console.error('Error getting muse type:', error)
    return 'synthesis'
  }
}
