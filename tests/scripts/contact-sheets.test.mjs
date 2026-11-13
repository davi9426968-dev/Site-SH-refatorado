import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { makeContactSheets } from '../../scripts/contact-sheets.mjs'

let root
beforeAll(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'sh-sheets-')) })
afterAll(async () => { await fs.rm(root, { recursive: true, force: true }) })

describe('contact-sheets', () => {
  it('13 imagens geram 2 folhas e um sheets.json numerado de 1 a 13', async () => {
    const dir = path.join(root, 'fotos com espaço', 'sub')
    await fs.mkdir(dir, { recursive: true })
    for (let i = 1; i <= 13; i++) {
      const n = String(i).padStart(2, '0')
      await sharp({ create: { width: 80, height: 60, channels: 3, background: { r: i * 15, g: 90, b: 120 } } })
        .jpeg().toFile(path.join(dir, `foto ${n}.jpg`))
    }
    await fs.writeFile(path.join(dir, 'ignorar.txt'), 'x')
    const out = path.join(root, 'out')
    const res = await makeContactSheets([path.join(root, 'fotos com espaço')], { out, root })
    expect(res).toEqual({ images: 13, sheets: 2 })
    const files = (await fs.readdir(out)).sort()
    expect(files).toEqual(['sheet-01.png', 'sheet-02.png', 'sheets.json'])
    const map = JSON.parse(await fs.readFile(path.join(out, 'sheets.json'), 'utf8'))
    expect(Object.keys(map).map(Number).sort((a, b) => a - b)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1))
    expect(map['1']).toBe('fotos com espaço/sub/foto 01.jpg')
    expect(map['13']).toBe('fotos com espaço/sub/foto 13.jpg')
    const m = await sharp(path.join(out, 'sheet-01.png')).metadata()
    expect([m.width, m.height]).toEqual([1440, 810])
  })
})
