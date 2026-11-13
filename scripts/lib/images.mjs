import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WEBP = { quality: 78, effort: 5 }

export function outputPaths(dest) {
  return { large: `public/img/${dest}-1600.webp`, small: `public/img/${dest}-800.webp` }
}

/** Larguras extras (extraWidths, Ruling 29): public/img/<dest>-<largura>.webp. */
export function extraPath(dest, width) {
  return `public/img/${dest}-${width}.webp`
}

export function publicUrl(p) {
  return '/' + p.replace(/\\/g, '/').replace(/^public\//, '')
}

export function ogPath(dest) {
  return `public/og/${dest.replace(/\//g, '-')}.jpg`
}

export function needsUpdate(srcMtimeMs, destMtimeMs) {
  return destMtimeMs == null || srcMtimeMs > destMtimeMs
}

async function mtimeOrNull(file) {
  try {
    return (await fs.stat(file)).mtimeMs
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

// Mtime mais antigo entre os destinos, ou null se algum não existir.
async function oldestMtime(files) {
  let oldest = Infinity
  for (const f of files) {
    const m = await mtimeOrNull(f)
    if (m == null) return null
    oldest = Math.min(oldest, m)
  }
  return oldest
}

/**
 * Tamanho de saída para `aspect` ("3:4"): o maior recorte central com essa proporção, reduzido até
 * `width` e nunca ampliado.
 */
export function aspectSize(srcWidth, srcHeight, aspect, width) {
  const [aw, ah] = aspect.split(':').map(Number)
  const ratio = aw / ah
  const cropW = srcWidth / srcHeight > ratio ? Math.round(srcHeight * ratio) : srcWidth
  const w = Math.min(width, cropW)
  return { width: w, height: Math.round(w / ratio) }
}

export async function processImage(entry, { root, force = false } = {}) {
  if (entry.role === 'brand') return null
  const abs = (p) => path.join(root, ...p.split('/'))
  const src = abs(entry.src.replace(/\\/g, '/'))
  const out = outputPaths(entry.dest)
  const og = entry.og ? ogPath(entry.dest) : null
  const extras = (entry.extraWidths ?? []).map(w => [extraPath(entry.dest, w), w])
  const targets = [out.large, out.small, ...extras.map(([p]) => p), ...(og ? [og] : [])].map(abs)

  let srcStat
  try {
    srcStat = await fs.stat(src)
  } catch (e) {
    throw new Error(`Imagem de origem não encontrada: ${entry.src} (${e.message})`, { cause: e })
  }

  try {
    const stale = force || needsUpdate(srcStat.mtimeMs, await oldestMtime(targets))
    if (stale) {
      // Cada saída parte de uma cadeia nova (rotate, trim, resize): uma única compressão por arquivo, sem intermediário com perdas
      const chain = () => {
        const img = sharp(src).rotate()
        return entry.trim ? img.trim({ threshold: 20 }) : img
      }
      // aspect: recorte central na proporção pedida (as fotos de tema do hero, mostradas num arco 3:4 com cover)
      if (entry.aspect && entry.trim) throw new Error('aspect e trim juntos não são suportados')
      const oriented = entry.aspect ? (await sharp(src).metadata()).autoOrient : null
      for (const [file, width] of [[out.large, 1600], [out.small, 800], ...extras]) {
        await fs.mkdir(path.dirname(abs(file)), { recursive: true })
        const resize = oriented
          ? { ...aspectSize(oriented.width, oriented.height, entry.aspect, width), fit: 'cover', position: 'centre' }
          : { width, withoutEnlargement: true }
        await chain().resize(resize).webp(WEBP).toFile(abs(file))
      }
      if (og) {
        await fs.mkdir(path.dirname(abs(og)), { recursive: true })
        await chain()
          .resize(1200, 630, { fit: 'cover', position: 'attention' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toFile(abs(og))
      }
    }
    const dims = async (file) => {
      // lê por buffer: no Windows o cache de arquivos do sharp mantém o arquivo aberto e impede sobrescrevê-lo
      const { width, height } = await sharp(await fs.readFile(abs(file))).metadata()
      return { url: publicUrl(file), width, height }
    }
    const record = {
      dest: entry.dest,
      alt: entry.alt,
      role: entry.role,
      large: await dims(out.large),
      small: await dims(out.small),
    }
    if (extras.length) record.extra = await Promise.all(extras.map(([file]) => dims(file)))
    if (og) record.og = publicUrl(og)
    return record
  } catch (e) {
    throw new Error(`Falha ao processar ${entry.src}: ${e.message}`, { cause: e })
  }
}

// Filtro de escala do vídeo: reduz para 720 no lado menor, nunca amplia.
export function videoScaleFilter(width, height) {
  return height > width ? "scale='min(720,iw)':-2" : "scale=-2:'min(720,ih)'"
}

// Teto de bitrate de vídeo (kbps) para o arquivo ficar perto de targetMB.
export function videoBitrateCap(durationSec, hasAudio, targetMB = 5.5) {
  return Math.floor((targetMB * 8192) / durationSec) - (hasAudio ? 96 : 0)
}
