// Bound both the response headers and body so a stalled request cannot block saves.
export async function requestSettings(values, { timeoutMs = 10000, fetchImpl = fetch } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl('/api/settings', {
      signal: controller.signal,
      ...(values === undefined ? {} : {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
    })
    if (!response.ok) throw new Error('request')
    const settings = await response.json()
    if (settings?.version !== 2) throw new Error('outdated')
    return settings
  } finally {
    clearTimeout(timer)
  }
}
