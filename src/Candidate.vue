<script setup>
import { onUnmounted, ref } from 'vue'
import Icon from './Icon.vue'
const props = defineProps({ item: Object, compact: Boolean })
const emit = defineEmits(['insert', 'feedback'])
const copied = ref(false)
let timer
async function copy() {
  try {
    await navigator.clipboard.writeText(props.item.pattern)
    copied.value = true
    emit('feedback', '正则已复制到剪贴板', 'success')
    clearTimeout(timer)
    timer = setTimeout(() => copied.value = false, 2500)
  } catch { copied.value = false; emit('feedback', '复制失败，请手动复制正则', 'error') }
}
onUnmounted(() => clearTimeout(timer))
</script>
<template>
  <div class="candidate" :class="{ compact }" :title="`可以完整匹配：${item.examples}`">
    <div class="candidate-main">
      <div class="candidate-top"><code>{{ item.pattern }}</code><span class="candidate-label">{{ item.label }}</span></div>
      <p>{{ item.explanation }}</p>
      <div v-if="!compact" class="match-example"><span>匹配示例</span> {{ item.examples }}</div>
    </div>
    <div class="candidate-actions">
      <button class="icon-button" :aria-label="copied ? '已复制' : '复制正则'" :title="copied ? '已复制' : '复制正则'" @click="copy"><Icon :name="copied ? 'check' : 'copy'" :size="16" /></button>
      <button class="icon-button insert-button" aria-label="插入结果框" title="插入结果框" @click="emit('insert', item.pattern)"><Icon name="plus" :size="17" /></button>
    </div>
  </div>
</template>
