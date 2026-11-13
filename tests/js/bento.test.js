// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ fine = true, reduce = false } = {}) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('pointer: fine') ? fine : q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = '<div class="bento" data-bento><a class="card-bento" href="/eventos/">x</a></div>'
})

describe('glowIntensity', () => {
  it.each([[50, 50, 1], [400, 50, 0], [200, 50, 0.5]])('em (%s,%s) = %s', async (x, y, v) => {
    const { glowIntensity } = await import('../../src/js/fx/bento.js')
    expect(glowIntensity({ left: 0, top: 0, width: 100, height: 100 }, x, y, 200)).toBeCloseTo(v)
  })
})

describe('bento init', () => {
  it('sem mouse não cria o holofote e o card segue sendo <a href>', async () => {
    media({ fine: false })
    ;(await import('../../src/js/fx/bento.js')).init()
    expect(document.querySelector('.spotlight')).toBeNull()
    expect(document.querySelector('a.card-bento').getAttribute('href')).toBe('/eventos/')
  })

  it('com movimento reduzido não cria o holofote', async () => {
    media({ reduce: true })
    ;(await import('../../src/js/fx/bento.js')).init()
    expect(document.querySelector('.spotlight')).toBeNull()
  })

  it('com mouse cria o holofote aria-hidden e atualiza --glow-intensity no pointermove', async () => {
    media()
    const card = document.querySelector('.card-bento')
    card.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 })
    ;(await import('../../src/js/fx/bento.js')).init()
    const spot = document.querySelector('.spotlight')
    expect(spot).not.toBeNull()
    expect(spot.getAttribute('aria-hidden')).toBe('true')
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 50, clientY: 50, pointerType: 'mouse' }))
    expect(card.style.getPropertyValue('--glow-intensity')).toBe('1')
    expect(card.style.getPropertyValue('--glow-x')).toBe('50px')
  })
})
