/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

describe('GET /api/artefacts/recent', () => {
  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
  })

  test('returns recent artefacts created within time window', async () => {
    const now = new Date()
    const recent = new Date(now.getTime() - 30 * 1000) // 30 seconds ago
    const old = new Date(now.getTime() - 120 * 1000) // 2 minutes ago

    const artefactsQuery = {
      select: jest.fn(() => artefactsQuery),
      eq: jest.fn(() => artefactsQuery),
      gte: jest.fn(() => artefactsQuery),
      order: jest.fn(() => artefactsQuery),
      limit: jest.fn(async () => ({
        data: [
          {
            id: 'art-1',
            artefact_type: 'text',
            title: 'Recent Poem',
            metadata: { kind: 'poem', text: 'Test poem' },
            created_at: recent.toISOString(),
          },
          {
            id: 'art-2',
            artefact_type: 'image',
            title: 'Recent Image',
            file_url: 'https://example.com/img.png',
            created_at: recent.toISOString(),
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
        if (table === 'artefacts') return artefactsQuery
        throw new Error(`unexpected table ${table}`)
      }),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/artefacts/recent?limit=10&within=60',
      headers: new Headers(),
    }

    const { GET } = require('../app/api/artefacts/recent/route')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.artefacts).toHaveLength(2)
    expect(json.artefacts[0].metadata.kind).toBe('poem')
    expect(json.artefacts[1].artefact_type).toBe('image')

    // Verify query was called with correct time filter
    expect(artefactsQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String))
  })

  test('respects limit parameter', async () => {
    const artefactsQuery = {
      select: jest.fn(() => artefactsQuery),
      eq: jest.fn(() => artefactsQuery),
      gte: jest.fn(() => artefactsQuery),
      order: jest.fn(() => artefactsQuery),
      limit: jest.fn(async (n) => ({ data: [], error: null })),
    }

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn(() => artefactsQuery),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/artefacts/recent?limit=5&within=300',
      headers: new Headers(),
    }

    const { GET } = require('../app/api/artefacts/recent/route')
    await GET(req)

    expect(artefactsQuery.limit).toHaveBeenCalledWith(5)
  })

  test('clamps limit to max 50', async () => {
    const artefactsQuery = {
      select: jest.fn(() => artefactsQuery),
      eq: jest.fn(() => artefactsQuery),
      gte: jest.fn(() => artefactsQuery),
      order: jest.fn(() => artefactsQuery),
      limit: jest.fn(async (n) => ({ data: [], error: null })),
    }

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn(() => artefactsQuery),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/artefacts/recent?limit=100&within=300',
      headers: new Headers(),
    }

    const { GET } = require('../app/api/artefacts/recent/route')
    await GET(req)

    expect(artefactsQuery.limit).toHaveBeenCalledWith(50)
  })

  test('returns 401 for unauthenticated user', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: null }, error: { message: 'Not authenticated' } })),
      },
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/artefacts/recent?limit=10&within=60',
      headers: new Headers(),
    }

    const { GET } = require('../app/api/artefacts/recent/route')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/unauthorized/i)
  })

  test('handles database errors', async () => {
    const artefactsQuery = {
      select: jest.fn(() => artefactsQuery),
      eq: jest.fn(() => artefactsQuery),
      gte: jest.fn(() => artefactsQuery),
      order: jest.fn(() => artefactsQuery),
      limit: jest.fn(async () => ({ data: null, error: { message: 'DB error' } })),
    }

    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn(() => artefactsQuery),
    }

    createServerSupabaseClient.mockReturnValue(supabase)

    const req = {
      url: 'http://localhost/api/artefacts/recent?limit=10&within=60',
      headers: new Headers(),
    }

    const { GET } = require('../app/api/artefacts/recent/route')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBeTruthy()
  })
})
