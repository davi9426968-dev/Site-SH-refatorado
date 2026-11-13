// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ reduce = false } = {}) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('no-preference') ? !reduce : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

const html = `<div class="timeline" data-timeline>
  <div class="timeline__line"><div class="timeline__progress"></div></div>
  <ol class="timeline__list">
    <li class="timeline__item"><p class="timeline__date">Origens</p></li>
    <li class="timeline__item"><p class="timeline__date">1910</p></li>
    <li class="timeline__item"><p class="timeline__date">1943</p></li>
  </ol></div>`

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = html
})

const items = () => [...document.querySelectorAll('.timeline__item')]

describe('timeline init', () => {
  it('é no-op sem [data-timeline]', async () => {
    media()
    document.body.innerHTML = ''
    const { init } = await import('../../src/js/fx/timeline.js')
    expect(() => init()).not.toThrow()
  })

  it('com reduced motion não cria gatilhos: a linha fica inteira e todos os itens visíveis', async () => {
    media({ reduce: true })
    ;(await import('../../src/js/fx/timeline.js')).init()
    const { ScrollTrigger } = await import('../../src/js/core/gsap.js')
    expect(ScrollTrigger.getAll()).toHaveLength(0)
    expect(document.querySelector('.timeline__progress').style.transform).toBe('')
    expect(items()).toHaveLength(3)
  })

  it('com movimento, o progresso vai de scaleY 0 a 1 ligado ao scroll (scrub)', async () => {
    media()
    ;(await import('../../src/js/fx/timeline.js')).init()
    const { gsap, ScrollTrigger } = await import('../../src/js/core/gsap.js')
    const progress = document.querySelector('.timeline__progress')
    const st = ScrollTrigger.getAll().find(t => t.animation?.targets().includes(progress))
    expect(st?.vars.scrub).toBe(true)
    // O happy-dom não tem geometria (tudo em 0) e o gatilho já nasce no fim: confere o tween em si.
    st.animation.progress(0)
    expect(gsap.getProperty(progress, 'scaleY')).toBe(0)
    st.animation.progress(1)
    expect(gsap.getProperty(progress, 'scaleY')).toBe(1)
  })

  it('cada item ganha is-active ao passar do centro e perde ao voltar', async () => {
    media()
    ;(await import('../../src/js/fx/timeline.js')).init()
    const { ScrollTrigger } = await import('../../src/js/core/gsap.js')
    const [first, second] = items()
    const of = el => ScrollTrigger.getAll().find(t => t.trigger === el)
    expect(of(first).vars.start).toBe('top center')
    // Sem geometria todos já "passaram do centro" ao nascer: volta todos antes de conferir um por um.
    items().forEach(i => of(i).vars.onLeaveBack())
    of(first).vars.onEnter()
    expect(first.classList.contains('is-active')).toBe(true)
    expect(second.classList.contains('is-active')).toBe(false)
    of(first).vars.onLeaveBack()
    expect(first.classList.contains('is-active')).toBe(false)
  })
})
