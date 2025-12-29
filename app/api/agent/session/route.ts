import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

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

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      )
    }

    const { prompt } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    // Create ElevenLabs Agent session with tool definitions
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const agentConfig = {
      name: 'Dameris',
      description: 'A voice muse that helps you explore your memories and discover missing ideas.',
      prompt: `You are Dameris, a thoughtful and insightful voice muse. Your role is to help users explore their digital memories, discover patterns, and find the ideas they keep circling but haven't fully articulated.

You have access to tools to:
- sync: Import new memories from Gmail or Drive
- search_memories: Search through the user's existing memories
- analyze: Analyze memories to find patterns, themes, and missing ideas

When a user asks about their memories or asks you to find something:
1. First, check if you need to search or analyze their existing memories
2. Reference specific quotes or themes from their memories when responding
3. Be warm, contemplative, and insightful
4. Help them discover the connections they haven't seen yet

Speak naturally and conversationally. Use the user's actual memories to ground your insights.`,
      tools: [
        {
          name: 'sync',
          description: 'Import new memories from Gmail or Drive',
          parameters: {
            type: 'object',
            properties: {
              source_type: {
                type: 'string',
                enum: ['gmail', 'drive'],
                description: 'The data source to sync from'
              }
            },
            required: ['source_type']
          },
          url: `${appUrl}/api/agent/tools/sync`,
          method: 'POST'
        },
        {
          name: 'search_memories',
          description: 'Search through the user\'s memories for specific content or themes',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default 5)'
              }
            },
            required: ['query']
          },
          url: `${appUrl}/api/agent/tools/search-memories`,
          method: 'POST'
        },
        {
          name: 'analyze',
          description: 'Analyze memories to find patterns, themes, emotions, and missing ideas',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of recent memories to analyze (default 20)'
              }
            }
          },
          url: `${appUrl}/api/agent/tools/analyze`,
          method: 'POST'
        }
      ],
      voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      language: 'en'
    }

    // Note: This is a placeholder. The actual ElevenLabs Agents API
    // is still in development. For now, we return the configuration
    // that the frontend can use to initialize the agent.

    // In production, this would create a session with ElevenLabs:
    // const response = await fetch('https://api.elevenlabs.io/v1/agents/sessions', {
    //   method: 'POST',
    //   headers: {
    //     'xi-api-key': apiKey,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(agentConfig)
    // })

    return NextResponse.json({
      success: true,
      agentConfig,
      message: 'Agent configuration ready. Frontend should initialize ElevenLabs Agent SDK with this config.'
    })
  } catch (error: any) {
    console.error('Agent session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create agent session' },
      { status: 500 }
    )
  }
}

// GET endpoint to check agent status
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    agent: {
      name: 'Dameris',
      status: 'ready',
      capabilities: ['sync', 'search_memories', 'analyze']
    }
  })
}
