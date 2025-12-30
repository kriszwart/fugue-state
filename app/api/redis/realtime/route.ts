/**
 * Real-time Updates API
 * Server-Sent Events for live updates
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { pubsub } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') || `user:${user.id}`

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', channel })}\n\n`)
      )

      // Create Redis subscriber
      const subscriber = pubsub.createSubscriber()
      
      await subscriber.subscribe(channel)
      
      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const data = JSON.parse(message)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            )
          } catch (error) {
            console.error('[SSE] Error parsing message:', error)
          }
        }
      })

      // Keep connection alive
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        subscriber.unsubscribe()
        subscriber.quit()
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
























