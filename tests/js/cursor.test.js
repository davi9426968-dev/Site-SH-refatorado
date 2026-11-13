// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const media = ({ fine, reduce }) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('pointer: fine') ? fine : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {},
  }))
}

beforeEach(() => {
  vi.resetModules()
  document.documentElement.className = ''
  document.body.innerHTML = ''
})
afterEach(() => vi.restoreAllMocks())

describe('cursor', () => {
  it('não cria cursor quando finePointer() é falso', async () => {
    media({ fine: false, reduce: false })
    const { init } = await import('../../src/js/ui/cursor.js')
    init()
    expect(document.querySelector('.cursor-dot')).toBeNull()
    expect(document.documentElement.classList.contains('has-cursor')).toBe(false)
  })

  it('cria .cursor-dot e .cursor-ring e adiciona html.has-cursor com mouse e sem reduced', async () => {
    media({ fine: true, reduce: false })
    const { init } = await import('../../src/js/ui/cursor.js')
    init()
    expect(document.querySelector('.cursor-dot')).not.toBeNull()
    expect(document.querySelector('.cursor-ring .cursor-ring__label')).not.toBeNull()
    expect(document.documentElement.classList.contains('has-cursor')).toBe(true)
  })

  it('lerp interpola', async () => {
    const { lerp } = await import('../../src/js/ui/cursor.js')
    expect(lerp(0, 10, 0.5)).toBe(5)
  })
})

describe('cursor reduzido', () => {
  it('não cria cursor com movimento reduzido, mesmo com mouse', async () => {
    media({ fine: true, reduce: true })
    const { init } = await import('../../src/js/ui/cursor.js')
    init()
    expect(document.querySelector('.cursor-dot')).toBeNull()
    expect(document.documentElement.classList.contains('has-cursor')).toBe(false)
  })
})
