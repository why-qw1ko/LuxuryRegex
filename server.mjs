import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createServer as createViteServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSettingsStore } from './src/settings-store.js'
import { createSettingsHandler } from './src/settings-handler.js'

mkdirSync('data', { recursive: true })
const db = new DatabaseSync('data/regex-garden.sqlite')
const settings = createSettingsStore(db)
const handleSettings = createSettingsHandler(settings)
const vite = await createViteServer({ configFile: false, plugins: [vue()], cacheDir: '.vite-cache', server: { middlewareMode: true, hmr: { port: Number(process.env.HMR_PORT || 24678) } }, appType: 'spa' })
const server = createServer((req, res) => {
  if (req.url === '/api/settings') {
    return handleSettings(req, res)
  }
  vite.middlewares(req, res)
})
const port = Number(process.env.PORT || 5173)
server.listen(port, '127.0.0.1', () => console.log(`Regex Garden: http://127.0.0.1:${port}`))

