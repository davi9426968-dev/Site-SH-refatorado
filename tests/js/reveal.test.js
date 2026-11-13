// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ reduce }) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = `<h2 data-reveal>a</h2><div data-reveal="clip"><img alt="" src="/x.jpg"></div>
    <ul data-reveal-stagger><li>1</li><li>2</li></ul>`
})

describe('reveal', () => {
  it('com reduced motion não aplica estilo inline nos [data-reveal]', async () => {
    media({ reduce: true })
    ;(await import('../../src/js/fx/reveal.js')).init()
    for (const el of document.querySelectorAll('[data-reveal], [data-reveal-stagger] > *')) {
      expect(el.getAttribute('style')).toBeNull()
    }
  })

  it('é no-op sem alvos e não lança com movimento permitido', async () => {
    media({ reduce: false })
    const { init } = await import('../../src/js/fx/reveal.js')
    expect(() => init()).not.toThrow()
    document.body.innerHTML = ''
    expect(() => init()).not.toThrow()
  })
})
