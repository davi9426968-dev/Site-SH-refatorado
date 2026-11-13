// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let mod

beforeEach(async () => {
  vi.resetModules()
  window.matchMedia = vi.fn(q => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))
  window.scrollTo = vi.fn()
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = `
    <header data-header></header>
    <a id="skip" href="#conteudo">pular</a>
    <a id="root" href="/#historia">hist</a>
    <a id="cross" href="/eventos/#x">cross</a>
    <a id="plain" href="/eventos/">eventos</a>
    <a id="hash" href="#">topo</a>
    <main id="conteudo"></main>
    <section id="historia" tabindex="0"></section>`
  window.history.replaceState(null, '', '/')
  mod = await import('../../src/js/core/smooth-scroll.js')
  mod.initSmoothScroll()
})
afterEach(() => vi.restoreAllMocks())

const click = (id, init = {}) => {
  const e = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
  document.getElementById(id).dispatchEvent(e)
  return e
}

describe('smooth-scroll', () => {
  it('sem Lenis com movimento reduzido', () => {
    expect(mod.getLenis()).toBeNull()
  })

  it('âncora #x é interceptada, rola e move o foco para o destino com tabindex=-1', () => {
    const e = click('skip')
    expect(e.defaultPrevented).toBe(true)
    const main = document.getElementById('conteudo')
    expect(main.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(main)
    expect(window.scrollTo).toHaveBeenCalled()
    expect(window.location.hash).toBe('#conteudo')
  })

  it('não altera tabindex existente do destino', () => {
    click('root')
    const s = document.getElementById('historia')
    expect(s.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(s)
  })

  it('/#x só é interceptada quando o caminho atual é /', () => {
    expect(click('root').defaultPrevented).toBe(true)
    window.history.replaceState(null, '', '/eventos/')
    expect(click('root').defaultPrevented).toBe(false)
  })

  it('links entre páginas, href="#" e destino inexistente não são interceptados', () => {
    expect(click('cross').defaultPrevented).toBe(false)
    expect(click('plain').defaultPrevented).toBe(false)
    expect(click('hash').defaultPrevented).toBe(false)
    document.getElementById('conteudo').remove()
    expect(click('skip').defaultPrevented).toBe(false)
  })

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])('clique modificado %o não é interceptado', init => {
    expect(click('skip', init).defaultPrevented).toBe(false)
  })

  it('scrollToTarget nativo aplica offset e immediate', () => {
    mod.scrollToTarget(500, { offset: -80, immediate: true })
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'instant' })
    mod.scrollToTarget(0)
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' }) // movimento reduzido
    window.scrollTo.mockClear()
    mod.scrollToTarget('#inexistente')
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('lock/unlock sem Lenis usam contador e overflow no html', () => {
    const html = document.documentElement
    mod.lockScroll(); mod.lockScroll()
    expect(html.style.overflow).toBe('hidden')
    mod.unlockScroll()
    expect(html.style.overflow).toBe('hidden')
    mod.unlockScroll()
    expect(html.style.overflow).toBe('')
    mod.unlockScroll()
    expect(html.style.overflow).toBe('')
  })
})
