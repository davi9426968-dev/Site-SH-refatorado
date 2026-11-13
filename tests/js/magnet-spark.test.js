// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ fine, reduce }) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('pointer: fine') ? fine : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {},
  }))
}

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = '<a data-magnetic href="/">x</a>'
})

describe('spark', () => {
  it('é no-op com movimento reduzido', async () => {
    media({ fine: true, reduce: true })
    ;(await import('../../src/js/ui/spark.js')).init()
    expect(document.querySelector('.spark-canvas')).toBeNull()
  })

  it('não lança quando canvas.getContext devolve null (happy-dom)', async () => {
    media({ fine: true, reduce: false })
    HTMLCanvasElement.prototype.getContext = () => null
    const { init } = await import('../../src/js/ui/spark.js')
    expect(() => init()).not.toThrow()
    expect(document.querySelector('.spark-canvas')).toBeNull()
  })
})

describe('magnet', () => {
  it('é no-op com ponteiro grosso ou movimento reduzido', async () => {
    const el = document.querySelector('[data-magnetic]')
    const move = () => window.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 5 }))
    media({ fine: false, reduce: false })
    ;(await import('../../src/js/ui/magnet.js')).init()
    move()
    expect(el.style.transform).toBe('')
    vi.resetModules()
    media({ fine: true, reduce: true })
    ;(await import('../../src/js/ui/magnet.js')).init()
    move()
    expect(el.style.transform).toBe('')
  })

  it('é no-op sem [data-magnetic]', async () => {
    media({ fine: true, reduce: false })
    document.body.innerHTML = ''
    expect(() => import('../../src/js/ui/magnet.js').then(m => m.init())).not.toThrow()
  })
})
