/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/ai/llm-service', () => ({
  getLLMService: () => ({
    generateResponse: jest
      .fn()
      .mockResolvedValueOnce({
        content: 'line 1\nline 2\nline 3',
        model: 'm1',
        provider: 'vertex',
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          name: 'Collected Sparks',
          description: 'A small shrine of fragments.',
          items: ['a', 'b', 'c', 'd', 'e', 'f'],
        }),
        model: 'm2',
        provider: 'vertex',
      }),
  }),
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

describe('POST /api/muse/auto-create', () => {
  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        image: 'data:image/png;base64,xxx',
        artefact: { id: 'img-1', file_url: 'https://example.com/img.png' },
      }),
    }))
  })

  test('creates poem + collection artefacts and triggers image generation', async () => {
    const memoriesQuery = {
      select: jest.fn(() => memoriesQuery),
      eq: jest.fn(() => memoriesQuery),
      single: jest.fn(async () => ({ data: { id: 'mem-1', content: 'Hello memory' }, error: null })),
    }

    const artefactsInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(async () => ({ data: { id: 'a-1' }, error: null })),
      })),
    }))

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table === 'memories') return memoriesQuery
        if (table === 'artefacts') return { insert: artefactsInsert }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/muse/auto-create',
      headers: new Headers({ cookie: 'sb-session=1' }),
      json: async () => ({ memoryId: 'mem-1', museType: 'narrator', firstScan: { visualise: { imagePrompts: ['Prompt A'] }, curate: { quotes: [], tags: [] } } }),
    }

    const { POST } = require('../app/api/muse/auto-create/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.poemText).toContain('line')
    expect(json.collection.name).toBe('Collected Sparks')
    expect(global.fetch).toHaveBeenCalled()
    expect(artefactsInsert).toHaveBeenCalledTimes(2)
  })
})















