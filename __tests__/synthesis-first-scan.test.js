/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/ai/memory-analyzer', () => ({
  getMemoryAnalyzer: () => ({
    analyzeMemories: jest.fn(async () => ({
      emotionalPatterns: ['curious'],
      themes: ['identity'],
      connections: [],
      narrative: 'A thread.',
      insights: ['An insight'],
      missingIdeas: ['A missing idea'],
    })),
  }),
}))

jest.mock('@/lib/ai/llm-service', () => ({
  getLLMService: () => ({
    generateResponse: jest.fn(async () => ({
      content: JSON.stringify({
        muse: 'synthesis',
        briefing: 'Here is your briefing. What do you want to make next?',
        reflect: { truths: ['t1', 't2', 't3', 't4', 't5'], tensions: ['x1'], questions: ['q1'], missingIdeas: ['m1'] },
        recompose: { emailDraft: 'email', tweetThread: 'thread', outline: 'outline' },
        visualise: { imagePrompts: ['p1'], palette: ['#000000'], storyboardBeats: ['b1'] },
        curate: { tags: ['tag1'], quotes: ['quote1'], collections: [{ name: 'c', description: 'd', items: ['i1'] }] },
        nextActions: ['Do the thing'],
      }),
      model: 'test-model',
      provider: 'vertex',
    })),
  }),
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

function makeReq(body) {
  return { json: async () => body, headers: new Map([['content-type', 'application/json']]) }
}

describe('POST /api/muse/first-scan', () => {
  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
  })

  test('returns structured synthesis result', async () => {
    const query = {
      eq: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn(async () => ({
        data: [
          {
            id: 'mem-1',
            content: 'hello world',
            themes: [],
            emotional_tags: [],
            temporal_marker: null,
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
      })),
    }

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn(() => ({
        select: jest.fn(() => query),
      })),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const { POST } = require('../app/api/muse/first-scan/route')
    const res = await POST(makeReq({ memoryId: 'mem-1', museType: 'poet' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.result.muse).toBe('synthesis')
    expect(typeof json.result.briefing).toBe('string')
    expect(Array.isArray(json.result.nextActions)).toBe(true)
  })
})


