import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// The team panel (/panel/) is a second page outside the React app. Its data files keep the format
// the team edits (panel/README.md §6): plain scripts whose consts the page's own module script
// uses, so they are pasted in at the /*__ITEMS__*/ marker instead of imported.
function panelVerisi(): Plugin {
  const files = ['items.js', 'bak.js', 'rapor.js'].map((f) => resolve(import.meta.dirname, 'panel', f))
  return {
    name: 'panel-verisi',
    configureServer(server) {
      files.forEach((f) => server.watcher.add(f))
      server.watcher.on('change', (f) => { if (files.includes(f)) server.ws.send({ type: 'full-reload' }) })
      // Relative paths in the panel (data/…) only resolve under the trailing slash.
      server.middlewares.use((req, res, next) => {
        if (req.url === '/panel') { res.writeHead(301, { Location: '/panel/' }); res.end(); return }
        next()
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.endsWith('/panel/index.html')) return html
        const js = files.map((f) => readFileSync(f, 'utf8')).join('\n')
        return html.replace('/*__ITEMS__*/', () => js)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), panelVerisi()],
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), panel: resolve(import.meta.dirname, 'panel/index.html') },
    },
  },
})
