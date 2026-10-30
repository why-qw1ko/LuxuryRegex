import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { createSettingsStore } from '../src/settings-store.js'

test('settings persist independently and accept explicit false values', () => {
  const db = new DatabaseSync(':memory:')
  const store = createSettingsStore(db)
  assert.equal(store.read().showSegments, true)
  store.write({ mode: 'loose' })
  store.write({ showSegments: false })
  store.write({ groupDefaults: { exact: false, category: true, broad: false } })
  const reopened = createSettingsStore(db).read()
  assert.equal(reopened.mode, 'loose')
  assert.equal(reopened.showSegments, false)
  assert.deepEqual(reopened.groupDefaults, { exact: false, category: true, broad: false })
  store.write({ showSegments: true })
  assert.equal(store.read().showSegments, true)
  db.close()
})

test('invalid writes do not change any setting', () => {
  const db = new DatabaseSync(':memory:')
  const store = createSettingsStore(db)
  store.write({ mode: 'strict' })
  assert.throws(() => store.write({ mode: 'loose', showSegments: 'false' }))
  assert.throws(() => store.write({ groupDefaults: { exact: false } }))
  assert.equal(store.read().mode, 'strict')
  assert.equal(store.read().showSegments, true)
  db.close()
})

import { defaultPalette, paletteTemplates } from '../src/palettes.js'
test('category colors persist for both themes and reject malformed values', () => {
  const db = new DatabaseSync(':memory:')
  const store = createSettingsStore(db)
  assert.deepEqual(store.read().palette, defaultPalette())
  const palette = structuredClone(paletteTemplates[1].colors)
  palette.dark.han = '#123456'
  store.write({ palette })
  assert.deepEqual(createSettingsStore(db).read().palette, palette)
  assert.throws(() => store.write({ palette: { light: palette.light, dark: { ...palette.dark, han: 'red' } } }))
  assert.deepEqual(store.read().palette, palette)
  store.write({ palette: defaultPalette() })
  assert.deepEqual(store.read().palette, defaultPalette())
  db.close()
})
