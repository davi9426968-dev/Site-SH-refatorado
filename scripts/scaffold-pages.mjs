// Gera as páginas de categoria e de lugar a partir de content/ e do manifest de imagens.
// Uso: npm run scaffold -- [--force] [--only <slug>]
//   --force        sobrescreve as páginas que já existem (sem ele, só avisa e pula)
//   --only <slug>  só a página desse lugar ou dessa categoria
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { buildSite } from './lib/templates.mjs'

const root = path.resolve(import.meta.dirname, '..')
const { values: opts } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    only: { type: 'string' },
  },
})

const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

let pages = buildSite({
  inventario: readJson('content/inventario.json'),
  lugares: readJson('content/lugares.json'),
  contatos: readJson('content/contatos-comercios.json'),
  manifest: readJson('scripts/images.manifest.json'),
  semFotos: readJson('scripts/images.config.json').semFotos,
})

if (opts.only) {
  // "eventos/forrozao/index.html" → "forrozao"; "eventos/index.html" → "eventos".
  pages = pages.filter(p => p.file.split('/').at(-2) === opts.only)
  if (!pages.length) {
    console.error(`Nenhuma página com o slug "${opts.only}"`)
    process.exit(1)
  }
}

let written = 0
let skipped = 0
for (const { file, html } of pages) {
  const full = path.join(root, ...file.split('/'))
  if (fs.existsSync(full) && !opts.force) {
    console.warn(`Já existe, mantida: ${file} (use --force para sobrescrever)`)
    skipped++
    continue
  }
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, html)
  written++
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
console.log(`${plural(written, 'página gerada', 'páginas geradas')}${skipped ? `, ${plural(skipped, 'mantida', 'mantidas')}` : ''}`)
