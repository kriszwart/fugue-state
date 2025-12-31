import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { museType, memoryId, firstScan, action } = await request.json().catch(() => ({}))

    if (!memoryId || !firstScan || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: memoryId, firstScan, action' },
        { status: 400 }
      )
    }

    console.log('[Auto-Create] Action:', action, 'Memory:', memoryId, 'Muse:', museType)

    const artefacts: any = {}

    if (action === 'visualise' && firstScan.visualise?.imagePrompts?.[0]) {
      const prompt = firstScan.visualise.imagePrompts[0]
      const { data: imageArtefact } = await supabase
        .from('artefacts')
        .insert({
          user_id: user.id,
          memory_id: memoryId,
          artefact_type: 'image',
          title: 'Visual Interpretation',
          description: prompt,
          metadata: { kind: 'visualise', action, prompt, visualise: firstScan.visualise },
          generation_model: 'synthesis-muse',
          generation_prompt: prompt
        })
        .select()
        .single()

      if (imageArtefact) artefacts.imageArtefact = imageArtefact
    } else if (action === 'reflect') {
      const text = `# Deep Reflection

## Core Truths
${firstScan.reflect?.truths?.map((t: string) => `- ${t}`).join('\n') || 'None'}

## Tensions
${firstScan.reflect?.tensions?.map((t: string) => `- ${t}`).join('\n') || 'None'}

## Questions
${firstScan.reflect?.questions?.map((q: string) => `- ${q}`).join('\n') || 'None'}

## Missing Ideas
${firstScan.reflect?.missingIdeas?.map((i: string) => `- ${i}`).join('\n') || 'None'}`

      const { data: textArtefact } = await supabase
        .from('artefacts')
        .insert({
          user_id: user.id,
          memory_id: memoryId,
          artefact_type: 'text',
          title: 'Deep Reflection',
          description: 'Psychological insights',
          metadata: { kind: 'reflect', action, reflect: firstScan.reflect, content: text },
          generation_model: 'synthesis-muse',
          generation_prompt: 'Deep reflection'
        })
        .select()
        .single()

      if (textArtefact) {
        artefacts.poemArtefact = textArtefact
        artefacts.poemText = text
      }
    } else if (action === 'recompose') {
      const text = firstScan.recompose?.outline || firstScan.recompose?.emailDraft || ''
      const { data: textArtefact } = await supabase
        .from('artefacts')
        .insert({
          user_id: user.id,
          memory_id: memoryId,
          artefact_type: 'text',
          title: 'Recomposed Content',
          description: 'Creative reinterpretation',
          metadata: { kind: 'recompose', action, recompose: firstScan.recompose, content: text },
          generation_model: 'synthesis-muse',
          generation_prompt: 'Recompose'
        })
        .select()
        .single()

      if (textArtefact) {
        artefacts.poemArtefact = textArtefact
        artefacts.poemText = text
      }
    } else if (action === 'curate') {
      const data = { tags: firstScan.curate?.tags || [], quotes: firstScan.curate?.quotes || [], collections: firstScan.curate?.collections || [] }
      const { data: collectionArtefact } = await supabase
        .from('artefacts')
        .insert({
          user_id: user.id,
          memory_id: memoryId,
          artefact_type: 'collection',
          title: 'Curated Collection',
          description: 'Organized themes',
          metadata: { kind: 'curate', action, curate: firstScan.curate, collection: data },
          generation_model: 'synthesis-muse',
          generation_prompt: 'Curate'
        })
        .select()
        .single()

      if (collectionArtefact) {
        artefacts.collectionArtefact = collectionArtefact
        artefacts.collection = data
      }
    }

    return NextResponse.json({ success: true, action, ...artefacts })
  } catch (error: any) {
    console.error('[Auto-Create] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
