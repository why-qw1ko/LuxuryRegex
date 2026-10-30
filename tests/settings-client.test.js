import test from 'node:test'
import assert from 'node:assert/strict'
import { requestSettings } from '../src/settings-client.js'

test('settings requests preserve false values and reject errors or incompatible responses', async () => {
  const settings = { version: 2, showSegments: false }
  assert.deepEqual(await requestSettings({ showSegments: false }, { fetchImpl: async (url, options) => {
    assert.equal(url, '/api/settings')
    assert.equal(options.method, 'PUT')
    assert.equal(options.body, '{"showSegments":false}')
    return Response.json(settings)
  } }), settings)
  for (const response of [new Response('', { status: 500 }), Response.json(null), Response.json({ version: 1 }), new Response('invalid JSON')]) {
    await assert.rejects(requestSettings(undefined, { fetchImpl: async () => response }))
  }
})

test('stalled headers and bodies time out and subsequent requests can succeed', async () => {
  for (const stallBody of [false, true]) {
    await assert.rejects(requestSettings(undefined, { timeoutMs: 10, fetchImpl: async (_, { signal }) => {
      const stalled = () => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
      return stallBody ? { ok: true, json: stalled } : stalled()
    } }), { name: 'AbortError' })
    assert.deepEqual(await requestSettings(undefined, { fetchImpl: async (_, options) => {
      assert.equal(options.method, undefined)
      return Response.json({ version: 2 })
    } }), { version: 2 })
  }
})
