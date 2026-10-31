// Aperçu privé (artifact claude.ai) : three.js vient du CDN jsDelivr par une
// carte d'import, le paquet ne contient que le code du temple. Sortie : dist-apercu/.
import { defineConfig } from 'vite'

const THREE = 'https://cdn.jsdelivr.net/npm/three@0.172.0/'
export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-apercu',
    emptyOutDir: true,
    target: 'es2020',
    modulePreload: false,
    rollupOptions: { input: { guide: 'index.html' }, external: [/^three(\/.*)?$/] }
  },
  plugins: [{
    name: 'carte-import-three',
    transformIndexHtml: html => html.replace('<head>', `<head>\n  <script type="importmap">{"imports":{"three":"${THREE}build/three.module.js","three/examples/jsm/":"${THREE}examples/jsm/"}}</script>`)
  }]
})
