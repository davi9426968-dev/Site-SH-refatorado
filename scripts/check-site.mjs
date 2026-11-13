import fs from 'node:fs'
import path from 'node:path'
import { checkHtml } from './lib/check.mjs'

const dist = path.resolve(process.argv[2] ?? 'dist')
if (!fs.existsSync(dist)) {
  console.error(`Pasta não encontrada: ${dist} (rode "npm run build" antes)`)
  process.exit(1)
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : [])

/** `urlPath` como "/img/a.webp" ou "/eventos/" (diretório vira index.html). */
function exists(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '')
  const full = path.join(dist, ...rel.split('/'))
  if (!full.startsWith(dist)) return false
  if (urlPath.endsWith('/') || rel === '') return fs.existsSync(path.join(full, 'index.html'))
  return fs.existsSync(full) && fs.statSync(full).isFile()
}

const pages = walk(dist)
let count = 0
for (const abs of pages) {
  const file = path.relative(dist, abs).split(path.sep).join('/')
  for (const problem of checkHtml({ file, html: fs.readFileSync(abs, 'utf8'), exists })) {
    console.log(`${file}: ${problem}`)
    count++
  }
}
if (count > 0) process.exit(1)
console.log(`0 problemas em ${pages.length} páginas`)
