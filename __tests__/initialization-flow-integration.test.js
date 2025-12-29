/** @jest-environment node */

/**
 * Integration test for the full initialization → first-scan → auto-create → voice flow
 * Tests the happy path and error handling
 */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/ai/memory-analyzer', () => ({
  getMemoryAnalyzer: () => ({
    analyzeMemories: jest.fn(async () => ({
      emotionalPatterns: ['excited'],
      themes: ['new beginnings'],
      narrative: 'Starting fresh',
      insights: ['Clean slate'],
      missingIdeas: [],
    })),
  }),
}))

jest.mock('@/lib/ai/llm-service', () => ({
  getLLMService: () => ({
    generateResponse: jest
      .fn()
      // First-scan response
      .mockResolvedValueOnce({
        content: JSON.stringify({
          muse: 'synthesis',
          briefing: 'I see excitement for new beginnings. What will you create first?',
          reflect: { truths: ['Fresh start'], tensions: [], questions: [], missingIdeas: [] },
          recompose: { emailDraft: '', tweetThread: '', outline: '' },
          visualise: { imagePrompts: ['Sunrise over blank canvas'], palette: [], storyboardBeats: [] },
          curate: { tags: ['beginning'], quotes: ['Start fresh'], collections: [] },
          nextActions: ['Begin creating'],
        }),
        model: 'm1',
        provider: 'vertex',
      })
      // Poem response (auto-create)
      .mockResolvedValueOnce({
        content: 'Dawn breaks\nCanvas waits\nBegin',
        model: 'm2',
        provider: 'vertex',
      })
      // Collection response (auto-create)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          name: 'Fresh Starts',
          description: 'New beginnings collection',
          items: ['Dawn', 'Canvas', 'Begin', 'Create', 'Hope', 'Light'],
        }),
        model: 'm3',
        provider: 'vertex',
      }),
  }),
}))

jest.mock('@/lib/generation/image-service', () => ({
  getImageGenerationService: () => ({
    generateImage: jest.fn(async () => ({
      image: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      metadata: { model: 'img-model' },
    })),
  }),
}))

jest.mock('@/lib/redis/cache-layer', () => ({
  getCachedImageGeneration: jest.fn(async () => null),
  cacheImageGeneration: jest.fn(async () => null),
}))

jest.mock('@/lib/redis', () => ({
  analytics: { trackEvent: jest.fn(async () => null) },
  sortedSets: { increment: jest.fn(async () => null) },
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

describe('Initialization Flow Integration', () => {
  let supabase

  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()

    // Common user auth
    const authMock = {
      getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    }

    // Memories query
    const memoriesQuery = {
      select: jest.fn(() => memoriesQuery),
      eq: jest.fn(() => memoriesQuery),
      order: jest.fn(() => memoriesQuery),
      limit: jest.fn(async () => ({
        data: [{ id: 'mem-1', content: 'First note', themes: [], emotional_tags: [], created_at: new Date().toISOString() }],
        error: null,
      })),
      single: jest.fn(async () => ({
        data: { id: 'mem-1', content: 'First note', themes: [], emotional_tags: [] },
        error: null,
      })),
    }

    // Artefacts insert
    const artefactsInsert = jest.fn((data) => ({
      select: jest.fn(() => ({
        single: jest.fn(async () => ({ data: { id: `art-${Date.now()}`, ...data }, error: null })),
      })),
    }))

    const artefactsSelect = jest.fn(() => ({
      eq: jest.fn(async () => ({ count: 0 })),
    }))

    // Storage mock
    const storageMock = {
      from: jest.fn(() => ({
        upload: jest.fn(async () => ({ data: { path: 'test.png' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.png' } })),
      })),
    }

    supabase = {
      auth: authMock,
      storage: storageMock,
      from: jest.fn((table) => {
        if (table === 'memories') return memoriesQuery
        if (table === 'artefacts') return { insert: artefactsInsert, select: artefactsSelect }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    createServerSupabaseClient.mockReturnValue(supabase)
  })

  test('full happy path: first-scan → auto-create returns all artefacts', async () => {
    // Step 1: First scan
    const { POST: firstScanPOST } = require('../app/api/muse/first-scan/route')
    const scanReq = {
      json: async () => ({ museType: 'synthesis', memoryId: 'mem-1', limit: 8 }),
      headers: new Headers(),
    }
    const scanRes = await firstScanPOST(scanReq)
    const scanJson = await scanRes.json()

    expect(scanRes.status).toBe(200)
    expect(scanJson.result.briefing).toBeTruthy()

    // Step 2: Auto-create using first-scan result
    const { POST: autoCreatePOST } = require('../app/api/muse/auto-create/route')
    const createReq = {
      url: 'http://localhost/api/muse/auto-create',
      headers: new Headers(),
      json: async () => ({
        museType: 'synthesis',
        memoryId: 'mem-1',
        firstScan: scanJson.result,
      }),
    }

    // Mock fetch for image generation
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        image: 'data:image/png;base64,xxx',
        artefact: { id: 'img-1', file_url: 'https://example.com/img.png' },
      }),
    }))

    const createRes = await autoCreatePOST(createReq)
    const createJson = await createRes.json()

    expect(createRes.status).toBe(200)
    expect(createJson.success).toBe(true)
    expect(createJson.poemArtefact).toBeTruthy()
    expect(createJson.collectionArtefact).toBeTruthy()
    expect(createJson.imageArtefact).toBeTruthy()
    expect(createJson.poemText).toContain('Dawn')
    expect(createJson.collection.name).toBe('Fresh Starts')
    expect(createJson.image).toBeTruthy()
  })

  test('handles first-scan error gracefully', async () => {
    // Mock error in memories query
    supabase.from = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(async () => ({ data: null, error: { message: 'DB error' } })),
          })),
        })),
      })),
    }))

    const { POST } = require('../app/api/muse/first-scan/route')
    const req = {
      json: async () => ({ museType: 'synthesis', limit: 8 }),
      headers: new Headers(),
    }
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeTruthy()
  })

  test('handles auto-create error when memory not found', async () => {
    // Mock memory not found
    supabase.from = jest.fn((table) => {
      if (table === 'memories') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({ data: null, error: { message: 'Not found' } })),
              })),
            })),
          })),
        }
      }
      throw new Error(`unexpected table ${table}`)
    })

    const { POST } = require('../app/api/muse/auto-create/route')
    const req = {
      url: 'http://localhost/api/muse/auto-create',
      headers: new Headers(),
      json: async () => ({
        museType: 'synthesis',
        memoryId: 'nonexistent',
        firstScan: {},
      }),
    }

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/memory not found/i)
  })
})
