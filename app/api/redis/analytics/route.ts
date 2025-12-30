/**
 * Redis Analytics API
 * Real-time analytics and metrics
 */

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { analytics, sortedSets } from '@/lib/redis'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get various analytics
    const chatMessages = await analytics.getEventCount('chat_message')
    const imageGenerations = await analytics.getEventCount('image_generation')
    const memoryAnalyses = await analytics.getEventCount('memory_analysis')
    
    // Get unique users
    const uniqueChatUsers = await analytics.getUniqueUsers('chat_message')
    const uniqueImageUsers = await analytics.getUniqueUsers('image_generation')

    // Get trending themes (from sorted sets)
    const trendingThemes = await sortedSets.getTop('trending:themes', 10)
    const trendingEmotions = await sortedSets.getTop('trending:emotions', 10)

    return NextResponse.json({
      events: {
        chatMessages,
        imageGenerations,
        memoryAnalyses
      },
      uniqueUsers: {
        chat: uniqueChatUsers,
        images: uniqueImageUsers
      },
      trending: {
        themes: trendingThemes,
        emotions: trendingEmotions
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
























