import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.jfif'])
const COLS = 4
const ROWS = 3
const TW = 360
const TH = 270
const BAND = 26

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
  const out = []
  for (const d of entries) {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) out.push(...(await walk(p)))
    else if (EXTS.has(path.extname(d.name).toLowerCase())) out.push(p)
  }
  return out
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function thumb(file, n) {
  const label = esc(`${String(n).padStart(2, '0')} · ${path.basename(file)}`)
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}">` +
      `<rect x="0" y="${TH - BAND}" width="${TW}" height="${BAND}" fill="#000" fill-opacity="0.75"/>` +
      `<text x="8" y="${TH - 8}" font-family="Arial, sans-serif" font-size="14" fill="#fff">${label}</text></svg>`,
  )
  const base = await sharp(file).rotate().resize(TW, TH, { fit: 'cover' }).toBuffer()
  return sharp(base).composite([{ input: svg }]).png().toBuffer()
}

export async function makeContactSheets(dirs, { out, root }) {
  const files = []
  for (const d of dirs) files.push(...(await walk(path.resolve(root, d))))
  await fs.mkdir(out, { recursive: true })
  const map = {}
  const perSheet = COLS * ROWS
  const sheets = Math.ceil(files.length / perSheet)
  for (let s = 0; s < sheets; s++) {
    const composites = []
    for (let i = 0; i < perSheet; i++) {
      const idx = s * perSheet + i
      if (idx >= files.length) break
      const n = idx + 1
      map[n] = path.relative(root, files[idx]).split(path.sep).join('/')
      try {
        composites.push({ input: await thumb(files[idx], n), left: (i % COLS) * TW, top: Math.floor(i / COLS) * TH })
      } catch (e) {
        throw new Error(`Falha ao ler ${files[idx]}: ${e.message}`, { cause: e })
      }
    }
    await sharp({ create: { width: COLS * TW, height: ROWS * TH, channels: 3, background: '#111' } })
      .composite(composites)
      .png()
      .toFile(path.join(out, `sheet-${String(s + 1).padStart(2, '0')}.png`))
  }
  await fs.writeFile(path.join(out, 'sheets.json'), JSON.stringify(map, null, 2) + '\n')
  return { images: files.length, sheets }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const args = process.argv.slice(2)
  const oi = args.indexOf('--out')
  if (oi < 0 || !args[oi + 1]) {
    console.error('Uso: npm run sheets -- <dirs...> --out <dir>')
    process.exit(1)
  }
  const out = path.resolve(root, args[oi + 1])
  const dirs = args.filter((_, i) => i !== oi && i !== oi + 1)
  if (!dirs.length) {
    console.error('Informe ao menos uma pasta.')
    process.exit(1)
  }
  try {
    const r = await makeContactSheets(dirs, { out, root })
    console.log(`${r.images} imagens em ${r.sheets} folha(s) em ${out}`)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
