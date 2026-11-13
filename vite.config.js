import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { partialsPlugin } from './scripts/lib/partials.mjs'
import { discoverInputs } from './scripts/lib/inputs.mjs'
import { seoPlugin } from './scripts/lib/seo.mjs'

const root = path.resolve(import.meta.dirname)

export default defineConfig(({ mode }) => ({
  appType: 'mpa',
  plugins: [partialsPlugin(), seoPlugin({ siteUrl: loadEnv(mode, root, 'VITE_').VITE_SITE_URL })],
  build: {
    // Vite 8 usa o Rolldown: `rolldownOptions` existe nos tipos (`rollupOptions` é alias obsoleto).
    rolldownOptions: { input: discoverInputs(root) },
  },
  server: {
    watch: { ignored: ['**/_legado/**', '**/.shots/**', '**/dist/**'] },
  },
  optimizeDeps: {
    entries: ['index.html', '404.html', '*/index.html', '*/*/index.html', '!_legado/**', '!node_modules/**', '!dist/**'],
  },
  test: {
    include: ['tests/**/*.test.{js,mjs}'],
  },
}))
