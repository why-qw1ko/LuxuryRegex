<script setup>
import { computed } from 'vue'
const props = defineProps({ name: String, size: { type: Number, default: 18 } })
const paths = {
  structure: 'M3 5h6v6H3z M15 13h6v6h-6z M12 8h3a3 3 0 013 3v2 M6 11v3a3 3 0 003 3h6',
  moon: 'M20 15.5A8.5 8.5 0 018.5 4 8.5 8.5 0 1020 15.5z',
  sun: 'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6L7 7 M17 17l1.4 1.4 M18.4 5.6L17 7 M7 17l-1.4 1.4 M12 8a4 4 0 100 8 4 4 0 000-8z',
  'chevron-right': 'M9 6l6 6-6 6',
  spark: 'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z',
  grid: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  settings: 'M12 8a4 4 0 100 8 4 4 0 000-8z M4.9 19.1l1.4-2.4-1-1.8-2.8-.4v-5l2.8-.4 1-1.8-1.4-2.4 4.3-2.5 1.8 2h2l1.8-2 4.3 2.5-1.4 2.4 1 1.8 2.8.4v5l-2.8.4-1 1.8 1.4 2.4-4.3 2.5-1.8-2h-2l-1.8 2z',
  copy: 'M8 8h11v12H8z M5 16H4V4h11v1',
  check: 'M5 12l4 4L19 6',
  arrow: 'M7 17L17 7 M8 7h9v9',
  chevron: 'M7 10l5 5 5-5',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  book: 'M4 5.5c3-1 5.5-.5 8 1.5 2.5-2 5-2.5 8-1.5v13c-3-1-5.5-.5-8 1.5-2.5-2-5-2.5-8-1.5z M12 7v13',
  wand: 'M4 20L17 7 M14 4l1-2 1 2 2 1-2 1-1 2-1-2-2-1z M19 13l.5-1.5L20 13l1.5.5L20 14l-.5 1.5L19 14l-1.5-.5z',
  info: 'M12 11v5 M12 8h.01 M12 21a9 9 0 110-18 9 9 0 010 18z'
}
const path = computed(() => paths[props.name] || paths.spark)
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="path" /></svg></template>
