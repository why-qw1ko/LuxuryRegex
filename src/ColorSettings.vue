<script setup>
import { computed, ref, watch } from 'vue'
import { categoryKeys, categoryLabels, defaultPalette, paletteTemplates } from './palettes.js'
const props = defineProps({ palette: { type: Object, required: true }, theme: { type: String, required: true }, enabled: Boolean })
const emit = defineEmits(['change'])
const editingTheme = ref(props.theme)
watch(() => props.theme, value => { editingTheme.value = value })
const selectedTemplate = computed(() => paletteTemplates.find(item =>
  ['light', 'dark'].every(theme => categoryKeys.every(key => item.colors[theme][key].toLowerCase() === props.palette[theme][key].toLowerCase()))
)?.id)
function applyTemplate(template) { emit('change', structuredClone(template.colors)) }
function setColor(key, event) {
  const value = event.target.value
  const next = { light: { ...props.palette.light }, dark: { ...props.palette.dark } }
  next[editingTheme.value][key] = value.toLowerCase()
  emit('change', next)
}
function reset() { emit('change', defaultPalette()) }
</script>
<template>
  <section class="panel settings-card group-settings color-settings">
    <div class="color-settings-head"><div><h2>字符配色</h2><p>模板会同时设置浅色和深色；自定义仅修改当前选中的主题。</p></div><button class="quiet-button" :disabled="!enabled" @click="reset">恢复默认</button></div>
    <div class="palette-templates" aria-label="配色模板">
      <button v-for="template in paletteTemplates" :key="template.id" :disabled="!enabled" :class="{ selected: selectedTemplate === template.id }" :aria-pressed="selectedTemplate === template.id" @click="applyTemplate(template)"><span class="template-dots"><i v-for="key in categoryKeys" :key="key" :style="{ background: template.colors[editingTheme][key] }"></i></span><span>{{ template.name }}</span></button>
    </div>
    <div class="palette-theme" aria-label="编辑的主题"><button v-for="option in ['light', 'dark']" :key="option" :class="{ selected: editingTheme === option }" :aria-pressed="editingTheme === option" @click="editingTheme = option">{{ option === 'light' ? '浅色' : '深色' }}</button></div>
    <div class="color-grid"><label v-for="key in categoryKeys" :key="key" class="color-control"><span>{{ categoryLabels[key] }}</span><span class="color-value"><input type="color" :disabled="!enabled" :aria-label="`${editingTheme === 'light' ? '浅色' : '深色'}${categoryLabels[key]}颜色`" :value="palette[editingTheme][key]" @change="setColor(key, $event)" /><code>{{ palette[editingTheme][key].toUpperCase() }}</code></span></label></div>
    <p v-if="!enabled" class="color-help">请重启开发服务器，以启用配色保存。</p>
  </section>
</template>
