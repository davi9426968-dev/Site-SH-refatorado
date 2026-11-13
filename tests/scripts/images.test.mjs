import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { outputPaths, publicUrl, needsUpdate, processImage, videoScaleFilter, videoBitrateCap } from '../../scripts/lib/images.mjs'

let root
const solid = (w, h, c = { r: 200, g: 80, b: 40 }) =>
  sharp({ create: { width: w, height: h, channels: 3, background: c } })

async function writeSrc(name, pipeline) {
  const rel = `src/${name}`
  await fs.mkdir(path.join(root, 'src'), { recursive: true })
  await pipeline.jpeg().toFile(path.join(root, rel))
  return rel
}
const meta = (rel) => sharp(path.join(root, rel)).metadata()

beforeAll(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'sh-img-')) })
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }) })

describe('outputPaths / publicUrl', () => {
  it('outputPaths', () => expect(outputPaths('eventos/forrozao/01')).toEqual({
    large: 'public/img/eventos/forrozao/01-1600.webp', small: 'public/img/eventos/forrozao/01-800.webp' }))
  it('publicUrl', () => expect(publicUrl('public/img/x.webp')).toBe('/img/x.webp'))
})

describe('needsUpdate', () => {
  it.each([[2000, null, true], [2000, 3000, false], [3000, 2000, true]])('needsUpdate(%s,%s)=%s',
    (s, d, r) => expect(needsUpdate(s, d)).toBe(r))
})

describe('processImage', () => {
  it('3000×2000 gera 1600×1067 e 800×533 com URLs /img/', async () => {
    const src = await writeSrc('a.jpg', solid(3000, 2000))
    const rec = await processImage({ src, dest: 'teste/a/01', alt: 'A', role: 'cover' }, { root })
    expect(rec.large).toEqual({ url: '/img/teste/a/01-1600.webp', width: 1600, height: 1067 })
    expect(rec.small).toEqual({ url: '/img/teste/a/01-800.webp', width: 800, height: 533 })
    expect(rec).toMatchObject({ dest: 'teste/a/01', alt: 'A', role: 'cover' })
    expect(rec.og).toBeUndefined()
    const m = await meta('public/img/teste/a/01-1600.webp')
    expect(m.format).toBe('webp')
    expect(m.exif).toBeUndefined()
  })

  it('600×400 não amplia: large 600×400 e small 600×400', async () => {
    const src = await writeSrc('b.jpg', solid(600, 400))
    const rec = await processImage({ src, dest: 'teste/b/01', alt: 'B', role: 'gallery' }, { root })
    expect([rec.large.width, rec.large.height]).toEqual([600, 400])
    expect([rec.small.width, rec.small.height]).toEqual([600, 400])
  })

  it('EXIF orientation 6 (400×300) sai 300×400', async () => {
    const src = await writeSrc('c.jpg', solid(400, 300).withMetadata({ orientation: 6 }))
    const rec = await processImage({ src, dest: 'teste/c/01', alt: 'C', role: 'gallery' }, { root })
    expect([rec.large.width, rec.large.height]).toEqual([300, 400])
  })

  it('trim remove tarjas pretas: 200×200 de conteúdo dentro de 400×200 preto sai 1:1', async () => {
    const inner = await solid(200, 200, { r: 230, g: 200, b: 60 }).png().toBuffer()
    const src = await writeSrc('d.jpg', solid(400, 200, { r: 0, g: 0, b: 0 })
      .composite([{ input: inner, left: 100, top: 0 }]))
    const rec = await processImage({ src, dest: 'teste/d/01', alt: 'D', role: 'gallery', trim: true }, { root })
    expect(rec.large.width).toBe(rec.large.height)
    expect(rec.large.width).toBeGreaterThanOrEqual(196)
  })

  // Task 13b: as fotos do arco do hero (3:4, object-fit: cover centrado) só mostram a faixa central 3:4.
  it('aspect "3:4" recorta o centro da origem: 1920×1080 sai 810×1080 (large) e 800×1067 (small)', async () => {
    const left = await solid(500, 1080, { r: 0, g: 0, b: 255 }).png().toBuffer()
    const src = await writeSrc('arco-a.jpg', solid(1920, 1080, { r: 230, g: 60, b: 60 })
      .composite([{ input: left, left: 0, top: 0 }, { input: left, left: 1420, top: 0 }]))
    const rec = await processImage({ src, dest: 'teste/arco-a/01', alt: 'Arco A', role: 'hero', aspect: '3:4' }, { root })
    expect([rec.large.width, rec.large.height]).toEqual([810, 1080])
    expect([rec.small.width, rec.small.height]).toEqual([800, 1067])
    // As faixas azuis das laterais ficam fora do recorte central.
    const { data } = await sharp(path.join(root, 'public/img/teste/arco-a/01-1600.webp')).raw().toBuffer({ resolveWithObject: true })
    expect(data[2]).toBeLessThan(100)
  })

  // Ruling 29: a foto do LCP da Home ganha uma largura menor (600) além de 800 e 1600, sem nunca ampliar.
  it('extraWidths [600] grava -600.webp com as medidas reais e o registra em extra', async () => {
    const src = await writeSrc('arco-c.jpg', solid(1920, 1080))
    const rec = await processImage({ src, dest: 'teste/arco-c/01', alt: 'Arco C', role: 'hero', aspect: '3:4', extraWidths: [600] }, { root })
    expect(rec.extra).toEqual([{ url: '/img/teste/arco-c/01-600.webp', width: 600, height: 800 }])
    const m = await meta('public/img/teste/arco-c/01-600.webp')
    expect([m.format, m.width, m.height]).toEqual(['webp', 600, 800])
  })

  it('extraWidths nunca amplia (recorte de 506 px fica com 506) e sem a opção não há extra', async () => {
    const src = await writeSrc('arco-d.jpg', solid(1200, 675))
    const rec = await processImage({ src, dest: 'teste/arco-d/01', alt: 'Arco D', role: 'hero', aspect: '3:4', extraWidths: [600] }, { root })
    expect(rec.extra).toEqual([{ url: '/img/teste/arco-d/01-600.webp', width: 506, height: 675 }])
    const plain = await processImage({ src, dest: 'teste/arco-e/01', alt: 'Arco E', role: 'hero', aspect: '3:4' }, { root })
    expect(plain.extra).toBeUndefined()
  })

  it('aspect nunca amplia: 1200×675 com "3:4" sai 506×675 nas duas larguras', async () => {
    const src = await writeSrc('arco-b.jpg', solid(1200, 675))
    const rec = await processImage({ src, dest: 'teste/arco-b/01', alt: 'Arco B', role: 'hero', aspect: '3:4' }, { root })
    expect([rec.large.width, rec.large.height]).toEqual([506, 675])
    expect([rec.small.width, rec.small.height]).toEqual([506, 675])
  })

  it('og: true grava /og/eventos-forrozao-01.jpg com 1200×630', async () => {
    const src = await writeSrc('e.jpg', solid(3000, 2000))
    const rec = await processImage({ src, dest: 'eventos/forrozao/01', alt: 'E', role: 'cover', og: true }, { root })
    expect(rec.og).toBe('/og/eventos-forrozao-01.jpg')
    const m = await meta('public/og/eventos-forrozao-01.jpg')
    expect([m.format, m.width, m.height]).toEqual(['jpeg', 1200, 630])
  })

  it('não reprocessa quando o destino é mais novo, a não ser com force', async () => {
    const src = await writeSrc('f.jpg', solid(1000, 500))
    const entry = { src, dest: 'teste/f/01', alt: 'F', role: 'gallery' }
    const first = await processImage(entry, { root })
    const file = path.join(root, 'public/img/teste/f/01-800.webp')
    const future = new Date(Date.now() + 60_000)
    await fs.utimes(file, future, future)
    const mtime = (await fs.stat(file)).mtimeMs
    const again = await processImage(entry, { root })
    expect((await fs.stat(file)).mtimeMs).toBe(mtime)
    expect(again).toEqual(first)
    await processImage(entry, { root, force: true })
    expect((await fs.stat(file)).mtimeMs).not.toBe(mtime)
  })

  it('ignora role brand', async () => {
    expect(await processImage({ src: 'x.jpg', dest: 'brand/x', alt: '', role: 'brand' }, { root })).toBeNull()
  })

  it('informa o caminho de origem quando a leitura falha', async () => {
    await expect(processImage({ src: 'nao/existe.jpg', dest: 'teste/z/01', alt: '', role: 'gallery' }, { root }))
      .rejects.toThrow(/nao[\/]existe\.jpg/)
  })
})

describe('vídeo', () => {
  it('escala só reduz: vertical limita a largura, paisagem limita a altura', () => {
    expect(videoScaleFilter(576, 1024)).toBe("scale='min(720,iw)':-2")
    expect(videoScaleFilter(1920, 1080)).toBe("scale=-2:'min(720,ih)'")
  })
  it('teto de bitrate mira ~5,5 MB e desconta o áudio', () => {
    expect(videoBitrateCap(62.18, true)).toBe(628)
    expect(videoBitrateCap(62.18, false)).toBe(724)
    expect(videoBitrateCap(100, true, 5)).toBe(313)
  })
})

describe('uma única compressão por saída', () => {
  it('o 800 equivale ao WebP gerado direto da origem (sem intermediário com perdas)', async () => {
    const w = 1600, h = 1200
    const raw = Buffer.alloc(w * h * 3)
    let seed = 12345
    for (let i = 0; i < raw.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      raw[i] = (seed >> 16) & 0xff
    }
    const src = await writeSrc('ruido.jpg', sharp(raw, { raw: { width: w, height: h, channels: 3 } }))
    await processImage({ src, dest: 'teste/ruido/01', alt: '', role: 'gallery' }, { root })
    const ref = await sharp(path.join(root, src)).rotate().resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 }).toBuffer()
    const got = await fs.readFile(path.join(root, 'public/img/teste/ruido/01-800.webp'))
    const px = (b) => sharp(b).raw().toBuffer()
    expect((await px(got)).equals(await px(ref))).toBe(true)
  })
})
