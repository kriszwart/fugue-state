import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getToolhouseService } from '@/lib/data-sources/toolhouse'

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

    const { agentUrl, agentType, sourceName } = await request.json()

    if (!agentUrl) {
      return NextResponse.json(
        { error: 'Agent URL is required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(agentUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid agent URL format' },
        { status: 400 }
      )
    }

    const toolhouseService = getToolhouseService()

    // Connect to agent/MCP
    const connection = await toolhouseService.connectAgent(
      agentUrl,
      agentType || 'agent'
    )

    // Store data source record
    const { data: dataSource, error: dataSourceError } = await supabase
      .from('data_sources')
      .upsert({
        user_id: user.id,
        source_type: 'mcp',
        source_name: sourceName || `Agent: ${new URL(agentUrl).hostname}`,
        metadata: {
          agent_url: agentUrl,
          agent_type: agentType || 'agent',
          connection_data: connection,
          connected_at: new Date().toISOString()
        },
        is_active: true,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,source_type'
      })
      .select()
      .single()

    if (dataSourceError) {
      console.error('Error storing agent connection:', dataSourceError)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to agent',
      connection,
      dataSource
    })
  } catch (error: any) {
    console.error('Agent connection error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to connect to agent' },
      { status: 500 }
    )
  }
}
























