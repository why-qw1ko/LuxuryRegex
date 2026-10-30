import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { DatabaseSync } from 'node:sqlite'
import { createSettingsStore } from '../src/settings-store.js'
import { createSettingsHandler } from '../src/settings-handler.js'

async function serve(t, store) {
  const server = createServer(createSettingsHandler(store))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
    server.closeAllConnections()
  }))
  return `http://127.0.0.1:${server.address().port}/api/settings`
}

test('settings HTTP endpoint saves valid input and rejects invalid or oversized requests', async t => {
  const db = new DatabaseSync(':memory:')
  t.after(() => db.close())
  const url = await serve(t, createSettingsStore(db))
  const put = body => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })
  const saved = await put(JSON.stringify({ mode: 'loose', showSegments: false }))
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).showSegments, false)
  for (const body of ['{', '{}', 'null', '[]', '{"mode":"strict","showSegments":"false"}']) {
    assert.equal((await put(body)).status, 400)
  }
  assert.equal((await put(JSON.stringify({ mode: '中'.repeat(400) }))).status, 413)
  const loaded = await fetch(url)
  assert.equal(loaded.status, 200)
  assert.equal(loaded.headers.get('cache-control'), 'no-store')
  assert.equal((await loaded.json()).mode, 'loose')
  const unsupported = await fetch(url, { method: 'POST' })
  assert.equal(unsupported.status, 405)
  assert.equal(unsupported.headers.get('allow'), 'GET, PUT')
})

test('storage failures return generic 500 responses and the server keeps running', async t => {
  let unavailable = true
  const operation = () => {
    if (unavailable) throw new Error('private database path')
    return { version: 2 }
  }
  const url = await serve(t, { read: operation, write: operation })
  for (const options of [{}, { method: 'PUT', body: '{"mode":"strict"}' }]) {
    const response = await fetch(url, options)
    assert.equal(response.status, 500)
    assert.doesNotMatch(await response.text(), /private database path/)
  }
  unavailable = false
  assert.equal((await fetch(url)).status, 200)
})
