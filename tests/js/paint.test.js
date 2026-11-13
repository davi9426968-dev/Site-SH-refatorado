// @vitest-environment happy-dom
// core/paint (Ruling 29): espera o primeiro quadro pintado para carregar os chunks lazy não críticos,
// sem travar numa aba oculta (que nunca pinta).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { whenPainted, PAINT_TIMEOUT } from '../../src/js/core/paint.js'

let saved
beforeEach(() => {
  saved = { po: globalThis.PerformanceObserver, raf: window.requestAnimationFrame }
  vi.useFakeTimers()
})
afterEach(() => {
  globalThis.PerformanceObserver = saved.po
  window.requestAnimationFrame = saved.raf
  vi.useRealTimers()
})

const flush = () => vi.advanceTimersByTimeAsync(0)

describe('whenPainted', () => {
  it('com Paint Timing, resolve no first-contentful-paint (e não antes)', async () => {
    let fire
    globalThis.PerformanceObserver = class {
      static supportedEntryTypes = ['paint']
      constructor(cb) { fire = cb }
      observe(opts) { expect(opts).toMatchObject({ type: 'paint', buffered: true }) }
      disconnect() {}
    }
    let done = false
    whenPainted().then(() => { done = true })
    await flush()
    expect(done).toBe(false)
    fire({ getEntries: () => [{ name: 'first-paint' }] })
    await flush()
    expect(done).toBe(false)
    fire({ getEntries: () => [{ name: 'first-contentful-paint' }] })
    await flush()
    expect(done).toBe(true)
  })

  it('sem Paint Timing, resolve depois de um quadro (rAF) e uma tarefa', async () => {
    globalThis.PerformanceObserver = undefined
    let frame
    window.requestAnimationFrame = cb => { frame = cb; return 1 }
    let done = false
    whenPainted().then(() => { done = true })
    await flush()
    expect(done).toBe(false)
    frame()
    await flush()
    expect(done).toBe(true)
  })

  it('aba oculta (nunca pinta): resolve no tempo-limite', async () => {
    globalThis.PerformanceObserver = class {
      static supportedEntryTypes = ['paint']
      observe() {}
      disconnect() {}
    }
    let done = false
    whenPainted().then(() => { done = true })
    await vi.advanceTimersByTimeAsync(PAINT_TIMEOUT - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })
})
