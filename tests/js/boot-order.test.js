// @vitest-environment happy-dom
// Ordem do boot (Rulings 4, 28 e 29): __fxReady e os módulos eager não esperam imagem nem quadro pintado,
// a intro (chunk lazy crítico) começa sem espera, com ou sem intro-on, e só os chunks lazy não críticos
// esperam o primeiro quadro pintado.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const log = vi.hoisted(() => [])
const refreshes = vi.hoisted(() => [])
const stEvents = vi.hoisted(() => [])
const stub = name => ({ init: () => { log.push(name) } })
vi.mock('../../src/js/core/gsap.js', () => ({ ScrollTrigger: { refresh(safe) { refreshes.push(safe) }, addEventListener(type) { stEvents.push(type) } } }))
vi.mock('../../src/js/core/smooth-scroll.js', () => ({ initSmoothScroll: () => { log.push('lenis') } }))
vi.mock('../../src/js/ui/header.js', () => stub('header'))
vi.mock('../../src/js/ui/menu.js', () => stub('menu'))
vi.mock('../../src/js/ui/cursor.js', () => stub('cursor'))
vi.mock('../../src/js/ui/spark.js', () => stub('spark'))
vi.mock('../../src/js/ui/magnet.js', () => stub('magnet'))
vi.mock('../../src/js/ui/back-to-top.js', () => stub('back-to-top'))
vi.mock('../../src/js/ui/share.js', () => stub('share'))
vi.mock('../../src/js/fx/fit-text.js', () => stub('fit-text'))
vi.mock('../../src/js/fx/reveal.js', () => stub('reveal'))
vi.mock('../../src/js/fx/split.js', () => stub('split'))
vi.mock('../../src/js/fx/counters.js', () => stub('counters'))
vi.mock('../../src/js/fx/parallax.js', () => stub('parallax'))
vi.mock('../../src/js/fx/marquee.js', () => stub('marquee'))
vi.mock('../../src/js/fx/bento.js', () => stub('bento'))
vi.mock('../../src/js/fx/hover-preview.js', () => stub('hover-preview'))
vi.mock('../../src/js/ui/intro.js', () => stub('intro'))
vi.mock('../../src/js/fx/hero-themes.js', () => stub('hero-themes'))
vi.mock('../../src/js/fx/timeline.js', () => stub('timeline'))

let paint
let savedPO
beforeEach(() => {
  vi.resetModules()
  log.length = 0
  refreshes.length = 0
  stEvents.length = 0
  delete window.__fxReady
  document.documentElement.className = ''
  // Imagem de hero que nunca termina de carregar: o boot não pode esperar por ela.
  document.body.innerHTML = '<img fetchpriority="high" src="/x.webp" alt=""><div data-intro></div><section data-hero-themes></section><div data-timeline></div>'
  window.requestAnimationFrame = () => 0 // aba em segundo plano: rAF nunca dispara
  // Paint Timing controlado pelo teste: o primeiro quadro só "pinta" quando paint() é chamado.
  savedPO = globalThis.PerformanceObserver
  paint = () => {}
  globalThis.PerformanceObserver = class {
    static supportedEntryTypes = ['paint']
    constructor(cb) { paint = () => cb({ getEntries: () => [{ name: 'first-contentful-paint' }] }) }
    observe() {}
    disconnect() {}
  }
})
afterEach(() => { globalThis.PerformanceObserver = savedPO })

const tick = () => new Promise(r => setTimeout(r, 0))
const boot = async () => { await import('../../src/main.js'); await tick() }

describe('main.js: ordem do boot', () => {
  it('define __fxReady e roda os eager no mesmo tick, sem esperar imagem nem rAF', async () => {
    await boot()
    expect(window.__fxReady).toBe(true)
    expect(log.slice(0, 3)).toEqual(['lenis', 'header', 'menu'])
    expect(log).toContain('reveal')
  })

  it('com intro-on a intro inicia sem espera, depois dos eager', async () => {
    document.documentElement.classList.add('intro-on')
    await boot()
    expect(window.__fxReady).toBe(true)
    expect(log.indexOf('intro')).toBeGreaterThan(log.indexOf('reveal'))
  })

  // Ruling 29: hero de temas, linha do tempo etc. só depois do primeiro quadro pintado (a intro, não).
  it('os chunks lazy não críticos esperam o primeiro quadro pintado; a intro não', async () => {
    document.documentElement.classList.add('intro-on')
    await boot()
    expect(window.__fxReady).toBe(true)
    expect(log).toContain('intro')
    expect(log).not.toContain('hero-themes')
    expect(log).not.toContain('timeline')
    paint()
    await tick()
    expect(log).toEqual(expect.arrayContaining(['hero-themes', 'timeline']))
  })

  // Fix round 1: o refresh troca as seções fixadas de lugar no DOM e derrubava o foco do teclado.
  it('registra a guarda de foco nos refreshes do ScrollTrigger', async () => {
    await boot()
    expect(stEvents).toEqual(expect.arrayContaining(['refreshInit', 'refresh']))
  })

  // Fontes que chegam depois (o itálico de destaque só baixa quando a intro termina) mudam alturas.
  it('refaz o ScrollTrigger (seguro, com espera) quando fontes terminam de carregar depois do boot', async () => {
    const listeners = {}
    Object.defineProperty(document, 'fonts', { configurable: true, value: {
      ready: Promise.resolve(),
      addEventListener: (type, fn) => { listeners[type] = fn },
    } })
    await boot()
    expect(refreshes).toHaveLength(1) // fonts.ready
    expect(typeof listeners.loadingdone).toBe('function')
    listeners.loadingdone()
    expect(refreshes.at(-1)).toBe(true)
    delete document.fonts
  })
})
