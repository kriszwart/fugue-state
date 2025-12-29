/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

jest.mock('@/lib/ai/memory-analyzer', () => ({
  getMemoryAnalyzer: () => ({
    analyzeMemories: jest.fn(async () => ({
      emotionalPatterns: ['curious', 'hopeful'],
      themes: ['exploration', 'discovery'],
      narrative: 'A journey of learning',
      insights: ['Growth through challenges'],
      missingIdeas: ['Next steps unclear'],
    })),
  }),
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

describe('POST /api/muse/first-scan - Muse Tone Variations', () => {
  let llmMock

  beforeEach(() => {
    llmMock = jest.fn()

    jest.mock('@/lib/ai/llm-service', () => ({
      getLLMService: () => ({
        generateResponse: llmMock,
      }),
    }))

    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()

    // Setup Supabase mock
    const memoriesQuery = {
      select: jest.fn(() => memoriesQuery),
      eq: jest.fn(() => memoriesQuery),
      order: jest.fn(() => memoriesQuery),
      limit: jest.fn(async () => ({
        data: [
          {
            id: 'mem-1',
            content: 'I discovered a pattern in my work: focus leads to flow.',
            themes: ['focus', 'productivity'],
            emotional_tags: ['determined'],
            temporal_marker: '2025-01-15',
            created_at: '2025-01-15T10:00:00Z',
          },
        ],
        error: null,
      })),
    }

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table === 'memories') return memoriesQuery
        throw new Error(`unexpected table ${table}`)
      }),
    }

    createServerSupabaseClient.mockReturnValue(supabase)
  })

  test('analyst muse produces crisp, pattern-forward briefing', async () => {
    llmMock.mockResolvedValue({
      content: JSON.stringify({
        muse: 'synthesis',
        briefing: 'I found a clear pattern: your work shows structured focus leads to productive flow states. This repeats across 3 data points. What specific triggers enable your focus?',
        reflect: { truths: ['Focus enables flow'], tensions: [], questions: [], missingIdeas: [] },
        recompose: { emailDraft: '', tweetThread: '', outline: '' },
        visualise: { imagePrompts: [], palette: [], storyboardBeats: [] },
        curate: { tags: [], quotes: [], collections: [] },
        nextActions: ['Track focus triggers'],
      }),
      model: 'gemini-1.5-pro',
      provider: 'vertex',
    })

    const req = {
      json: async () => ({ museType: 'analyst', limit: 8 }),
      headers: new Headers(),
    }

    const { POST } = require('../app/api/muse/first-scan/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.result.briefing).toMatch(/pattern|structured|data|specific/i)
    expect(llmMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Tone: crisp, pattern-forward'),
        }),
      ]),
      expect.any(Object)
    )
  })

  test('poet muse produces lyrical, metaphor-forward briefing', async () => {
    llmMock.mockResolvedValue({
      content: JSON.stringify({
        muse: 'synthesis',
        briefing: 'Your mind is a river finding its current—focus becomes the banks that channel your flow into something beautiful. What gentle rituals invite this focused grace?',
        reflect: { truths: ['Flow is grace'], tensions: [], questions: [], missingIdeas: [] },
        recompose: { emailDraft: '', tweetThread: '', outline: '' },
        visualise: { imagePrompts: [], palette: [], storyboardBeats: [] },
        curate: { tags: [], quotes: [], collections: [] },
        nextActions: ['Explore rituals'],
      }),
      model: 'gemini-1.5-pro',
      provider: 'vertex',
    })

    const req = {
      json: async () => ({ museType: 'poet', limit: 8 }),
      headers: new Headers(),
    }

    const { POST } = require('../app/api/muse/first-scan/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.result.briefing).toMatch(/river|current|grace|gentle|beautiful/i)
    expect(llmMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Tone: lyrical, metaphor-forward'),
        }),
      ]),
      expect.any(Object)
    )
  })

  test('visualist muse produces sensory, image-forward briefing', async () => {
    llmMock.mockResolvedValue({
      content: JSON.stringify({
        muse: 'synthesis',
        briefing: 'Picture this: a workspace bathed in morning light, your hands steady on the keyboard, everything else fading to soft blur. That focused state has a visual signature. What does your flow look like in color and composition?',
        reflect: { truths: ['Flow has visual form'], tensions: [], questions: [], missingIdeas: [] },
        recompose: { emailDraft: '', tweetThread: '', outline: '' },
        visualise: { imagePrompts: ['Morning workspace, focused hands, soft background blur'], palette: [], storyboardBeats: [] },
        curate: { tags: [], quotes: [], collections: [] },
        nextActions: ['Visualize flow states'],
      }),
      model: 'gemini-1.5-pro',
      provider: 'vertex',
    })

    const req = {
      json: async () => ({ museType: 'visualist', limit: 8 }),
      headers: new Headers(),
    }

    const { POST } = require('../app/api/muse/first-scan/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.result.briefing).toMatch(/picture|light|visual|color|composition|blur/i)
    expect(llmMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Tone: sensory, cinematic'),
        }),
      ]),
      expect.any(Object)
    )
  })

  test('narrator muse produces cinematic, saga-forward briefing', async () => {
    llmMock.mockResolvedValue({
      content: JSON.stringify({
        muse: 'synthesis',
        briefing: 'In the story of your work, focus acts as the hero discovering flow—a powerful state that transforms ordinary effort into something extraordinary. This chapter shows three decisive moments. What comes next in this saga?',
        reflect: { truths: ['Focus is heroic'], tensions: [], questions: [], missingIdeas: [] },
        recompose: { emailDraft: '', tweetThread: '', outline: '' },
        visualise: { imagePrompts: [], palette: [], storyboardBeats: [] },
        curate: { tags: [], quotes: [], collections: [] },
        nextActions: ['Continue the saga'],
      }),
      model: 'gemini-1.5-pro',
      provider: 'vertex',
    })

    const req = {
      json: async () => ({ museType: 'narrator', limit: 8 }),
      headers: new Headers(),
    }

    const { POST } = require('../app/api/muse/first-scan/route')
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.result.briefing).toMatch(/story|hero|chapter|saga|moment|extraordinary/i)
    expect(llmMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('Tone: cinematic narrator'),
        }),
      ]),
      expect.any(Object)
    )
  })
})
