import { describe, it, expect } from 'vitest'
import { normalizePage, pagesFromInputs } from '../../scripts/lib/pages.mjs'

describe('normalizePage', () => {
  it.each([['', '/'], ['/', '/'], ['home', '/']])('%j vira "/"', (i, o) => expect(normalizePage(i)).toBe(o))
  it.each([['eventos', '/eventos/'], ['eventos/', '/eventos/'], ['/eventos/forrozao/', '/eventos/forrozao/']])('%j vira %j', (i, o) => expect(normalizePage(i)).toBe(o))
  it.each([['404.html', '/404.html'], ['/404.html', '/404.html']])('%j vira %j (sem barra final)', (i, o) => expect(normalizePage(i)).toBe(o))
})

describe('pagesFromInputs', () => {
  it('converte as entradas do build em URLs, ordenadas', () =>
    expect(pagesFromInputs({ index: 'a', 404: 'b', 'eventos/index': 'c', 'eventos/forrozao/index': 'd' }))
      .toEqual(['/', '/404.html', '/eventos/', '/eventos/forrozao/']))
})
