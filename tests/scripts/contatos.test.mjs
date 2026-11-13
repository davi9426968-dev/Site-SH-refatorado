import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

// Celular "(dd) 9 dddd-dddd" ou fixo "(dd) dddd-dddd" (Ruling 19)
const PHONE_RE = /^\(\d{2}\) (9 \d{4}|\d{4})-\d{4}$/
const INSTAGRAM_RE = /^[a-z0-9._]+$/
const NUMERO_RE = /^\d{1,5}[A-Z]?$/

describe('content/contatos-comercios.json', () => {
  const file = path.join(root, 'content', 'contatos-comercios.json')

  it('existe e é um objeto', () => {
    expect(fs.existsSync(file)).toBe(true)
    const data = readJson('content/contatos-comercios.json')
    expect(data !== null && typeof data === 'object' && !Array.isArray(data)).toBe(true)
  })

  it('contatos: as chaves são slugs de comércio, os telefones casam com o formato e o instagram com /^[a-z0-9._]+$/', () => {
    const data = readJson('content/contatos-comercios.json')
    const comercios = readJson('content/inventario.json').filter((i) => i.categoria === 'comercios').map((i) => i.slug)
    for (const [slug, c] of Object.entries(data)) {
      expect([slug, comercios.includes(slug)]).toEqual([slug, true])
      expect([slug, Object.keys(c).filter((k) => !['telefones', 'instagram', 'numero'].includes(k))]).toEqual([slug, []])
      expect([slug, Object.keys(c).length > 0]).toEqual([slug, true])
      if ('telefones' in c) {
        expect(Array.isArray(c.telefones) && c.telefones.length > 0).toBe(true)
        for (const t of c.telefones) expect([slug, t, PHONE_RE.test(t)]).toEqual([slug, t, true])
        expect(new Set(c.telefones).size).toBe(c.telefones.length)
      }
      if ('instagram' in c) expect([slug, c.instagram, INSTAGRAM_RE.test(c.instagram)]).toEqual([slug, c.instagram, true])
      if ('numero' in c) expect([slug, c.numero, NUMERO_RE.test(c.numero)]).toEqual([slug, c.numero, true])
    }
  })
})
