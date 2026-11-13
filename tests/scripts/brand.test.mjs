import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { generateBrandAssets } from '../../scripts/lib/brand.mjs'

let tmp
beforeAll(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-brand-')) })
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

describe('generateBrandAssets', () => {
  it('gera os 7 arquivos com os tamanhos certos', async () => {
    const src = path.join(tmp, 'src.png')
    const block = await sharp({ create: { width: 200, height: 300, channels: 4, background: '#123F2E' } }).png().toBuffer()
    await sharp({ create: { width: 500, height: 500, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: block, left: 150, top: 100 }])
      .png().toFile(src)
    const out = path.join(tmp, 'public')
    const files = await generateBrandAssets(src, out)
    const expected = {
      'favicon-32.png': 32, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512,
      'img/brand/brasao-96.png': 96, 'img/brand/brasao-192.png': 192, 'img/brand/brasao-512.png': 512,
    }
    expect(files.length).toBe(7)
    for (const [f, s] of Object.entries(expected)) {
      const m = await sharp(path.join(out, f)).metadata()
      expect([f, m.width, m.height]).toEqual([f, s, s])
    }
    const icon = await sharp(path.join(out, 'icon-192.png')).ensureAlpha().raw().toBuffer()
    expect(icon[3]).toBe(0) // canto transparente
    const apple = await sharp(path.join(out, 'apple-touch-icon.png')).ensureAlpha().raw().toBuffer()
    expect(apple[3]).toBe(255) // fundo opaco
  })

  // Task 13b: o brasão de 512 (marca d'água da Home, do menu e das páginas sem foto) tinha 200 KB em
  // RGBA. Em PNG de paleta ele fica com ~50 KB, sem diferença visível, e continua transparente.
  it('grava PNG de paleta (menor), mantendo a transparência', async () => {
    const src = path.join(tmp, 'src-paleta.png')
    await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 18, g: 63, b: 46, alpha: 1 } } })
      .extend({ top: 100, bottom: 100, left: 100, right: 100, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(src)
    const out = path.join(tmp, 'public-paleta')
    const files = await generateBrandAssets(src, out)
    for (const f of files) {
      const m = await sharp(path.join(out, f)).metadata()
      expect([f, m.isPalette]).toEqual([f, true])
    }
    const crest = await sharp(path.join(out, 'img/brand/brasao-512.png')).ensureAlpha().raw().toBuffer()
    expect(crest[3]).toBe(0) // canto transparente
  })
})
