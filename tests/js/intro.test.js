// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gsap } from '../../src/js/core/gsap.js'
import { init, shouldShowIntro } from '../../src/js/ui/intro.js'

const index = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
// O script inline do <head> que liga a intro (o único <script> sem atributos que fala de sh-intro).
const inline = index.match(/<script>((?:(?!<\/script>)[\s\S])*sh-intro(?:(?!<\/script>)[\s\S])*)<\/script>/)?.[1]
const introMarkup = () => new DOMParser().parseFromString(index, 'text/html').querySelector('[data-intro]').outerHTML

const root = document.documentElement
const cls = () => root.classList
const media = reduce => { window.matchMedia = vi.fn(q => ({ matches: q.includes('reduce') ? reduce : false, addEventListener() {}, removeEventListener() {} })) }
const setStorage = value => Object.defineProperty(window, 'sessionStorage', { value, configurable: true, writable: true })
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

let realStorage, done
const onDone = () => { done++ }

beforeEach(() => {
  realStorage = window.sessionStorage
  realStorage.clear()
  root.className = 'js motion-ok'
  root.style.overflow = ''
  delete window.__shIntro
  done = 0
  window.addEventListener('sh:intro-done', onDone)
  media(false)
})

afterEach(() => {
  esc() // termina qualquer intro que tenha ficado aberta
  window.removeEventListener('sh:intro-done', onDone)
  setStorage(realStorage)
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('shouldShowIntro', () => {
  it.each([
    [{ getItem: () => null }, false, true], [{ getItem: () => '1' }, false, false],
    [{ getItem: () => null }, true, false], [null, false, false],
    [{ getItem: () => { throw new Error() } }, false, false],
  ])('shouldShowIntro(%o, %s) = %s', (s, r, out) => expect(shouldShowIntro(s, r)).toBe(out))

  it('olha a chave sh-intro', () => {
    const getItem = vi.fn(() => null)
    shouldShowIntro({ getItem }, false)
    expect(getItem).toHaveBeenCalledWith('sh-intro')
  })
})

describe('script inline do <head>', () => {
  const run = () => new Function(inline)()

  it('existe no index.html', () => expect(inline).toBeTruthy())

  it.each([
    ['sem a chave', { getItem: () => null }, false],
    ['com a chave', { getItem: () => '1' }, false],
    ['com movimento reduzido', { getItem: () => null }, true],
    ['sem storage', null, false],
    ['com storage que lança', { getItem: () => { throw new Error() } }, false],
  ])('repete a regra de shouldShowIntro (%s)', (_, storage, reduce) => {
    root.className = 'js'
    media(reduce)
    setStorage(storage)
    run()
    expect(cls().contains('intro-on')).toBe(shouldShowIntro(storage, reduce))
  })

  it('não quebra quando ler window.sessionStorage lança (cookies bloqueados)', () => {
    root.className = 'js'
    Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('SecurityError') }, configurable: true })
    expect(run).not.toThrow()
    expect(cls().contains('intro-on')).toBe(false)
  })

  it('se o módulo da intro não assumir em 4 s, tira intro-on e avisa sh:intro-done', () => {
    vi.useFakeTimers()
    setStorage({ getItem: () => null })
    run()
    expect(cls().contains('intro-on')).toBe(true)
    vi.advanceTimersByTime(3999)
    expect(cls().contains('intro-on')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(cls().contains('intro-on')).toBe(false)
    expect(done).toBe(1)
  })

  it('mantém intro-on depois de 4 s quando o módulo já assumiu', () => {
    vi.useFakeTimers()
    setStorage({ getItem: () => null })
    run()
    window.__shIntro = true
    vi.advanceTimersByTime(5000)
    expect(cls().contains('intro-on')).toBe(true)
    expect(done).toBe(0)
  })
})

describe('intro', () => {
  beforeEach(() => { document.body.innerHTML = introMarkup() })

  it('o overlay tem brasão, nome e contagem, e é decorativo', () => {
    const el = document.querySelector('[data-intro]')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelector('img').getAttribute('src')).toMatch(/^\/img\/brand\/brasao-\d+\.png$/)
    expect(el.textContent).toContain('Santo Hipólito')
    expect(el.querySelector('.intro__count')).not.toBeNull()
  })

  it('sem intro-on, init não faz nada', () => {
    init()
    expect(root.style.overflow).toBe('')
    expect(window.__shIntro).toBeUndefined()
    esc()
    expect(done).toBe(0)
  })

  it('com intro-on, trava a rolagem e marca que assumiu', () => {
    cls().add('intro-on')
    init()
    expect(window.__shIntro).toBe(true)
    expect(root.style.overflow).toBe('hidden')
  })

  it('Esc pula: tira intro-on, grava sh-intro, destrava a rolagem e dispara sh:intro-done uma vez', () => {
    cls().add('intro-on')
    init()
    esc()
    expect(cls().contains('intro-on')).toBe(false)
    expect(document.querySelector('[data-intro]').classList.contains('is-leaving')).toBe(false)
    expect(window.sessionStorage.getItem('sh-intro')).toBe('1')
    expect(root.style.overflow).toBe('')
    expect(done).toBe(1)
    esc()
    expect(done).toBe(1)
  })

  it('clique (ou toque) no overlay pula a intro', () => {
    cls().add('intro-on')
    init()
    document.querySelector('[data-intro]').click()
    expect(cls().contains('intro-on')).toBe(false)
    expect(done).toBe(1)
  })

  it('outras teclas não pulam', () => {
    cls().add('intro-on')
    init()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(cls().contains('intro-on')).toBe(true)
  })

  it('a contagem vai de 0 a 100; quando a cortina começa a subir o hero começa, e no fim a intro some', () => {
    cls().add('intro-on')
    init()
    const el = document.querySelector('[data-intro]')
    const count = el.querySelector('.intro__count')
    expect(count.textContent.trim()).toBe('0')
    // Relógio determinístico da GSAP, como no teste do marquee.
    gsap.ticker.lagSmoothing(0)
    let clock = gsap.globalTimeline.time()
    const step = dt => { clock += dt; gsap.updateRoot(clock) }
    for (let i = 0; i < 10; i++) step(0.1) // 1,0 s: ainda contando
    expect(Number(count.textContent)).toBeLessThan(100)
    expect(cls().contains('intro-on')).toBe(true)
    expect(done).toBe(0)
    for (let i = 0; i < 4; i++) step(0.1) // 1,4 s: a cortina está subindo
    expect(count.textContent.trim()).toBe('100')
    expect(cls().contains('intro-on')).toBe(false)
    expect(el.classList.contains('is-leaving')).toBe(true)
    expect(window.sessionStorage.getItem('sh-intro')).toBe('1')
    expect(done).toBe(1)
    expect(root.style.overflow).toBe('hidden')
    for (let i = 0; i < 8; i++) step(0.1) // 2,2 s: a cortina terminou
    expect(el.classList.contains('is-leaving')).toBe(false)
    expect(root.style.overflow).toBe('')
    expect(done).toBe(1)
  })

  it('Esc durante a cortina termina na hora, sem disparar sh:intro-done de novo', () => {
    cls().add('intro-on')
    init()
    const el = document.querySelector('[data-intro]')
    gsap.ticker.lagSmoothing(0)
    let clock = gsap.globalTimeline.time()
    for (let i = 0; i < 14; i++) { clock += 0.1; gsap.updateRoot(clock) }
    expect(done).toBe(1)
    esc()
    expect(el.classList.contains('is-leaving')).toBe(false)
    expect(root.style.overflow).toBe('')
    expect(done).toBe(1)
  })
})
