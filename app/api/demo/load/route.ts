import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

type DemoDataset = {
  version: string
  memories: Array<{
    key?: string
    content: string
    content_type?: 'text' | 'image' | 'audio' | 'video' | 'document'
    temporal_marker?: string | null
    extracted_data?: Record<string, any>
  }>
}

function safeIsoOrNull(value: unknown): string | null {
  if (!value) return null
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // optional body for forward-compat (ignore unknown)
    let requestedVersion: string | undefined
    try {
      const body = await request.json().catch(() => null)
      if (body && typeof body.version === 'string') requestedVersion = body.version
    } catch {
      // ignore
    }

    const datasetPath = path.join(process.cwd(), 'public', 'demo', 'demo_dataset.v1.json')
    const datasetRaw = await readFile(datasetPath, 'utf8')
    const dataset = JSON.parse(datasetRaw) as DemoDataset

    const version = requestedVersion || dataset.version || 'v1'
    if (!dataset || !Array.isArray(dataset.memories)) {
      return NextResponse.json({ error: 'Invalid demo dataset format' }, { status: 500 })
    }

    // Best-effort idempotency: if dataset is already loaded, avoid duplicating.
    try {
      const { count, error } = await supabase
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .contains('extracted_data', { demo: { isDemo: true, source: 'demo_dataset', version } })

      if (!error && (count || 0) > 0) {
        return NextResponse.json({
          success: true,
          alreadyLoaded: true,
          version,
          inserted: 0
        })
      }
    } catch {
      // ignore and proceed to insert
    }

    const loadedAt = new Date().toISOString()
    const rows = dataset.memories.map((m) => {
      const temporal_marker = safeIsoOrNull(m.temporal_marker)
      const content_type = m.content_type || 'text'

      return {
        user_id: user.id,
        data_source_id: null,
        content: String(m.content || ''),
        content_type,
        temporal_marker,
        emotional_tags: [],
        themes: [],
        extracted_data: {
          ...(m.extracted_data || {}),
          demo: {
            ...((m.extracted_data && (m.extracted_data as any).demo) || {}),
            isDemo: true,
            source: 'demo_dataset',
            version,
            loadedAt
          },
          demo_key: m.key || null
        }
      }
    }).filter((r) => r.content.trim().length > 0)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Demo dataset is empty' }, { status: 500 })
    }

    // Insert in one batch (small dataset). If this grows, we can chunk.
    const { data, error: insertError } = await supabase
      .from('memories')
      .insert(rows)
      .select('id')

    if (insertError) {
      console.error('Demo load insert error:', insertError)
      return NextResponse.json({ error: 'Failed to load demo dataset' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      alreadyLoaded: false,
      version,
      inserted: data?.length || rows.length
    })
  } catch (error: any) {
    console.error('Demo load error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while loading demo data' },
      { status: 500 }
    )
  }
}














