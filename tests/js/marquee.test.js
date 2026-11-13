// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ fine = true, reduce = false } = {}) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('pointer: fine') ? fine : q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

const html = `<div class="marquee" data-marquee><div class="marquee__track">
  <a class="marquee__item" href="/eventos/">Forrozão</a><svg class="marquee__sep"></svg>
  <span class="marquee__item">Desfile</span></div></div>`

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = html
})

describe('setupMarquee', () => {
  it('duplica os itens, marca o clone com aria-hidden e tira os links do clone do Tab', async () => {
    const { setupMarquee } = await import('../../src/js/fx/marquee.js')
    const el = document.querySelector('[data-marquee]')
    const { track, clone } = setupMarquee(el)
    expect(track.classList.contains('marquee__track')).toBe(true)
    expect(clone.getAttribute('aria-hidden')).toBe('true')
    expect(clone.querySelectorAll('.marquee__item')).toHaveLength(2)
    expect(clone.querySelector('a').getAttribute('tabindex')).toBe('-1')
    expect(track.contains(clone)).toBe(true)
    expect(track.querySelector(':scope > a:not([tabindex])')).not.toBeNull()
  })
})

describe('marquee init', () => {
  it('com reduced motion não clona nem anima', async () => {
    media({ reduce: true })
    ;(await import('../../src/js/fx/marquee.js')).init()
    expect(document.querySelector('.marquee__clone')).toBeNull()
    expect(document.querySelectorAll('.marquee__item')).toHaveLength(2)
  })

  it('com movimento permitido clona uma vez e não lança', async () => {
    media()
    const { init } = await import('../../src/js/fx/marquee.js')
    expect(() => init()).not.toThrow()
    expect(document.querySelectorAll('.marquee__item')).toHaveLength(4)
  })

  it('é no-op sem [data-marquee]', async () => {
    media()
    document.body.innerHTML = ''
    const { init } = await import('../../src/js/fx/marquee.js')
    expect(() => init()).not.toThrow()
  })
})

describe('marquee direção', () => {
  it('segue girando com timeScale negativo por mais tempo que o avanço (rolar para cima)', async () => {
    media()
    const { init } = await import('../../src/js/fx/marquee.js')
    const { gsap } = await import('../../src/js/core/gsap.js')
    init()
    const track = document.querySelector('.marquee__track')
    const tween = gsap.getTweensOf(track).find(t => t.repeat() === -1)
    expect(tween).toBeDefined()

    // Relógio determinístico: avança a timeline raiz em passos fixos, sem esperar tempo real.
    gsap.ticker.lagSmoothing(0)
    let clock = gsap.globalTimeline.time()
    const step = dt => { clock += dt; gsap.updateRoot(clock) }

    tween.timeScale(1)
    step(0.3)
    const afterForward = tween.totalTime()

    tween.timeScale(-1)
    step(1) // recua mais do que avançou
    expect(tween.isActive()).toBe(true)
    expect(tween.totalTime()).toBeGreaterThan(0)
    expect(tween.totalTime()).toBeLessThan(afterForward)

    const before = tween.totalTime()
    step(0.5)
    expect(tween.totalTime()).toBeLessThan(before)
    expect(tween.isActive()).toBe(true)
  })
})
