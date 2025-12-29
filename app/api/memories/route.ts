import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memoryId = searchParams.get('id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const sourceType = searchParams.get('source_type')
    const requestCount = searchParams.get('count') === 'true'

    // If ID provided, return single memory
    if (memoryId) {
      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          data_sources (
            source_type,
            source_name
          )
        `)
        .eq('id', memoryId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      return NextResponse.json({ memory: data })
    }

    let query = supabase
      .from('memories')
      .select(`
        *,
        data_sources (
          source_type,
          source_name
        )
      `)
      .eq('user_id', user.id)

    // Filter by date range
    if (startDate) {
      query = query.gte('temporal_marker', startDate)
    }
    if (endDate) {
      query = query.lte('temporal_marker', endDate)
    }

    // Filter by source type (need to join properly)
    if (sourceType && sourceType !== 'all') {
      // First get data source IDs for this source type
      const { data: sources } = await supabase
        .from('data_sources')
        .select('id')
        .eq('user_id', user.id)
        .eq('source_type', sourceType)
      
      if (sources && sources.length > 0) {
        const sourceIds = sources.map((s: { id: string }) => s.id)
        query = query.in('data_source_id', sourceIds)
      } else {
        // No sources of this type, return empty
        return NextResponse.json({ memories: [] })
      }
    }

    query = query.order('temporal_marker', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If count requested, get total count
    let totalCount = null
    if (requestCount) {
      const { count, error: countError } = await supabase
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (!countError) {
        totalCount = count
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const response: any = { memories: data }
    if (totalCount !== null) {
      response.count = totalCount
    }

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

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

    const memoryData = await request.json()
    
    // Check if this is user's first memory
    const { count: existingCount } = await supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    const isFirstMemory = (existingCount || 0) === 0
    
    const { data, error } = await supabase
      .from('memories')
      .insert({
        ...memoryData,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      memory: data,
      isFirstMemory: isFirstMemory,
      onboardingEvent: isFirstMemory ? 'memoryImported' : null
    })
  } catch (error: any) {
    console.error('Memories POST API error:', error)
    
    let errorMessage = 'Failed to save memory.'
    if (error.message?.includes('unauthorized') || error.message?.includes('auth')) {
      errorMessage = 'Authentication required. Please refresh the page.'
    } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      errorMessage = 'Invalid memory data. Please check your input and try again.'
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memoryId = searchParams.get('id')

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    const updateData = await request.json()

    const { data, error } = await supabase
      .from('memories')
      .update({
        content: updateData.content,
        themes: updateData.themes || [],
        emotional_tags: updateData.emotional_tags || [],
        temporal_marker: updateData.temporal_marker,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ memory: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memoryId = searchParams.get('id')

    if (!memoryId) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

