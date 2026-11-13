import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const CREAM = '#FBF7EE'
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }
// PNG de paleta: o brasão de 512 cai de ~200 KB para ~50 KB sem diferença visível (Task 13b).
const PNG = { palette: true, quality: 90, effort: 10 }

const TRANSPARENT = [
  ['favicon-32.png', 32],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['img/brand/brasao-96.png', 96],
  ['img/brand/brasao-192.png', 192],
  ['img/brand/brasao-512.png', 512],
]

/**
 * Gera os ícones e as versões do brasão a partir do PNG transparente.
 * @param {string} srcPng
 * @param {string} publicDir
 * @returns {Promise<string[]>} caminhos relativos a `publicDir` (POSIX)
 */
export async function generateBrandAssets(srcPng, publicDir) {
  const out = []
  const write = async (rel, pipeline) => {
    const dest = path.join(publicDir, ...rel.split('/'))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    await pipeline.png(PNG).toFile(dest)
    out.push(rel)
  }
  for (const [rel, size] of TRANSPARENT) {
    await write(rel, sharp(srcPng).resize(size, size, { fit: 'contain', background: CLEAR }))
  }
  const pad = 16
  const inner = await sharp(srcPng).resize(180 - pad * 2, 180 - pad * 2, { fit: 'contain', background: CLEAR }).png().toBuffer()
  await write('apple-touch-icon.png', sharp(inner).extend({ top: pad, bottom: pad, left: pad, right: pad, background: CREAM }).flatten({ background: CREAM }))
  return out
}
