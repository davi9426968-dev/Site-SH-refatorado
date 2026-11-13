import fs from 'node:fs'
import path from 'node:path'

export const IGNORED_DIRS = new Set([
  'node_modules', 'dist', '_legado', 'partials', 'docs', 'public', 'scripts', 'src', 'tests',
  'styleguide', 'content', '.git', '.shots', '.superpowers', '.vercel', '_fotos', 'coverage',
])

/**
 * Descobre as páginas HTML do site a partir de `root`.
 * Chaves em POSIX sem `.html` ("index", "eventos/forrozao/index"); valores são caminhos absolutos.
 * @param {string} root
 * @returns {Record<string, string>}
 */
export function discoverInputs(root) {
  const inputs = {}
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const key = path.relative(root, full).split(path.sep).join('/').replace(/\.html$/, '')
        inputs[key] = full
      }
    }
  }
  walk(root)
  return inputs
}
