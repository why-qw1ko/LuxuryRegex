<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import Candidate from './Candidate.vue'
import AboutRegex from './AboutRegex.vue'
import ColorSettings from './ColorSettings.vue'
import { categoryKeys, categoryLabels, defaultPalette, validPalette } from './palettes.js'
import { generate, generateWithFixed, splitSegments } from './regex.js'
import { groupCandidates } from './candidate-groups.js'

const input = ref('LuxuryRegex666')
const mode = ref('strict')
const theme = ref(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
const page = ref('workspace')
const expandedGroups = ref({})
const selected = ref('')
const selectionRange = ref({ start: 0, end: 0 })
const fixedRanges = ref([])
const selectionPosition = ref({ top: 0, left: 0 })
const popup = ref(false)
const inputEl = ref(null)
const composing = ref(false)
const editorMirror = ref(null)
const result = ref('')
const copyDone = ref(false)
const feedback = ref(null)
const settingsError = ref('')
const settingsReady = ref(false)
const showSegments = ref(true)
const palette = ref(defaultPalette())
const paletteReady = ref(false)
const defaultBackgrounds = {
  light: { letter: '#e4efff', digit: '#c9f1df', han: '#ffe3aa', symbol: '#ffd9e3' },
  dark: { letter: '#2d4059', digit: '#214c3b', han: '#594329', symbol: '#59323d' }
}
const paletteStyle = computed(() => {
  const colors = palette.value[theme.value]
  const defaults = defaultPalette()[theme.value]
  const styles = {}
  for (const key of categoryKeys) {
    styles[`--category-${key}`] = colors[key]
    styles[`--category-${key}-soft`] = colors[key].toLowerCase() === defaults[key].toLowerCase()
      ? defaultBackgrounds[theme.value][key]
      : `color-mix(in srgb, ${colors[key]} ${theme.value === 'dark' ? 25 : 20}%, var(--surface-soft))`
  }
  return styles
})
const savingCount = ref(0)
const savedNotice = ref(false)
const failedValues = ref({})
const saveError = computed(() => Object.keys(failedValues.value).length > 0)
let saveQueue = Promise.resolve()
let savedTimer
const examples = ['LuxuryRegex666', 'Hello 2025', '你好，世界', 'hello@example.com']
const maxFocus = 200
const focusedText = computed(() => Array.from(input.value).slice(0, maxFocus).join(''))
const truncated = computed(() => Array.from(input.value).length > maxFocus)
const segments = computed(() => splitSegments(focusedText.value))
const highlighted = computed(() => {
  const runs = []
  const boundaries = [0, ...fixedRanges.value.flatMap(range => [range.start, range.end]), input.value.length]
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i], end = boundaries[i + 1]
    const fixed = fixedRanges.value.some(range => start >= range.start && end <= range.end && start < end)
    const merged = []
    for (const segment of splitSegments(input.value.slice(start, end))) {
      const type = ['upper', 'lower', 'letter'].includes(segment.type) ? 'letter' : segment.type
      const previous = merged.at(-1)
      if (previous?.type === type) previous.text += segment.text
      else merged.push({ type, text: segment.text })
    }
    if (merged.length) runs.push({ fixed, segments: merged })
  }
  return runs
})
const candidates = computed(() => fixedRanges.value.length ? generateWithFixed(focusedText.value, fixedRanges.value) : generate(focusedText.value, mode.value))
const groupNames = ['精确', '类别', '泛化']
const groupKeys = { 精确: 'exact', 类别: 'category', 泛化: 'broad' }
const groupDefaults = ref({ exact: true, category: true, broad: true })
const groups = computed(() => groupCandidates(candidates.value, groupNames))
const selectedCandidates = computed(() => generate(Array.from(selected.value).slice(0, maxFocus).join(''), mode.value).slice(0, 5))
const visualParts = computed(() => candidates.value.find(x => x.label === '完整结构')?.parts || candidates.value[0]?.parts || (focusedText.value ? [candidates.value[0]?.pattern] : []))
const groupOpen = ref({ 精确: true, 类别: true, 泛化: true })
const segmentSuggestions = computed(() => segments.value.slice(0, 8).map((segment, index) => {
  const options = generate(segment.text, mode.value)
  const preferred = options.find(item => item.group === '类别') || options[0]
  return { ...segment, index, preferred }
}))

let copyTimer
let feedbackTimer
let selectionDismissed = false
function toggleMore(name) { expandedGroups.value[name] = !expandedGroups.value[name] }
function toggleGroup(name) { groupOpen.value[name] = !groupOpen.value[name] }
function chooseExample(value) { input.value = value; selected.value = ''; popup.value = false; expandedGroups.value = {} }
function syncScroll() {
  if (inputEl.value && editorMirror.value) {
    editorMirror.value.scrollTop = inputEl.value.scrollTop
    editorMirror.value.scrollLeft = inputEl.value.scrollLeft
  }
}
function dismissSelection() { selectionDismissed = true; popup.value = false }
function beginSelection() { selectionDismissed = false }
function beginKeyboardSelection(event) { if (event.key !== 'Escape' && !event.isComposing) beginSelection() }
function updateSelection() {
  const el = inputEl.value
  if (!el || document.activeElement !== el || selectionDismissed) return
  if (el.selectionStart === el.selectionEnd) { popup.value = false; return }
  selected.value = el.value.slice(el.selectionStart, el.selectionEnd)
  selectionRange.value = { start: el.selectionStart, end: el.selectionEnd }
  const rect = el.getBoundingClientRect()
  const width = Math.min(350, window.innerWidth - 24)
  const preferRight = rect.right + width + 12 < window.innerWidth
  const panelHeight = Math.min(380, window.innerHeight - 24)
  const verticalTop = rect.bottom + 10 + panelHeight <= window.innerHeight ? rect.bottom + 10 : Math.max(12, rect.top - panelHeight - 10)
  selectionPosition.value = preferRight
    ? { top: Math.max(12, Math.min(rect.top, window.innerHeight - panelHeight - 12)), left: rect.right + 12 }
    : { top: verticalTop, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) }
  popup.value = true
}
function handleEditorKeyup(event) { if (event.key !== 'Escape' && !event.isComposing) updateSelection() }
const canFixSelection = computed(() => selectionRange.value.end <= focusedText.value.length && selectionRange.value.start < selectionRange.value.end)
const selectionIsFixed = computed(() => fixedRanges.value.some(range => range.start <= selectionRange.value.start && range.end >= selectionRange.value.end))
function toggleFixedSelection() {
  if (!canFixSelection.value) return
  if (selectionIsFixed.value) {
    const { start, end } = selectionRange.value
    fixedRanges.value = fixedRanges.value.flatMap(range => {
      if (range.end <= start || range.start >= end) return [range]
      return [range.start < start && { start: range.start, end: start }, range.end > end && { start: end, end: range.end }].filter(Boolean)
    })
    return
  }
  const ranges = [...fixedRanges.value, { ...selectionRange.value }].sort((a, b) => a.start - b.start)
  const merged = []
  for (const range of ranges) {
    const previous = merged.at(-1)
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end)
    else merged.push({ ...range })
  }
  fixedRanges.value = merged
}
function removeFixed(index) { fixedRanges.value = fixedRanges.value.filter((_, i) => i !== index) }
function showFeedback(message, type = 'success') {
  clearTimeout(feedbackTimer)
  feedback.value = { message, type }
  feedbackTimer = setTimeout(() => { feedback.value = null }, 3000)
}
function insert(pattern) { result.value += pattern; dismissSelection(); showFeedback('已添加到「我的表达式」') }
function clearInput() {
  if (!input.value) return
  input.value = ''; selected.value = ''; popup.value = false
  showFeedback('输入文字已清空')
}
function clearResult() {
  if (!result.value) return
  result.value = ''
  showFeedback('我的表达式已清空')
}
async function copyResult() {
  if (!result.value) { showFeedback('表达式为空，暂无内容可复制', 'error'); return }
  try { await navigator.clipboard.writeText(result.value); copyDone.value = true; clearTimeout(copyTimer); copyTimer = setTimeout(() => copyDone.value = false, 2500); showFeedback('表达式已复制到剪贴板') } catch { showFeedback('复制失败，请手动选择表达式复制', 'error') }
}
function saveSetting(values) {
  const snapshot = { ...values }
  savingCount.value++
  savedNotice.value = false
  saveQueue = saveQueue.then(async () => {
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) })
      if (!response.ok) throw new Error('save')
      const saved = await response.json()
      if (saved.version !== 2) throw new Error('incompatible')
      const failures = { ...failedValues.value }
      for (const key of Object.keys(snapshot)) delete failures[key]
      failedValues.value = failures
      if (!Object.keys(failures).length) {
        savedNotice.value = true
        clearTimeout(savedTimer)
        savedTimer = setTimeout(() => { savedNotice.value = false }, 2500)
      }
    } catch {
      failedValues.value = { ...failedValues.value, ...snapshot }
    } finally { savingCount.value-- }
  })
}
function retrySave() { if (saveError.value && !savingCount.value) saveSetting({ ...failedValues.value }) }

function setMode(value) { mode.value = value; saveSetting({ mode: value }) }
function setGroupDefault(name) {
  const key = groupKeys[name]
  groupDefaults.value = { ...groupDefaults.value, [key]: !groupDefaults.value[key] }
  groupOpen.value = { ...groupOpen.value, [name]: groupDefaults.value[key] }
  saveSetting({ groupDefaults: { ...groupDefaults.value } })
}
function updatePalette(next) { if (!validPalette(next)) return; palette.value = next; saveSetting({ palette: structuredClone(next) }) }
function toggleSegments() { showSegments.value = !showSegments.value; saveSetting({ showSegments: showSegments.value }) }
function toggleTheme() { theme.value = theme.value === 'light' ? 'dark' : 'light'; saveSetting({ theme: theme.value }) }
function handleGlobal(e) { if (e.key === 'Escape') dismissSelection() }
function handlePointer(e) { if (!(e.target instanceof Element) || (!e.target.closest('.selection-popover') && e.target !== inputEl.value)) dismissSelection() }
watch(input, () => { popup.value = false; fixedRanges.value = [] }, { flush: 'sync' })
watch(candidates, () => { expandedGroups.value = {} }, { flush: 'sync' })
watch(theme, value => { document.documentElement.dataset.theme = value }, { immediate: true })
onMounted(async () => {
  document.addEventListener('keydown', handleGlobal)
  document.addEventListener('pointerdown', handlePointer)
  try {
    const response = await fetch('/api/settings')
    if (!response.ok) throw new Error('load')
    const settings = await response.json()
    if (settings.version !== 2) throw new Error('outdated')
    mode.value = settings.mode
    if (settings.theme) theme.value = settings.theme
    showSegments.value = settings.showSegments
    if (validPalette(settings.palette)) { palette.value = settings.palette; paletteReady.value = true }
    if (settings.groupDefaults) {
      groupDefaults.value = settings.groupDefaults
      groupOpen.value = Object.fromEntries(groupNames.map(name => [name, settings.groupDefaults[groupKeys[name]]]))
    }
    settingsReady.value = true
  } catch (error) { settingsError.value = error.message === 'outdated' ? '当前服务版本较旧，请停止开发服务器并重新运行 npm run dev。' : '无法连接设置服务，请检查开发服务器后刷新页面。' }
})
onUnmounted(() => { document.removeEventListener('keydown', handleGlobal); document.removeEventListener('pointerdown', handlePointer); clearTimeout(copyTimer); clearTimeout(feedbackTimer); clearTimeout(savedTimer) })
</script>
<template>
  <div class="app-shell" :style="paletteStyle">
    <img class="mobile-mascot" src="/blue-whale-mascot.png" alt="" aria-hidden="true" />
    <aside class="sidebar">
      <div class="brand"><img src="/regex-garden-icon.png" alt="" class="brand-mark" /><div><strong>Luxury Regex</strong><small>正则灵感练习场</small></div></div>
      <div class="nav-caption">工作空间</div>
      <nav aria-label="主导航">
        <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'"><Icon name="grid" /> <span>工作台</span></button>
        <button :class="{ active: page === 'about' }" @click="page = 'about'"><Icon name="book" /> <span>关于正则</span></button>
        <button :class="{ active: page === 'settings' }" @click="page = 'settings'"><Icon name="settings" /> <span>偏好设置</span></button>
      </nav>
      <div class="side-bottom"><img class="sidebar-mascot" src="/blue-whale-mascot.png" alt="蓝鱼娘形象" /></div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="breadcrumb"><span>Luxury Regex</span><Icon name="chevron-right" :size="14" /> {{ page === 'workspace' ? '工作台' : page === 'about' ? '关于正则' : '偏好设置' }}</div><div class="top-actions"><span class="local-badge"><span class="status-dot"></span> {{ settingsReady ? '数据保存在本地' : '设置未连接' }}</span><button class="theme-toggle" :disabled="!settingsReady" :aria-label="theme === 'light' ? '切换到深色主题' : '切换到浅色主题'" :title="theme === 'light' ? '切换到深色主题' : '切换到浅色主题'" @click="toggleTheme"><Icon :name="theme === 'light' ? 'moon' : 'sun'" :size="19" /></button></div></header>
      <div v-if="page === 'workspace'" class="content">
        <div class="workspace-title"><h1>正则工作台</h1></div>
        <div class="workspace-grid">
          <section class="left-column" aria-label="文本编辑和表达式">
            <div class="panel input-panel">
              <div class="panel-heading"><div><h2>输入文字</h2></div><button class="quiet-button" @click="clearInput">清空</button></div>
              <div class="editor-wrap" :class="{ 'is-composing': composing }">
                <div ref="editorMirror" class="editor-mirror" aria-hidden="true"><div class="editor-content"><template v-for="(run, index) in highlighted" :key="index"><span :class="{ 'fixed-run': run.fixed }"><span v-for="(segment, segmentIndex) in run.segments" :key="segmentIndex" :class="`highlight-${segment.type}`">{{ segment.text }}</span></span></template><span v-if="input.endsWith('\n')">&#8203;</span></div></div>
                <textarea ref="inputEl" v-model="input" aria-label="输入用于生成正则的文本" spellcheck="false" placeholder="在这里输入文字..." @scroll="syncScroll" @pointerdown="beginSelection" @keydown="beginKeyboardSelection" @mouseup="updateSelection" @keyup="handleEditorKeyup" @select="updateSelection" @compositionstart="composing = true" @compositionend="composing = false" @touchend="updateSelection" @dragstart.prevent @drop.prevent></textarea>
              </div>
              <div class="editor-meta"><div class="legend"><span v-for="key in categoryKeys" :key="key" tabindex="0" :aria-label="`${categoryLabels[key]}颜色 ${palette[theme][key].toUpperCase()}`" :data-color="palette[theme][key].toUpperCase()"><i :class="`legend-${key}`"></i>{{ categoryLabels[key] }}</span></div><span>{{ Array.from(input).length }} 字符</span></div>
              <div v-if="fixedRanges.length" class="fixed-list" aria-label="已固定片段"><span>已固定</span><button v-for="(range, index) in fixedRanges" :key="`${range.start}-${range.end}`" :aria-label="`取消固定 ${input.slice(range.start, range.end)}`" @click="removeFixed(index)"><span>{{ input.slice(range.start, range.end) }}</span><Icon name="close" :size="13" /></button></div>
              
              <div v-if="truncated" class="limit-note">为保持响应速度，整体分析前 {{ maxFocus }} 个字符；选中其他片段可单独分析。</div>
            </div>
            <div class="example-row"><span>试试示例</span><button v-for="example in examples" :key="example" @click="chooseExample(example)">{{ example }}</button></div>
            <div v-if="showSegments && segmentSuggestions.length" class="panel segment-section"><div class="segment-header"><div><h2>分段正则</h2></div><span class="segment-count">{{ segments.length }} 段</span></div><div class="segment-tiles"><div v-for="segment in segmentSuggestions" :key="segment.index" class="segment-tile" :class="`tile-${segment.type}`"><span class="segment-text" :title="segment.text">{{ segment.text }}</span><span class="segment-caption">{{ segment.label }} · {{ Array.from(segment.text).length }}</span><Candidate v-if="segment.preferred" :item="segment.preferred" compact @insert="insert" @feedback="showFeedback" /></div></div><p v-if="segments.length > 8" class="segment-limit">仅展示前 8 个片段，选中其他文字可单独查看。</p></div>

            <div class="panel builder-card"><div class="builder-head"><div><h2>我的表达式</h2></div><button class="icon-button" :title="copyDone ? '已复制' : '复制结果'" :aria-label="copyDone ? '已复制' : '复制结果'" @click="copyResult"><Icon :name="copyDone ? 'check' : 'copy'" :size="18" /></button></div><textarea v-model="result" aria-label="我的表达式" placeholder="在这里组合你的正则..."></textarea><div class="builder-bottom"><span>JavaScript · Unicode 模式</span><button class="quiet-button" @click="clearResult">清空</button></div></div>
          </section>
          <section class="right-column" aria-label="正则建议">
            <div class="panel result-card"><div class="result-head"><div><h2>正则灵感 <span>{{ candidates.length }}</span></h2></div><button class="mode-pill" title="前往偏好设置" @click="page = 'settings'">{{ mode === 'strict' ? '严格模式' : '宽松模式' }} <Icon name="chevron-right" :size="13" /></button></div>
              <template v-if="candidates.length"><div v-for="group in groups" :key="group.name" class="candidate-group"><button class="group-heading" :aria-expanded="groupOpen[group.name]" @click="toggleGroup(group.name)"><span><i :class="`group-dot ${group.name}`"></i>{{ group.name }} <small>{{ group.name === '精确' ? '完全一致' : group.name === '类别' ? '按字符类型' : '更大的匹配范围' }}</small></span><Icon name="chevron" :size="16" :class="{ rotated: !groupOpen[group.name] }" /></button><div class="collapse" :class="{ open: groupOpen[group.name] }" :inert="!groupOpen[group.name]" :aria-hidden="!groupOpen[group.name]"><div class="collapse-inner"><div class="collapse-content"><Candidate v-for="item in group.initial" :key="item.pattern" :item="item" @insert="insert" @feedback="showFeedback" /><div v-if="group.additional.length" class="more-collapse" :class="{ open: expandedGroups[group.name] }" :inert="!expandedGroups[group.name]" :aria-hidden="!expandedGroups[group.name]"><div><Candidate v-for="item in group.additional" :key="item.pattern" :item="item" @insert="insert" @feedback="showFeedback" /></div></div><el-button v-if="group.additional.length" text class="more-button" :aria-expanded="!!expandedGroups[group.name]" @click="toggleMore(group.name)">{{ expandedGroups[group.name] ? '收起更多' : `展开更多 · 还有 ${group.additional.length} 种写法` }} <Icon name="chevron" :size="15" :class="{ rotated: expandedGroups[group.name] }" /></el-button></div></div></div></div></template>
              <div v-else class="empty-state"><Icon name="spark" :size="25" /><strong>灵感正在等待文字</strong><span>输入一些内容，开始探索。</span></div>
            </div>
            <div v-if="visualParts.length" class="visual-card"><div class="visual-head"><div><h3>结构预览</h3></div><Icon name="structure" :size="18" /></div><div class="visual-flow"><template v-for="(part, i) in visualParts" :key="i"><span v-if="i" class="flow-arrow">→</span><code>{{ part }}</code></template></div></div>
          </section>
        </div>

      </div>
      <div v-else-if="page === 'settings'" class="content settings-page"><h1>偏好设置</h1><div class="panel settings-card"><div class="settings-title"><div><h2>候选推荐模式</h2><p>调整默认推荐的侧重点，不影响候选的正确性。</p></div></div><div class="mode-options"><button :disabled="!settingsReady" :class="{ chosen: mode === 'strict' }" :aria-pressed="mode === 'strict'" @click="setMode('strict')"><span class="radio-mark"></span><span><strong>严格模式</strong><small>优先展示贴合原文的字符类别和长度。</small></span><span class="recommended">推荐</span></button><button :disabled="!settingsReady" :class="{ chosen: mode === 'loose' }" :aria-pressed="mode === 'loose'" @click="setMode('loose')"><span class="radio-mark"></span><span><strong>宽松模式</strong><small>更早展示匹配范围较广的写法。</small></span></button></div></div><div class="panel settings-card group-settings"><div class="settings-title"><h2>分组默认状态</h2><p>控制打开工作台时各分组是否展开。</p></div><div class="group-switch-list"><div v-for="name in groupNames" :key="name" class="group-switch-row"><span>{{ name }}</span><button class="switch" role="switch" :disabled="!settingsReady" :aria-label="`${name}默认展开`" :aria-checked="groupDefaults[groupKeys[name]]" :class="{ checked: groupDefaults[groupKeys[name]] }" @click="setGroupDefault(name)"><span></span></button></div></div></div><div class="panel settings-card group-settings"><div class="settings-title"><h2>工作台显示</h2></div><div class="group-switch-list"><div class="group-switch-row"><span>显示分段正则</span><button class="switch" role="switch" :disabled="!settingsReady" aria-label="显示分段正则" :aria-checked="showSegments" :class="{ checked: showSegments }" @click="toggleSegments"><span></span></button></div></div></div><ColorSettings :palette="palette" :theme="theme" :enabled="settingsReady && paletteReady" @change="updatePalette" /></div>
      <AboutRegex v-if="page === 'about'" />
    </main>
    <div class="notification-stack">
      <div v-if="settingsError || saveError || savingCount || savedNotice" class="save-status" :class="{ 'notice-error': settingsError || (saveError && !savingCount), 'notice-success': !settingsError && !saveError && !savingCount }" role="status" aria-live="polite"><Icon :name="settingsError || (saveError && !savingCount) ? 'info' : savingCount ? 'settings' : 'check'" :size="18" /><span>{{ settingsError || (savingCount ? '正在保存…' : saveError ? '设置保存失败，请重试。' : '设置已保存') }}</span><button v-if="saveError && !settingsError && !savingCount" @click="retrySave">重试</button></div>
      <div v-if="feedback" class="save-status" :class="feedback.type === 'error' ? 'notice-error' : 'notice-success'" role="status" aria-live="polite"><Icon :name="feedback.type === 'error' ? 'info' : 'check'" :size="18" /><span>{{ feedback.message }}</span></div>
    </div>
    <div v-if="popup && selected" class="selection-popover" :style="{ top: `${selectionPosition.top}px`, left: `${selectionPosition.left}px` }" role="dialog" aria-label="选中文本的正则建议"><div class="popover-head"><div><span>选中片段</span><strong>{{ selected.length > 30 ? selected.slice(0, 30) + '…' : selected }}</strong></div><button class="icon-button" aria-label="关闭" @click="dismissSelection"><Icon name="close" :size="16" /></button></div><div class="fix-selection"><span>固定此片段<small>用于生成整体正则</small></span><button class="switch" role="switch" :disabled="!canFixSelection" aria-label="固定此片段" :aria-checked="selectionIsFixed" :class="{ checked: selectionIsFixed }" @click="toggleFixedSelection"><span></span></button></div><p v-if="!canFixSelection" class="fix-help">只能固定前 {{ maxFocus }} 个字符内的片段。</p><div class="popover-list"><Candidate v-for="item in selectedCandidates" :key="item.pattern" :item="item" compact @insert="insert" @feedback="showFeedback" /></div><p>点击 + 插入结果框 · Esc 关闭</p></div>
  </div>
</template>
