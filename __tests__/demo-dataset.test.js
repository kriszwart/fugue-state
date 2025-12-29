/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

function makeReqJson(body) {
  return {
    json: async () => body,
  }
}

describe('Demo dataset APIs', () => {
  beforeEach(() => {
    jest.resetModules()
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
  })

  test('POST /api/demo/load inserts demo memories for the current user', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table !== 'memories') throw new Error(`unexpected table ${table}`)
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              contains: jest.fn(async () => ({ count: 0, error: null })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(async () => ({ data: [{ id: 'm1' }, { id: 'm2' }], error: null })),
          })),
        }
      }),
    }

    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReturnValue(supabase)

    const { POST } = require('../app/api/demo/load/route')
    const res = await POST(makeReqJson({ version: 'v1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.alreadyLoaded).toBe(false)
    expect(json.version).toBe('v1')
    expect(json.inserted).toBe(2)
    expect(supabase.from).toHaveBeenCalledWith('memories')
  })

  test('POST /api/demo/load is idempotent when already loaded', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table !== 'memories') throw new Error(`unexpected table ${table}`)
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              contains: jest.fn(async () => ({ count: 3, error: null })),
            })),
          })),
          insert: jest.fn(() => {
            throw new Error('insert should not be called when already loaded')
          }),
        }
      }),
    }

    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReturnValue(supabase)

    const { POST } = require('../app/api/demo/load/route')
    const res = await POST(makeReqJson({ version: 'v1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.alreadyLoaded).toBe(true)
    expect(json.inserted).toBe(0)
  })

  test('POST /api/demo/clear removes only demo-tagged records for the user', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table === 'memories') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                contains: jest.fn(async () => ({ count: 12, error: null })),
              })),
            })),
          }
        }
        if (table === 'memory_patterns') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                contains: jest.fn(async () => ({ count: 0, error: null })),
              })),
            })),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReturnValue(supabase)

    const { POST } = require('../app/api/demo/clear/route')
    const res = await POST(makeReqJson({ version: 'v1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.deleted.memories).toBe(12)
    expect(json.deleted.patterns).toBe(0)
  })
})


