// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { headerState, markCurrent } from '../../src/js/ui/header.js'

describe('header', () => {
  it.each([
    [{ y: 0, lastY: 0 }, { scrolled: false, hidden: false }],
    [{ y: 41, lastY: 0 }, { scrolled: true, hidden: false }],
    [{ y: 500, lastY: 450 }, { scrolled: true, hidden: true }],
    [{ y: 480, lastY: 500 }, { scrolled: true, hidden: false }],
    [{ y: 300, lastY: 200 }, { scrolled: true, hidden: false }],
  ])('headerState(%o)', (input, out) => expect(headerState(input)).toEqual(out))

  it('markCurrent marca só o link da página', () => {
    document.body.innerHTML = `
      <a data-nav="home" href="/">a</a><a data-nav="eventos" href="/eventos/">b</a><a data-nav="eventos" href="/eventos/">c</a>
      <a data-nav="comercios" href="/comercios/">d</a>`
    markCurrent(document, 'eventos')
    const marked = [...document.querySelectorAll('[aria-current]')]
    expect(marked.map(a => a.dataset.nav)).toEqual(['eventos', 'eventos'])
    expect(marked.every(a => a.getAttribute('aria-current') === 'page')).toBe(true)
    expect(document.querySelector('[data-nav="home"]').hasAttribute('aria-current')).toBe(false)
  })
})

describe('header init', () => {
  it('aplica is-scrolled conforme scrollY e marca o link da página', async () => {
    window.matchMedia = () => ({ matches: false })
    document.body.innerHTML = '<header data-header></header><a data-nav="eventos" href="/eventos/">e</a><a data-nav="home" href="/">h</a>'
    document.body.dataset.page = 'eventos'
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    const { init } = await import('../../src/js/ui/header.js')
    init()
    expect(document.querySelector('[data-header]').classList.contains('is-scrolled')).toBe(true)
    expect(document.querySelector('[data-nav="eventos"]').getAttribute('aria-current')).toBe('page')
    expect(document.querySelector('[data-nav="home"]').hasAttribute('aria-current')).toBe(false)
  })

  it('é no-op sem header', async () => {
    document.body.innerHTML = ''
    const { init } = await import('../../src/js/ui/header.js')
    expect(() => init()).not.toThrow()
  })
})
