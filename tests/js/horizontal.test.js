// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const scrolls = vi.hoisted(() => [])
vi.mock('../../src/js/core/smooth-scroll.js', () => ({ scrollToTarget: (...args) => { scrolls.push(args) } }))

/** matchMedia que responde às larguras mínimas e à preferência de movimento. */
const media = ({ width = 1440, reduce = false } = {}) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true })
  window.matchMedia = vi.fn(q => {
    const min = q.match(/min-width:\s*(\d+)px/)
    const matches = min ? width >= Number(min[1]) : q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false
    return { matches, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
  })
}

const html = `<section class="places-rail" id="pontos"><div class="places-rail__viewport">
  <div class="places-rail__track" data-horizontal>
    <a class="card-place" href="/a/">A</a><a class="card-place" href="/b/">B</a><a class="card-place card-place--more" href="/c/">C</a>
  </div></div></section>`

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = html
})

describe('shouldPin', () => {
  it.each([[1023, false, false], [1024, false, true], [1440, true, false]])('shouldPin(%s,%s)=%s', async (w, r, out) => {
    const { shouldPin } = await import('../../src/js/fx/horizontal.js')
    expect(shouldPin(w, r)).toBe(out)
  })
})

describe('travelDistance', () => {
  it('anda até o fim do track encostar na margem direita: scrollWidth − largura + edge', async () => {
    const { travelDistance } = await import('../../src/js/fx/horizontal.js')
    expect(travelDistance(3000, 1440, 60)).toBe(1620)
  })

  it('nunca é negativo (track que já cabe na tela)', async () => {
    const { travelDistance } = await import('../../src/js/fx/horizontal.js')
    expect(travelDistance(900, 1440, 60)).toBe(0)
  })
})

describe('scrollForOffset', () => {
  it('leva a rolagem até o card ficar na margem esquerda, dentro do trecho fixado', async () => {
    const { scrollForOffset } = await import('../../src/js/fx/horizontal.js')
    const pin = { edge: 60, start: 5000, distance: 1620 }
    expect(scrollForOffset(60, pin)).toBe(5000)
    expect(scrollForOffset(860, pin)).toBe(5800)
    expect(scrollForOffset(9999, pin)).toBe(6620)
  })
})

describe('horizontal init', () => {
  const pinned = async () => {
    const { ScrollTrigger } = await import('../../src/js/core/gsap.js')
    const section = document.querySelector('section')
    return ScrollTrigger.getAll().filter(st => st.pin === section)
  }

  it('é no-op sem [data-horizontal]', async () => {
    media()
    document.body.innerHTML = ''
    const { init } = await import('../../src/js/fx/horizontal.js')
    expect(() => init()).not.toThrow()
  })

  it('com 1440 px e movimento permitido fixa a seção, marca is-pinned e liga o scrub', async () => {
    media({ width: 1440 })
    ;(await import('../../src/js/fx/horizontal.js')).init()
    expect(document.querySelector('section').classList.contains('is-pinned')).toBe(true)
    const triggers = await pinned()
    expect(triggers).toHaveLength(1)
    expect(triggers[0].vars.scrub).toBe(1)
    expect(triggers[0].vars.invalidateOnRefresh).toBe(true)
  })

  // Task 11 (minor): o focusin realinhava a página mesmo com o card focado já inteiro na tela.
  it('foco num card já inteiro na tela não mexe na rolagem; num card fora dela, rola até ele', async () => {
    media({ width: 1440 })
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true })
    scrolls.length = 0
    ;(await import('../../src/js/fx/horizontal.js')).init()
    const [a, b] = document.querySelectorAll('.card-place')
    a.getBoundingClientRect = () => ({ left: 100, right: 500, top: 200, bottom: 600, width: 400, height: 400, x: 100, y: 200 })
    b.getBoundingClientRect = () => ({ left: 1300, right: 1700, top: 200, bottom: 600, width: 400, height: 400, x: 1300, y: 200 })
    a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(scrolls).toHaveLength(0)
    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(scrolls).toHaveLength(1)
  })

  // Task 11 (minor): ao desfazer o pin (cruzar 1024 px ou ligar o movimento reduzido), as posições são refeitas.
  it('ao desfazer o pin numa mudança de media query tira is-pinned e refaz o ScrollTrigger depois', async () => {
    const listeners = new Set()
    let width = 1440
    Object.defineProperty(window, 'innerWidth', { get: () => width, configurable: true })
    window.matchMedia = vi.fn(q => {
      const min = q.match(/min-width:\s*(\d+)px/)
      const matches = min ? width >= Number(min[1]) : q.includes('no-preference')
      return { matches, media: q, addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), addEventListener() {}, removeEventListener() {} }
    })
    ;(await import('../../src/js/fx/horizontal.js')).init()
    const { ScrollTrigger } = await import('../../src/js/core/gsap.js')
    const section = document.querySelector('section')
    expect(section.classList.contains('is-pinned')).toBe(true)
    const log = []
    const onRefresh = () => log.push(['refresh', section.classList.contains('is-pinned')])
    ScrollTrigger.addEventListener('refresh', onRefresh)
    width = 1000
    await new Promise(r => setTimeout(r, 5)) // o matchMedia da GSAP ignora mudanças a menos de 2 ms da anterior
    listeners.forEach(fn => fn())
    ScrollTrigger.removeEventListener('refresh', onRefresh)
    expect(section.classList.contains('is-pinned')).toBe(false)
    expect(log).toContainEqual(['refresh', false])
  })

  it.each([[1023, false], [1440, true]])('com %s px e reduced=%s não fixa (fica a rolagem nativa do CSS)', async (width, reduce) => {
    media({ width, reduce })
    ;(await import('../../src/js/fx/horizontal.js')).init()
    expect(document.querySelector('section').classList.contains('is-pinned')).toBe(false)
    expect(await pinned()).toHaveLength(0)
    expect(document.querySelector('[data-horizontal]').style.transform).toBe('')
  })
})
