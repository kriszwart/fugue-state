import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getLLMService } from '@/lib/ai/llm-service'
import { getContextManager } from '@/lib/ai/context-manager'
import { rateLimit, analytics, streams, pubsub } from '@/lib/redis'
import { getCachedLLMResponse, cacheLLMResponse, getCachedContext, cacheContext } from '@/lib/redis/cache-layer'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { message, conversationId, museType } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Rate limiting with Redis (skip if unavailable)
    try {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      const rateLimitKey = `chat:${user.id}:${ip}`
      const rateLimitResult = await rateLimit.check(rateLimitKey, 60, 60) // 60 requests per minute
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.reset
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString()
            }
          }
        )
      }

      // Track analytics
      await analytics.trackEvent('chat_message', user.id, { conversationId, hasMessage: !!message })
    } catch (error) {
      // Redis unavailable - skip rate limiting and analytics
      console.warn('[Chat] Redis unavailable, skipping rate limit:', error)
    }

    // Get user's default muse type if not specified
    let defaultMuseType = museType || 'analyst'
    if (!museType) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('muse_type')
        .eq('id', user.id)
        .single()
      
      if (userProfile?.muse_type) {
        defaultMuseType = userProfile.muse_type
      }
    }

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50),
          muse_type: defaultMuseType
        })
        .select()
        .single()

      if (convError || !newConv) {
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }

      convId = newConv.id
    }

    // Save user message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'user',
        content: message
      })

    if (msgError) {
      console.error('Error saving user message:', msgError)
    }

    // Build context (check cache first if Redis available)
    let context
    try {
      context = await getCachedContext(user.id, convId, message)
    } catch (error) {
      console.warn('[Chat] Cache check failed:', error)
      context = null
    }

    if (!context) {
      const contextManager = getContextManager()
      context = await contextManager.buildContext(user.id, convId, message)
      
      // Cache if Redis available
      try {
        await cacheContext(user.id, convId, message, context)
      } catch (error) {
        console.warn('[Chat] Cache write failed:', error)
      }
    }

    // Check for cached LLM response (for identical messages)
    const llmOptions = {
      modelType: 'chat',
      temperature: 0.7,
      maxTokens: 400, // Allow more detailed, contextual responses
      userId: user.id
    }
    
    let response
    try {
      response = await getCachedLLMResponse(context.messages, llmOptions)
    } catch (error) {
      console.warn('[Chat] LLM cache check failed:', error)
      response = null
    }
    
    if (!response) {
      // Get LLM service and generate response
      const llmService = getLLMService()
      response = await llmService.generateResponse(
        context.messages,
        {
          modelType: 'chat',
          temperature: 0.7,
          maxTokens: 400 // Allow more detailed, contextual responses
        }
      )
      
      // Cache the response if Redis available
      try {
        await cacheLLMResponse(context.messages, llmOptions, response, 3600)
      } catch (error) {
        console.warn('[Chat] LLM cache write failed:', error)
      }
    }

    // Add to Redis stream for real-time features (if available)
    try {
      await streams.addChatMessage(convId, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      })
      
      await streams.addChatMessage(convId, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      })

      // Publish real-time update
      await pubsub.publish(`chat:${convId}`, {
        type: 'new_message',
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.warn('[Chat] Redis streams unavailable:', error)
    }

    // Save assistant message
    const { error: assistantMsgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role: 'assistant',
        content: response.content,
        model_used: response.model,
        metadata: {
          provider: response.provider,
          usage: response.usage
        }
      })

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId)

    // Check if this is user's first chat message
    const { count: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)
      .eq('role', 'user')
    
    const isFirstChat = (messageCount || 0) === 1

    return NextResponse.json({
      response: response.content,
      conversationId: convId,
      model: response.model,
      provider: response.provider,
      isFirstChat: isFirstChat,
      onboardingEvent: isFirstChat ? 'chatMessageSent' : null
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'An error occurred while processing your message.'
    if (error.message?.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment before sending another message.'
    } else if (error.message?.includes('unauthorized') || error.message?.includes('auth')) {
      errorMessage = 'Session expired. Please refresh the page and try again.'
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.'
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}

// Streaming endpoint using Server-Sent Events (SSE)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams
  const message = searchParams.get('message')
  const conversationId = searchParams.get('conversationId')
  const museType = searchParams.get('museType')

  if (!message) {
    return NextResponse.json(
      { error: 'Message is required' },
      { status: 400 }
    )
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const rateLimitKey = `chat:${user.id}:${ip}`
  const rateLimitResult = await rateLimit.check(rateLimitKey, 60, 60)

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset
      },
      { status: 429 }
    )
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Track analytics
        await analytics.trackEvent('chat_message_stream', user.id, { conversationId, hasMessage: !!message })

        // Get user's default muse type
        let defaultMuseType = museType || 'analyst'
        if (!museType) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('muse_type')
            .eq('id', user.id)
            .single()

          if (userProfile?.muse_type) {
            defaultMuseType = userProfile.muse_type
          }
        }

        // Get or create conversation
        let convId = conversationId
        if (!convId) {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              user_id: user.id,
              title: message.substring(0, 50),
              muse_type: defaultMuseType
            })
            .select()
            .single()

          if (convError || !newConv) {
            throw new Error('Failed to create conversation')
          }

          convId = newConv.id

          // Send conversation ID to client
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'conversation', id: convId })}\n\n`)
          )
        }

        // Save user message
        await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
            role: 'user',
            content: message
          })

        // Build context
        const contextManager = getContextManager()
        const context = await contextManager.buildContext(user.id, convId, message)

        // Stream LLM response
        const llmService = getLLMService()
        let fullResponse = ''
        let modelUsed = ''

        for await (const chunk of llmService.generateStreamingResponse(
          context.messages,
          {
            modelType: 'chat',
            temperature: 0.7,
            maxTokens: 400 // Allow more detailed, contextual responses
          }
        )) {
          if (chunk.model) {
            modelUsed = chunk.model
          }

          if (!chunk.done && chunk.content) {
            fullResponse += chunk.content

            // Send chunk to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk.content })}\n\n`)
            )
          }

          if (chunk.done) {
            // Send completion event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done', model: modelUsed })}\n\n`)
            )
          }
        }

        // Save assistant message
        await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
            role: 'assistant',
            content: fullResponse,
            model_used: modelUsed,
            metadata: {
              provider: 'huggingface'
            }
          })

        // Add to Redis stream
        await streams.addChatMessage(convId, {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        })

        await streams.addChatMessage(convId, {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString()
        })

        // Publish real-time update
        await pubsub.publish(`chat:${convId}`, {
          type: 'new_message',
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString()
        })

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId)

        controller.close()
      } catch (error: any) {
        console.error('Streaming error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        )
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
