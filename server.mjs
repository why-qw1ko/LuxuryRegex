import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createServer as createViteServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSettingsStore } from './src/settings-store.js'

mkdirSync('data', { recursive: true })
const db = new DatabaseSync('data/regex-garden.sqlite')
const settings = createSettingsStore(db)
const vite = await createViteServer({ configFile: false, plugins: [vue()], cacheDir: '.vite-cache', server: { middlewareMode: true, hmr: { port: Number(process.env.HMR_PORT || 24678) } }, appType: 'spa' })
const server = createServer((req, res) => {
  if (req.url === '/api/settings') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'GET') {
      return res.end(JSON.stringify(settings.read()))
    }
    if (req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => { body += chunk; if (body.length > 1024) req.destroy() })
      req.on('end', () => {
        try {
          const values = JSON.parse(body)
          res.end(JSON.stringify(settings.write(values)))
        } catch { res.statusCode = 400; res.end(JSON.stringify({ error: '设置无效' })) }
      })
      return
    }
    res.statusCode = 405
    return res.end(JSON.stringify({ error: '不支持的请求' }))
  }
  vite.middlewares(req, res)
})
const port = Number(process.env.PORT || 5173)
server.listen(port, '127.0.0.1', () => console.log(`Regex Garden: http://127.0.0.1:${port}`))

