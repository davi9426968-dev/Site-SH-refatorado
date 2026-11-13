// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { ringOffset } from '../../src/js/ui/back-to-top.js'

describe('back-to-top', () => {
  it.each([[0, 100], [1, 0], [1.5, 0], [-1, 100], [0.25, 75]])('ringOffset(%s, 100) = %s', (p, o) => expect(ringOffset(p, 100)).toBe(o))
})

describe('back-to-top init', () => {
  const html = '<button data-to-top><svg><circle class="to-top__progress" r="22"/></svg></button>'

  it('fica visível após 600 px, ajusta o anel e o clique rola ao topo', async () => {
    window.matchMedia = () => ({ matches: true })
    window.scrollTo = vi.fn()
    document.body.innerHTML = html
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true })
    const { init } = await import('../../src/js/ui/back-to-top.js')
    init()
    const btn = document.querySelector('[data-to-top]')
    expect(btn.classList.contains('is-visible')).toBe(true)
    expect(document.querySelector('.to-top__progress').style.strokeDasharray).toBe(String(2 * Math.PI * 22))
    btn.click()
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('não aparece perto do topo', async () => {
    document.body.innerHTML = html
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    const { init } = await import('../../src/js/ui/back-to-top.js')
    init()
    expect(document.querySelector('[data-to-top]').classList.contains('is-visible')).toBe(false)
  })
})

describe('back-to-top foco', () => {
  it('depois de rolar ao topo, o foco vai para #conteudo (o botão some perto do topo)', async () => {
    window.matchMedia = () => ({ matches: true })
    window.scrollTo = vi.fn()
    document.body.innerHTML = '<button data-to-top><svg><circle class="to-top__progress" r="22"/></svg></button><main id="conteudo" tabindex="-1"></main>'
    Object.defineProperty(window, 'scrollY', { value: 700, configurable: true })
    const { init } = await import('../../src/js/ui/back-to-top.js')
    init()
    const btn = document.querySelector('[data-to-top]')
    btn.focus()
    const main = document.getElementById('conteudo')
    const spy = vi.spyOn(main, 'focus')
    btn.click()
    expect(spy).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(main)
  })
})
