/** @jest-environment node */

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}))

const { createServerSupabaseClient } = require('@/lib/supabase')

function makeReqJson(body) {
  return {
    headers: new Map([['content-type', 'application/json']]),
    json: async () => body,
    formData: async () => {
      throw new Error('formData should not be called for json requests')
    },
  }
}

describe('POST /api/uploads (JSON registration)', () => {
  beforeEach(() => {
    const supabaseModule = require('@/lib/supabase')
    supabaseModule.createServerSupabaseClient.mockReset()
  })

  test('registers a vault upload as a memory and returns memoryId', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn((table) => {
        if (table === 'memories') {
          return {
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(async () => ({ data: { id: 'mem-1' }, error: null })),
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

    const { POST } = require('../app/api/uploads/route')
    const res = await POST(
      makeReqJson({
        bucket: 'artefacts',
        storagePath: 'vault/user-1/123_test.txt',
        name: 'test.txt',
        size: 123,
        type: 'text/plain',
        content: 'hello',
      })
    )

    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.memoryId).toBe('mem-1')
  })

  test('rejects payloads over 1GB', async () => {
    const supabase = {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: jest.fn(() => {
        throw new Error('should not insert')
      }),
    }
    createServerSupabaseClient.mockReturnValue(supabase)

    const { POST } = require('../app/api/uploads/route')
    const res = await POST(
      makeReqJson({
        bucket: 'artefacts',
        storagePath: 'vault/user-1/too_big.bin',
        name: 'too_big.bin',
        size: 1024 * 1024 * 1024 + 1,
        type: 'application/octet-stream',
      })
    )
    expect(res.status).toBe(413)
  })
})















