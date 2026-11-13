import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

const config = readJson('scripts/images.config.json')
const inventario = readJson('content/inventario.json')
const entries = config.entries ?? []
const semFotos = config.semFotos ?? []

const DEST_RE = /^(pontos-turisticos|eventos|comunidades|comercios)\/[a-z0-9-]+\/\d{2}$|^home\/[a-z0-9-]+$/
const PLACE_RE = /^(pontos-turisticos|eventos|comunidades|comercios)\/([a-z0-9-]+)\/(\d{2})$/
const placeEntries = entries.filter((e) => PLACE_RE.test(e.dest))
const placeOf = (e) => {
  const [, categoria, slug] = e.dest.match(PLACE_RE)
  return `${categoria}/${slug}`
}

const TEMAS = ['natureza', 'rio', 'tradicao', 'fe']
const HOME_HERO = [
  ...TEMAS.map((t) => `home/tema-${t}`),
  'home/cat-pontos-turisticos', 'home/cat-eventos', 'home/cat-comunidades', 'home/cat-comercios',
  'home/cidade-matriz', 'home/numeros-fundo', 'home/og-default', 'home/hero-fundo',
]
const HOME_ORBIT = TEMAS.flatMap((t) => [1, 2, 3, 4].map((n) => `home/orbita-${t}-${n}`))
const HOME_OG = ['home/cat-pontos-turisticos', 'home/cat-eventos', 'home/cat-comunidades', 'home/cat-comercios', 'home/og-default']

describe('scripts/images.config.json', () => {
  it('tem entradas', () => expect(entries.length).toBeGreaterThan(0))

  it.skipIf(!fs.existsSync(path.join(root, '_legado')))('todo src existe no disco', () => {
    const missing = entries.filter((e) => !fs.existsSync(path.join(root, ...e.src.split('/')))).map((e) => e.src)
    expect(missing).toEqual([])
  })

  it('dest segue <categoria>/<slug>/NN ou home/<nome>', () => {
    expect(entries.filter((e) => !DEST_RE.test(e.dest)).map((e) => e.dest)).toEqual([])
  })

  it('cada dest é único', () => {
    const seen = new Set()
    const dup = entries.filter((e) => (seen.has(e.dest) ? true : (seen.add(e.dest), false))).map((e) => e.dest)
    expect(dup).toEqual([])
  })

  it('cada slug do inventário tem exatamente uma capa NN=01 com og:true, ou está em semFotos', () => {
    for (const { slug, categoria } of inventario) {
      const own = placeEntries.filter((e) => placeOf(e) === `${categoria}/${slug}`)
      if (semFotos.includes(slug)) {
        expect([slug, own.length]).toEqual([slug, 0])
        continue
      }
      const covers = own.filter((e) => e.dest.endsWith('/01'))
      expect([slug, covers.length]).toEqual([slug, 1])
      expect([slug, covers[0].role, covers[0].og]).toEqual([slug, 'cover', true])
      expect([slug, own.filter((e) => e.role === 'cover').length]).toEqual([slug, 1])
    }
  })

  it('semFotos contém encontro-dos-cachaceiros e caquende, e só slugs do inventário', () => {
    expect(semFotos).toEqual(expect.arrayContaining(['encontro-dos-cachaceiros', 'caquende']))
    const slugs = inventario.map((i) => i.slug)
    expect(semFotos.filter((s) => !slugs.includes(s))).toEqual([])
  })

  it('os dests de lugar só usam pares categoria/slug do inventário', () => {
    const valid = new Set(inventario.map((i) => `${i.categoria}/${i.slug}`))
    expect(placeEntries.filter((e) => !valid.has(placeOf(e))).map((e) => e.dest)).toEqual([])
  })

  it('a galeria de cada lugar é numerada em sequência a partir de 01, com role gallery depois da capa', () => {
    const byPlace = {}
    for (const e of placeEntries) (byPlace[placeOf(e)] ??= []).push(e)
    for (const [place, list] of Object.entries(byPlace)) {
      const nums = list.map((e) => Number(e.dest.slice(-2))).sort((a, b) => a - b)
      expect([place, nums]).toEqual([place, nums.map((_, i) => i + 1)])
      expect([place, list.filter((e) => !e.dest.endsWith('/01') && e.role !== 'gallery').map((e) => e.dest)]).toEqual([place, []])
    }
  })

  it('nenhuma foto é usada por dois lugares diferentes', () => {
    const bySrc = {}
    for (const e of placeEntries) (bySrc[e.src] ??= new Set()).add(placeOf(e))
    const reused = Object.entries(bySrc).filter(([, s]) => s.size > 1).map(([src, s]) => `${src}: ${[...s].join(', ')}`)
    expect(reused).toEqual([])
  })

  it('nenhuma foto aparece duas vezes no mesmo lugar', () => {
    const seen = new Set()
    const dup = placeEntries.filter((e) => {
      const k = `${placeOf(e)}|${e.src}`
      return seen.has(k) ? true : (seen.add(k), false)
    }).map((e) => e.dest)
    expect(dup).toEqual([])
  })

  it('alt tem de 10 a 125 caracteres e não começa com "Imagem", "Foto" ou "Desfile"', () => {
    const bad = entries.filter((e) => typeof e.alt !== 'string' || e.alt.length < 10 || e.alt.length > 125 ||
      /^\s*(imagem|foto|desfile)/i.test(e.alt)).map((e) => `${e.dest}: ${e.alt}`)
    expect(bad).toEqual([])
  })

  it('as chaves obrigatórias da Home existem, incluindo as 16 órbitas', () => {
    const dests = new Set(entries.map((e) => e.dest))
    expect(HOME_ORBIT.length).toBe(16)
    expect([...HOME_HERO, ...HOME_ORBIT].filter((k) => !dests.has(k))).toEqual([])
  })

  it('as chaves da Home têm o role e o og da tabela', () => {
    const byDest = Object.fromEntries(entries.map((e) => [e.dest, e]))
    for (const k of HOME_HERO) expect([k, byDest[k]?.role]).toEqual([k, 'hero'])
    for (const k of HOME_ORBIT) expect([k, byDest[k]?.role]).toEqual([k, 'orbit'])
    for (const k of HOME_OG) expect([k, byDest[k]?.og]).toEqual([k, true])
  })

  it('as fotos de tema do hero são recortadas em 3:4, a proporção do arco (Task 13b)', () => {
    const byDest = Object.fromEntries(entries.map((e) => [e.dest, e]))
    for (const t of TEMAS) expect([t, byDest[`home/tema-${t}`]?.aspect]).toEqual([t, '3:4'])
    expect(entries.filter((e) => 'aspect' in e && !/^\d+:\d+$/.test(e.aspect)).map((e) => e.dest)).toEqual([])
  })

  it('a foto do LCP da Home (tema natureza) tem a largura extra de 600 (Ruling 29); extraWidths só com inteiros', () => {
    const byDest = Object.fromEntries(entries.map((e) => [e.dest, e]))
    expect(byDest['home/tema-natureza']?.extraWidths).toEqual([600])
    expect(entries.filter((e) => 'extraWidths' in e && !(Array.isArray(e.extraWidths) && e.extraWidths.every(Number.isInteger)))
      .map((e) => e.dest)).toEqual([])
  })

  it('no máximo 12 fotos por lugar', () => {
    const count = {}
    for (const e of placeEntries) count[placeOf(e)] = (count[placeOf(e)] ?? 0) + 1
    expect(Object.entries(count).filter(([, n]) => n > 12)).toEqual([])
  })

  it('role e flags válidos', () => {
    const roles = ['cover', 'gallery', 'hero', 'orbit', 'brand']
    expect(entries.filter((e) => !roles.includes(e.role)).map((e) => e.dest)).toEqual([])
    expect(entries.filter((e) => ('trim' in e && typeof e.trim !== 'boolean') || ('og' in e && typeof e.og !== 'boolean'))
      .map((e) => e.dest)).toEqual([])
  })
})

describe('scripts/images.manifest.json', () => {
  const manifest = readJson('scripts/images.manifest.json')

  it('tem exatamente as entradas da config (menos brand)', () => {
    const dests = entries.filter((e) => e.role !== 'brand').map((e) => e.dest).sort()
    expect(Object.keys(manifest).sort()).toEqual(dests)
  })

  it('cada registro aponta para arquivos que existem em public/', () => {
    const missing = []
    for (const r of Object.values(manifest)) {
      for (const u of [r.large.url, r.small.url, ...(r.og ? [r.og] : [])]) {
        if (!fs.existsSync(path.join(root, 'public', ...u.slice(1).split('/')))) missing.push(u)
      }
    }
    expect(missing).toEqual([])
  })

  it('og aparece só nas entradas com og:true', () => {
    for (const e of entries.filter((x) => x.role !== 'brand')) {
      expect([e.dest, Boolean(manifest[e.dest]?.og)]).toEqual([e.dest, Boolean(e.og)])
    }
  })
})
