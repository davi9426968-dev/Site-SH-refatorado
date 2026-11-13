// @vitest-environment happy-dom
// fx/split (Task 13b): os títulos perto da tela são divididos no boot; os de baixo só quando chegam perto,
// porque dividir todos de uma vez era a maior tarefa do boot da Home.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const created = vi.hoisted(() => [])
const refreshes = vi.hoisted(() => [])
vi.mock('../../src/js/core/gsap.js', () => ({
  gsap: {
    from: () => {},
    matchMedia: () => ({
      add(query, fn) {
        if (!window.matchMedia(query).matches) return
        const ctx = { add: f => f() }
        fn(ctx)
      },
    }),
  },
  ScrollTrigger: { refresh: safe => { refreshes.push(safe) } },
  SplitText: {
    create(el, opts) {
      created.push(el.id)
      opts.onSplit?.({ chars: [], lines: [] })
    },
  },
}))

const media = ({ reduce }) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

let observers
let originalIO
const rectAt = (el, top) => {
  el.getBoundingClientRect = () => ({ top, bottom: top + 60, left: 0, right: 300, width: 300, height: 60, x: 0, y: top })
}

beforeEach(() => {
  vi.resetModules()
  created.length = 0
  refreshes.length = 0
  observers = []
  originalIO = globalThis.IntersectionObserver
  globalThis.IntersectionObserver = class {
    constructor(cb, opts) { this.cb = cb; this.opts = opts; this.els = new Set(); observers.push(this) }
    observe(el) { this.els.add(el) }
    unobserve(el) { this.els.delete(el) }
    disconnect() { this.els.clear() }
    fire(el) { this.cb([{ target: el, isIntersecting: true }], this) }
  }
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  document.body.innerHTML = `<h2 id="perto" data-split>Perto</h2><h2 id="longe" data-split>Longe</h2>
    <p id="linhas" data-split-lines>Texto longo</p>`
  rectAt(document.getElementById('perto'), 300)
  rectAt(document.getElementById('longe'), 5000)
  rectAt(document.getElementById('linhas'), 6000)
})

afterEach(() => { globalThis.IntersectionObserver = originalIO })

describe('split', () => {
  it('divide no boot só os títulos perto da tela; os de baixo esperam o IntersectionObserver', async () => {
    media({ reduce: false })
    ;(await import('../../src/js/fx/split.js')).init()
    expect(created).toEqual(['perto'])
    expect(observers).toHaveLength(1)
    expect([...observers[0].els].map(el => el.id).sort()).toEqual(['linhas', 'longe'])
  })

  it('divide o título adiado quando ele chega perto, uma vez só', async () => {
    media({ reduce: false })
    ;(await import('../../src/js/fx/split.js')).init()
    const longe = document.getElementById('longe')
    observers[0].fire(longe)
    observers[0].fire(longe)
    expect(created).toEqual(['perto', 'longe'])
    expect(observers[0].els.has(longe)).toBe(false)
  })

  it('um título logo abaixo da tela (dentro da margem) também espera o observador, que o divide no 1º quadro', async () => {
    media({ reduce: false })
    rectAt(document.getElementById('longe'), 1000)
    ;(await import('../../src/js/fx/split.js')).init()
    expect(created).toEqual(['perto'])
    expect(observers[0].els.has(document.getElementById('longe'))).toBe(true)
  })

  // Minor da revisão: uma divisão tardia cria gatilhos depois do refresh inicial; o ScrollTrigger é refeito
  // (refresh(true): espera um quadro e o fim da rolagem, e várias chamadas seguidas viram uma só).
  it('depois de uma divisão tardia pede um refresh seguro do ScrollTrigger; no boot, não', async () => {
    media({ reduce: false })
    ;(await import('../../src/js/fx/split.js')).init()
    expect(refreshes).toEqual([])
    observers[0].fire(document.getElementById('longe'))
    expect(refreshes).toEqual([true])
  })

  it('a margem do observador cobre uma tela abaixo, para dividir antes de o título aparecer', async () => {
    media({ reduce: false })
    ;(await import('../../src/js/fx/split.js')).init()
    expect(observers[0].opts.rootMargin).toMatch(/100%/)
  })

  it('sem IntersectionObserver divide tudo no boot', async () => {
    media({ reduce: false })
    delete globalThis.IntersectionObserver
    ;(await import('../../src/js/fx/split.js')).init()
    expect(created.sort()).toEqual(['linhas', 'longe', 'perto'])
  })

  it('com movimento reduzido não divide nem observa nada', async () => {
    media({ reduce: true })
    ;(await import('../../src/js/fx/split.js')).init()
    expect(created).toEqual([])
    expect(observers).toHaveLength(0)
  })
})
