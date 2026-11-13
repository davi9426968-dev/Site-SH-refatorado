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
  document.body.innerHTML = ''
})

describe('formatCount', () => {
  it('formata em pt-BR', async () => {
    const { formatCount } = await import('../../src/js/fx/counters.js')
    expect(formatCount(2717)).toBe('2.717')
    expect(formatCount(60.43, { decimals: 2 })).toBe('60,43')
  })
})

describe('yearsSince', () => {
  it.each([['2026-11-10', 63], ['2027-02-28', 63], ['2027-03-01', 64]])(
    'yearsSince(1963-03-01, %s) = %s',
    async (d, n) => {
      const { yearsSince } = await import('../../src/js/fx/counters.js')
      expect(yearsSince('1963-03-01', new Date(`${d}T12:00:00`))).toBe(n)
    },
  )
})

describe('counters init', () => {
  it('com reduced motion o contador mantém o valor final do HTML', async () => {
    media({ reduce: true })
    document.body.innerHTML = '<p class="stat__number" data-count-to="2717"><span class="stat__value">2.717</span></p>'
    ;(await import('../../src/js/fx/counters.js')).init()
    expect(document.querySelector('.stat__value').textContent).toBe('2.717')
  })

  it('data-count-years-since escreve o valor calculado, também com reduced motion', async () => {
    media({ reduce: true })
    document.body.innerHTML = '<p class="stat__number" data-count-to="1" data-count-years-since="1963-03-01"><span class="stat__value">1</span></p>'
    const { init, yearsSince } = await import('../../src/js/fx/counters.js')
    init()
    expect(document.querySelector('.stat__value').textContent).toBe(String(yearsSince('1963-03-01')))
  })

  it('não lança sem contadores nem com movimento permitido', async () => {
    media({ reduce: false })
    const { init } = await import('../../src/js/fx/counters.js')
    expect(() => init()).not.toThrow()
    document.body.innerHTML = '<p class="stat__number" data-count-to="430"><span class="stat__value">430</span></p>'
    expect(() => init()).not.toThrow()
  })
})
