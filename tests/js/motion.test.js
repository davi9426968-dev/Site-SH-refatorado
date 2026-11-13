// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { finePointer, onMotionChange, reducedMotion } from '../../src/js/core/motion.js'

const mockMedia = matches => {
  window.matchMedia = vi.fn(query => ({
    matches: matches(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }))
}

afterEach(() => vi.restoreAllMocks())

describe('motion', () => {
  it('reducedMotion lê prefers-reduced-motion', () => {
    mockMedia(q => q === '(prefers-reduced-motion: reduce)')
    expect(reducedMotion()).toBe(true)
    mockMedia(() => false)
    expect(reducedMotion()).toBe(false)
  })

  it('finePointer exige (hover: hover) and (pointer: fine)', () => {
    mockMedia(q => q === '(hover: hover) and (pointer: fine)')
    expect(finePointer()).toBe(true)
    expect(window.matchMedia).toHaveBeenCalledWith('(hover: hover) and (pointer: fine)')
    mockMedia(() => false)
    expect(finePointer()).toBe(false)
  })

  it('onMotionChange devolve a função que cancela', () => {
    mockMedia(() => false)
    const off = onMotionChange(() => {})
    expect(typeof off).toBe('function')
    off()
  })
})
