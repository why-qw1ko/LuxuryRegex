const escapeLiteral = value => value.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
const count = n => n === 1 ? '' : `{${n}}`
const types = [
  ['upper', /[A-Z]/u, '[A-Z]', '大写英文字母'],
  ['lower', /[a-z]/u, '[a-z]', '小写英文字母'],
  ['digit', /[0-9]/u, '\\d', '数字'],
  ['han', /\p{Script=Han}/u, '\\p{Script=Han}', '汉字'],
  ['space', /\s/u, '\\s', '空白字符'],
  ['letter', /\p{L}/u, '\\p{L}', 'Unicode 字母'],
  ['symbol', /[\s\S]/u, null, '符号']
]
export function splitSegments(text) {
  const result = []
  for (const char of Array.from(text)) {
    const [type, , base, label] = types.find(([, regex]) => regex.test(char))
    const last = result.at(-1)
    if (last && last.type === type) last.text += char
    else result.push({ type, base, label, text: char })
  }
  return result
}
const demos = ['U', 'A', 'Z', 'a', 'u', '0', '9', '_', '-', ' ', '中', '文', 'UAY', 'ABC', 'abc', 'AB', 'XY', '123', 'LuxuryRegex666', 'ABC123', 'XYZ456', 'abc123', 'test@example.com', '13812345678']
function examples(pattern, target) {
  const re = new RegExp(`^(?:${pattern})$`, 'u')
  return [...new Set([target, ...demos])].filter(x => re.test(x)).slice(0, 4).map(x => x === ' ' ? '空格' : x.replace(/\n/g, '↵')).join(' · ')
}
export function generate(text, mode = 'strict') {
  if (!text) return []
  const chars = Array.from(text)
  const n = chars.length
  const segments = splitSegments(text)
  const candidates = []
  const add = (pattern, group, explanation, label, parts) => {
    try {
      if (!new RegExp(`^(?:${pattern})$`, 'u').test(text) || candidates.some(c => c.pattern === pattern)) return
      candidates.push({ pattern, group, explanation, label, parts, examples: examples(pattern, text) })
    } catch { /* Do not expose invalid candidates. */ }
  }
  const literal = escapeLiteral(text)
  add(literal, '精确', `逐字匹配“${text.replace(/\n/g, '↵')}”`, '精确文本')
  if (n > 1) add(`^${literal}$`, '精确', '从开头到结尾完整匹配这段文本', '完整匹配', ['^', literal, '$'])
  if (n === 1) {
    const ch = chars[0]
    if (/^[A-Z]$/u.test(ch)) {
      add('[A-Z]', '类别', '匹配一个大写英文字母', '大写字母')
      if (ch !== 'Z' && ch !== 'A') add(`[${ch}-Z]`, '类别', `匹配从 ${ch} 到 Z 的大写字母`, '字母范围')
      add('\\p{Lu}', '类别', '匹配一个 Unicode 大写字母，需要 u 标志', 'Unicode 大写')
      add('[A-Za-z]', '泛化', '匹配一个英文字母，不区分大小写', '英文字母')
    } else if (/^[a-z]$/u.test(ch)) {
      add('[a-z]', '类别', '匹配一个小写英文字母', '小写字母')
      add('\\p{Ll}', '类别', '匹配一个 Unicode 小写字母，需要 u 标志', 'Unicode 小写')
      add('[A-Za-z]', '泛化', '匹配一个英文字母，不区分大小写', '英文字母')
    } else if (/^[0-9]$/u.test(ch)) {
      add('\\d', '类别', '匹配一个 ASCII 数字，等同于 [0-9]', '数字')
      add('\\p{N}', '泛化', '匹配一个 Unicode 数字，需要 u 标志', 'Unicode 数字')
    } else if (/^\p{Script=Han}$/u.test(ch)) {
      add('\\p{Script=Han}', '类别', '匹配一个汉字，需要 u 标志', '汉字')
      add('\\p{L}', '泛化', '匹配一个 Unicode 字母，包含汉字', 'Unicode 字母')
    } else if (/^\p{L}$/u.test(ch)) {
      add('\\p{L}', '类别', '匹配一个 Unicode 字母，需要 u 标志', 'Unicode 字母')
    } else if (/^\p{N}$/u.test(ch)) {
      add('\\p{N}', '类别', '匹配一个 Unicode 数字，需要 u 标志', 'Unicode 数字')
    } else if (/^\s$/u.test(ch)) {
      add('\\s', '类别', '匹配一个空白字符，包括空格、制表符和换行', '空白字符')
    } else {
      add('[^\\w\\s]', '类别', '匹配一个非单词、非空白字符', '符号')
    }
    add('\\w', '泛化', '匹配一个 ASCII 字母、数字或下划线', '单词字符')
    add('.', '泛化', '匹配一个除换行符外的字符', '任意字符')
    add('[\\s\\S]', '泛化', '匹配任意一个字符，包括换行符', '任意字符')
  } else {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text)) add('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', '类别', '匹配常见的邮箱结构；并不验证邮箱是否真实存在', '邮箱结构')
    if (/^1[3-9]\d{9}$/u.test(text)) add('^1[3-9]\\d{9}$', '类别', '匹配常见的中国大陆手机号码格式', '手机号结构')
    const segmentPattern = segments.map(s => s.base ? s.base + count(Array.from(s.text).length) : escapeLiteral(s.text)).join('')
    const labels = segments.map(s => `${Array.from(s.text).length} 个${s.label}`).join(' + ')
    add(segmentPattern, '类别', labels, '按类型组合', segments.map(s => s.base ? s.base + count(Array.from(s.text).length) : escapeLiteral(s.text)))
    add(`^${segmentPattern}$`, '类别', `完整匹配：${labels}`, '完整结构', ['^', ...segments.map(s => s.base ? s.base + count(Array.from(s.text).length) : escapeLiteral(s.text)), '$'])
    if (segments.every(s => ['upper', 'lower', 'digit'].includes(s.type))) {
      const relaxed = segments.map(s => s.type === 'digit' ? `[0-9]${count(Array.from(s.text).length)}` : `[A-Za-z]${count(Array.from(s.text).length)}`).join('')
      add(`^${relaxed}$`, '泛化', '字母不区分大小写，数字长度保持不变', '字母 + 数字')
      add(`\\w{${n}}`, '泛化', `匹配 ${n} 个 ASCII 字母、数字或下划线`, '单词字符')
    }
    add(`(?:${segmentPattern})`, '类别', '用非捕获分组把整个结构作为一个单元', '非捕获分组')
    add(`[\\s\\S]{${n}}`, '泛化', `匹配任意 ${n} 个字符，包括换行符`, '任意字符')
  }
  const rank = { '精确': 0, '类别': 1, '泛化': 2 }
  candidates.sort((a, b) => rank[a.group] - rank[b.group])
  if (mode === 'loose') {
    const exact = candidates.filter(c => c.group === '精确')
    const category = candidates.filter(c => c.group === '类别')
    const broad = candidates.filter(c => c.group === '泛化')
    return [...exact, ...category.slice(0, 1), ...broad, ...category.slice(1)]
  }
  return candidates
}

// Ranges use the same UTF-16 offsets as textarea.selectionStart/selectionEnd.
export function generateWithFixed(text, ranges) {
  if (!text || !ranges.length) return generate(text)
  const ordered = [...ranges].sort((a, b) => a.start - b.start)
  let cursor = 0
  const parts = []
  for (const { start, end } of ordered) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < cursor || end <= start || end > text.length) return []
    if (start > cursor) parts.push({ fixed: false, text: text.slice(cursor, start) })
    parts.push({ fixed: true, text: text.slice(start, end) })
    cursor = end
  }
  if (cursor < text.length) parts.push({ fixed: false, text: text.slice(cursor) })
  const build = (variable, relaxed) => parts.flatMap(part => {
    if (part.fixed) return [escapeLiteral(part.text)]
    const segments = []
    for (const segment of splitSegments(part.text)) {
      const base = relaxed && ['upper', 'lower'].includes(segment.type) ? '[A-Za-z]' : segment.base
      const previous = segments.at(-1)
      if (relaxed && base === '[A-Za-z]' && previous?.base === base) previous.text += segment.text
      else segments.push({ ...segment, base })
    }
    return segments.map(segment => segment.base
      ? segment.base + (variable ? '+' : count(Array.from(segment.text).length))
      : escapeLiteral(segment.text))
  })
  const candidates = []
  for (const [variable, relaxed, label, explanation] of [
    [false, false, '固定片段 · 保持长度', '固定选中内容，其他部分保持字符类型和长度'],
    [false, true, '固定片段 · 字母不区分大小写', '固定选中内容，其他英文字母不区分大小写，长度保持不变'],
    [true, false, '固定片段 · 长度可变', '固定选中内容，其他字符类型的长度可变化（至少一个）']
  ]) {
    const pieces = build(variable, relaxed)
    const pattern = `^${pieces.join('')}$`
    try {
      if (!candidates.some(candidate => candidate.pattern === pattern) && new RegExp(pattern, 'u').test(text)) {
        candidates.push({ pattern, group: variable || relaxed ? '泛化' : '类别', explanation, label, parts: ['^', ...pieces, '$'], examples: examples(pattern, text) })
      }
    } catch { /* Do not expose invalid candidates. */ }
  }
  return candidates
}
export { escapeLiteral }
