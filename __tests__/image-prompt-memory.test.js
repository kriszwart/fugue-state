/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

const generateImageMock = jest.fn(async () => ({
  image: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
  metadata: { model: 'img-model' },
}))

jest.mock('@/lib/generation/image-service', () => ({
  getImageGenerationService: () => ({
    generateImage: generateImageMock,
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
const { getImageGenerationService } = require('@/lib/generation/image-service')

describe('POST /api/generate/image prompt+memoryId', () => {
  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
  })

  test('honors explicit prompt when memoryId is also provided', async () => {
    const storage = {
      upload: jest.fn(async () => ({ data: { path: 'x' }, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } })),
    }

    const supabase = {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
      storage: { from: jest.fn(() => storage) },
      from: jest.fn((table) => {
        if (table === 'memories') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(async () => ({
                    data: { content: 'MEMORY_CONTENT', themes: ['t'], emotional_tags: ['e'] },
                    error: null,
                  })),
                })),
              })),
            })),
          }
        }
        if (table === 'artefacts') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(async () => ({ data: { id: 'art-1', file_url: 'https://example.com/file.png' }, error: null })),
              })),
            })),
            select: jest.fn(() => ({
              eq: jest.fn(async () => ({ count: 1 })),
            })),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      json: async () => ({ prompt: 'EXPLICIT_PROMPT', memoryId: 'mem-1', width: 512, height: 512 }),
      headers: new Headers(),
    }

    const { POST } = require('../app/api/generate/image/route')
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(generateImageMock).toHaveBeenCalled()
    const callArgs = generateImageMock.mock.calls[0][0]
    expect(callArgs.prompt).toBe('EXPLICIT_PROMPT')
  })
})


