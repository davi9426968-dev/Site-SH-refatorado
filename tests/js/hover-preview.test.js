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
  document.body.innerHTML = `<div class="hover-list" data-hover-preview>
    <a class="hover-list__row" href="/eventos/" data-preview-src="/a.jpg">A</a>
    <a class="hover-list__row" href="/eventos/">B</a></div>`
})

describe('previewSource', () => {
  it('lê data-preview-src ou devolve null', async () => {
    const { previewSource } = await import('../../src/js/fx/hover-preview.js')
    const [a, b] = document.querySelectorAll('.hover-list__row')
    expect(previewSource(a)).toBe('/a.jpg')
    expect(previewSource(b)).toBeNull()
  })
})

describe('hover-preview init', () => {
  it('não cria .hover-preview sem finePointer e as linhas continuam <a href>', async () => {
    media({ fine: false })
    ;(await import('../../src/js/fx/hover-preview.js')).init()
    expect(document.querySelector('.hover-preview')).toBeNull()
    const rows = [...document.querySelectorAll('.hover-list__row')]
    expect(rows.every(r => r.tagName === 'A' && r.getAttribute('href') === '/eventos/')).toBe(true)
  })

  it('com mouse cria .hover-preview com duas imagens aria-hidden e não impede a navegação', async () => {
    media()
    ;(await import('../../src/js/fx/hover-preview.js')).init()
    const prev = document.querySelector('.hover-preview')
    expect(prev).not.toBeNull()
    expect(prev.getAttribute('aria-hidden')).toBe('true')
    expect(prev.querySelectorAll('img')).toHaveLength(2)
    const row = document.querySelector('.hover-list__row')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    row.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
  })

  // Ruling 27 / Task 4: numa linha sem data-preview-src a prévia some (antes ficava a foto da linha anterior).
  it('esconde a prévia ao passar para uma linha sem data-preview-src', async () => {
    media()
    ;(await import('../../src/js/fx/hover-preview.js')).init()
    const prev = document.querySelector('.hover-preview')
    const [a, b] = document.querySelectorAll('.hover-list__row')
    a.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(prev.classList.contains('is-visible')).toBe(true)
    b.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(prev.classList.contains('is-visible')).toBe(false)
    a.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))
    expect(prev.classList.contains('is-visible')).toBe(true)
  })
})
