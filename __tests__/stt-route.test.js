/**
 * @jest-environment node
 */

jest.mock('@google-cloud/speech', () => {
  return {
    SpeechClient: jest.fn().mockImplementation(() => {
      return {
        recognize: jest.fn().mockResolvedValue([
          {
            results: [
              { alternatives: [{ transcript: 'hello world' }] },
              { alternatives: [{ transcript: 'from fugue state' }] }
            ]
          }
        ])
      }
    })
  }
})

const { POST } = require('../app/api/stt/route')

function makeRequestWithAudio({ bytes = Buffer.from('abc'), type = 'audio/webm' } = {}) {
  const fd = new FormData()
  const file = new File([bytes], 'voice.webm', { type })
  fd.append('audio', file)
  return new Request('http://localhost/api/stt', {
    method: 'POST',
    body: fd
  })
}

describe('POST /api/stt', () => {
  it('returns transcript from mocked SpeechClient', async () => {
    const req = makeRequestWithAudio()
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.transcript).toBe('hello world from fugue state')
  })

  it('returns 400 when missing audio field', async () => {
    const req = new Request('http://localhost/api/stt', { method: 'POST', body: new FormData() })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Missing audio/i)
  })
})
















