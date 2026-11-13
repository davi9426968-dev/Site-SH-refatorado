import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const css = rel => fs.readFileSync(path.resolve(process.cwd(), 'src/styles', rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('cursor dentro do lightbox', () => {
  const base = css('base.css')
  const comps = css('components.css')

  it('devolve o cursor nativo ao dialog e aos botões, vencendo o cursor: none !important', () => {
    expect(base).toMatch(/html\.has-cursor\s+\.lightbox[^{]*\{[^}]*cursor:\s*auto\s*!important/)
    expect(base).toMatch(/html\.has-cursor\s+\.lightbox\s+button[^{]*\{[^}]*cursor:\s*pointer\s*!important/)
  })

  it('esconde o cursor próprio enquanto um lightbox está aberto', () => {
    const all = base + comps
    expect(all).toMatch(/dialog\.lightbox\[open\][^{]*\.cursor-dot[^{]*\.cursor-ring[^{]*\{[^}]*opacity:\s*0/)
  })
})
