import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let version: string | undefined
    try {
      const body = await request.json().catch(() => null)
      if (body && typeof body.version === 'string') version = body.version
    } catch {
      // ignore
    }

    const demoFilter = version
      ? { demo: { isDemo: true, source: 'demo_dataset', version } }
      : { demo: { isDemo: true, source: 'demo_dataset' } }

    const { count: memoriesDeleted, error: memErr } = await supabase
      .from('memories')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .contains('extracted_data', demoFilter)

    if (memErr) {
      console.error('Demo clear memories error:', memErr)
      return NextResponse.json({ error: 'Failed to clear demo memories' }, { status: 500 })
    }

    // Best-effort: clear patterns too (even if dataset didn't create any yet).
    const { count: patternsDeleted, error: patErr } = await supabase
      .from('memory_patterns')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .contains('pattern_data', demoFilter)

    if (patErr) {
      // Don't fail the whole request if patterns can't be deleted (table might be empty / filter unsupported)
      console.warn('Demo clear patterns warning:', patErr)
    }

    return NextResponse.json({
      success: true,
      version: version || null,
      deleted: {
        memories: memoriesDeleted || 0,
        patterns: patternsDeleted || 0
      }
    })
  } catch (error: any) {
    console.error('Demo clear error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while clearing demo data' },
      { status: 500 }
    )
  }
}














