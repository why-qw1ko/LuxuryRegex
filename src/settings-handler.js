import { InvalidSettingsError } from './settings-store.js'

export function createSettingsHandler(settings) {
  return (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    const send = (status, value) => {
      res.statusCode = status
      res.end(JSON.stringify(value))
    }
    if (req.method === 'GET') {
      try { send(200, settings.read()) }
      catch { send(500, { error: '读取设置失败' }) }
      return
    }
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'GET, PUT')
      send(405, { error: '不支持的请求' })
      return
    }
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > 1024) {
        chunks.length = 0
        if (!res.writableEnded) send(413, { error: '设置内容过大' })
      } else chunks.push(chunk)
    })
    req.on('error', () => {
      chunks.length = 0
      if (!res.writableEnded && !res.destroyed) send(400, { error: '请求中断' })
    })
    req.on('end', () => {
      if (res.writableEnded) return
      let values
      try { values = JSON.parse(Buffer.concat(chunks).toString('utf8')) }
      catch { send(400, { error: '设置无效' }); return }
      try { send(200, settings.write(values)) }
      catch (error) {
        send(error instanceof InvalidSettingsError ? 400 : 500,
          { error: error instanceof InvalidSettingsError ? '设置无效' : '保存设置失败' })
      }
    })
  }
}
