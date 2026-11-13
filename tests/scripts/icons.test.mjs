import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Contrato do sprite: `content/lugares.json` e os partials usam estes nomes com <use href="/icons.svg#nome">.
const NAMES = [
  'arrow-right', 'arrow-up-right', 'arrow-left', 'chevron-left', 'chevron-right', 'close', 'menu',
  'instagram', 'facebook', 'whatsapp', 'mail', 'phone', 'map-pin', 'clock', 'calendar', 'ticket',
  'share', 'play', 'pause', 'volume', 'volume-off', 'star', 'leaf', 'waves', 'church', 'users', 'sun', 'camera',
]

const svg = fs.readFileSync(path.resolve('public/icons.svg'), 'utf8')
const symbols = [...svg.matchAll(/<symbol\b([^>]*)>/g)].map(m => ({
  id: m[1].match(/\bid="([^"]+)"/)?.[1],
  viewBox: m[1].match(/\bviewBox="([^"]+)"/)?.[1],
}))

describe('public/icons.svg', () => {
  it('tem exatamente os símbolos do contrato', () =>
    expect(symbols.map(s => s.id).sort()).toEqual([...NAMES].sort()))
  it('todo símbolo usa viewBox 0 0 24 24', () =>
    expect(symbols.filter(s => s.viewBox !== '0 0 24 24').map(s => s.id)).toEqual([]))
  it('desenha com currentColor, sem cores fixas', () =>
    expect(svg.match(/(?:fill|stroke)="(?!none|currentColor)[^"]*"/g)).toBeNull())
})
