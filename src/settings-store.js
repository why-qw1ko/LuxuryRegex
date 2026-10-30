import { defaultPalette, validPalette } from './palettes.js'

const groupKeys = ['exact', 'category', 'broad']
const allowedKeys = ['mode', 'theme', 'groupDefaults', 'showSegments', 'palette']
export const defaultGroups = () => ({ exact: true, category: true, broad: true })
const validGroups = groups => groups && typeof groups === 'object' && !Array.isArray(groups) &&
  Object.keys(groups).length === groupKeys.length && groupKeys.every(key => typeof groups[key] === 'boolean')

export class InvalidSettingsError extends Error {}

export function createSettingsStore(db) {
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  const readStatement = db.prepare('SELECT value FROM settings WHERE key = ?')
  const writeStatement = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  const readSetting = key => readStatement.get(key)?.value
  function read() {
    const mode = readSetting('mode')
    const theme = readSetting('theme')
    let groupDefaults
    try {
      const saved = JSON.parse(readSetting('groupDefaults'))
      groupDefaults = validGroups(saved) ? saved : defaultGroups()
    } catch { groupDefaults = defaultGroups() }
    let palette
    try {
      const saved = JSON.parse(readSetting('palette'))
      palette = validPalette(saved) ? saved : defaultPalette()
    } catch { palette = defaultPalette() }
    return {
      version: 2,
      mode: mode === 'loose' ? 'loose' : 'strict',
      theme: ['light', 'dark'].includes(theme) ? theme : null,
      groupDefaults,
      palette,
      showSegments: readSetting('showSegments') !== 'false'
    }
  }
  function write(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new InvalidSettingsError('invalid settings')
    const keys = Object.keys(values)
    if (!keys.length || keys.some(key => !allowedKeys.includes(key)) ||
      ('mode' in values && !['strict', 'loose'].includes(values.mode)) ||
      ('theme' in values && !['light', 'dark'].includes(values.theme)) ||
      ('groupDefaults' in values && !validGroups(values.groupDefaults)) ||
      ('showSegments' in values && typeof values.showSegments !== 'boolean') ||
      ('palette' in values && !validPalette(values.palette))) throw new InvalidSettingsError('invalid settings')
    db.exec('BEGIN')
    try {
      for (const key of keys) writeStatement.run(key, ['groupDefaults', 'showSegments', 'palette'].includes(key) ? JSON.stringify(values[key]) : values[key])
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return read()
  }
  return { read, write }
}
