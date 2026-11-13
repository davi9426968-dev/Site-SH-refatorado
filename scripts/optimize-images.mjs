import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { processImage } from './lib/images.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')
const CONCURRENCY = 4

try {
  const config = JSON.parse(await fs.readFile(path.join(root, 'scripts', 'images.config.json'), 'utf8'))
  const entries = (config.entries ?? []).filter((e) => e.role !== 'brand')

  const records = new Array(entries.length)
  let next = 0
  const worker = async () => {
    while (next < entries.length) {
      const i = next++
      records[i] = await processImage(entries[i], { root, force })
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker))

  const manifest = {}
  for (const r of [...records].sort((a, b) => (a.dest < b.dest ? -1 : a.dest > b.dest ? 1 : 0))) manifest[r.dest] = r
  await fs.writeFile(path.join(root, 'scripts', 'images.manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  let files = 0
  let bytes = 0
  for (const r of records) {
    for (const u of [r.large.url, r.small.url, ...(r.og ? [r.og] : [])]) {
      files++
      bytes += (await fs.stat(path.join(root, 'public', ...u.slice(1).split('/')))).size
    }
  }
  console.log(`${files} arquivos, ${(bytes / 1024 / 1024).toFixed(2)} MB (${records.length} imagens)`)
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
