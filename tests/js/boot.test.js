// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'partials', 'boot.html'), 'utf8')
const code = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
const run = () => new Function(code)()
const media = reduce => { window.matchMedia = vi.fn(() => ({ matches: reduce })) }
const cls = () => document.documentElement.classList

beforeEach(() => {
  vi.useFakeTimers()
  document.documentElement.className = ''
  delete window.__fxReady
})
afterEach(() => vi.useRealTimers())

describe('boot', () => {
  it('adiciona js e motion-ok sem preferência de movimento reduzido', () => {
    media(false)
    run()
    expect(cls().contains('js')).toBe(true)
    expect(cls().contains('motion-ok')).toBe(true)
  })

  it('não adiciona motion-ok com reduce', () => {
    media(true)
    run()
    expect(cls().contains('js')).toBe(true)
    expect(cls().contains('motion-ok')).toBe(false)
  })

  it('remove motion-ok após 4000 ms se window.__fxReady não existir', () => {
    media(false)
    run()
    vi.advanceTimersByTime(3999)
    expect(cls().contains('motion-ok')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(cls().contains('motion-ok')).toBe(false)
  })

  it('mantém motion-ok se window.__fxReady existir', () => {
    media(false)
    run()
    window.__fxReady = true
    vi.advanceTimersByTime(4100)
    expect(cls().contains('motion-ok')).toBe(true)
  })
})
