# Regex Garden

由文本反推正则的本地学习工具，使用 Vue、Vite、Element Plus 和 Node 内置 SQLite。编辑区按字符类别高亮文字，分段和整体候选支持复制、插入与选区分析。深浅主题、严格/宽松模式和分组默认展开状态、分段正则显示设置及浅色/深色字符配色保存在 `data/regex-garden.sqlite`，输入文本只在浏览器中处理。

需要 Node.js 22.12 或更高版本（Node 22 的 SQLite 接口需要实验性标志）。

```bash
npm install
npm run dev
```

访问 http://127.0.0.1:5173。更新服务端代码后需要重启开发服务器。运行 `npm test` 可验证候选生成，`npm run build` 可检查生产构建。正则按 JavaScript Unicode 模式（`u`）解释。候选是精选示例，并非数学上无限多种等价表达式的穷举。
