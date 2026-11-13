import fs from 'node:fs'
import path from 'node:path'

const INCLUDE = /<!--\s*@include\s+([a-z0-9-]+)\s*-->/g
const MAX_DEPTH = 2

/**
 * Troca cada `<!-- @include nome -->` pelo conteúdo do partial, resolvendo includes
 * aninhados até 2 níveis além da página.
 * @param {string} html
 * @param {(name: string) => string} readPartial
 * @param {number} [depth]
 */
export function expandIncludes(html, readPartial, depth = 0) {
  return html.replace(INCLUDE, (_, name) => {
    if (depth > MAX_DEPTH) throw new Error(`Include aninhado demais (máx. ${MAX_DEPTH})`)
    let content
    try {
      content = readPartial(name)
    } catch (err) {
      if (err && err.code === 'ENOENT') throw new Error(`Partial "${name}" não encontrado`)
      throw err
    }
    if (typeof content !== 'string') throw new Error(`Partial "${name}" não encontrado`)
    return expandIncludes(content, readPartial, depth + 1)
  })
}

/**
 * Plugin do Vite que expande os includes de `partials/` nos HTML e recarrega o dev
 * quando um partial muda.
 * @param {{ dir?: string }} [options]
 * @returns {import('vite').Plugin}
 */
export function partialsPlugin(options = {}) {
  const dir = path.resolve(options.dir ?? 'partials')
  const read = name => fs.readFileSync(path.join(dir, `${name}.html`), 'utf8')
  return {
    name: 'sh-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: html => expandIncludes(html, read),
    },
    configureServer(server) {
      server.watcher.add(dir)
      const reload = file => {
        if (path.resolve(file).startsWith(dir + path.sep)) server.ws.send({ type: 'full-reload', path: '*' })
      }
      server.watcher.on('change', reload)
      server.watcher.on('add', reload)
      server.watcher.on('unlink', reload)
    },
  }
}
