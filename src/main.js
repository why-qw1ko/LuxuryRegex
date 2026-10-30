import { createApp } from 'vue'
import { ElButton } from 'element-plus'
import 'element-plus/es/components/button/style/css'
import './style.css'
import App from './App.vue'

createApp(App).component('ElButton', ElButton).mount('#app')
