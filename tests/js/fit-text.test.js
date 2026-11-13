// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fitFontSize, fitText, init } from '../../src/js/fx/fit-text.js'

beforeEach(() => { document.body.innerHTML = '' })

describe('fitFontSize', () => {
  it('escala para caber e respeita limites', () => {
    expect(fitFontSize(2000, 200, 1000)).toBe(100)
    expect(fitFontSize(100, 200, 1000, { max: 400 })).toBe(400)
    expect(fitFontSize(10000, 20, 100, { min: 16 })).toBe(16)
  })
})

describe('fitText', () => {
  it('ajusta o font-size à largura do pai vezes data-fit-width', () => {
    document.body.innerHTML = '<div id="p"><p id="t" data-fit-text data-fit-width="0.5" style="font-size:100px">Santo Hipólito</p></div>'
    const parent = document.getElementById('p')
    const el = document.getElementById('t')
    Object.defineProperty(parent, 'clientWidth', { value: 1000, configurable: true })
    Object.defineProperty(el, 'scrollWidth', { value: 1000, configurable: true })
    fitText(el)
    expect(el.style.fontSize).toBe('50px')
  })

  it('não mexe quando não há medida (largura 0)', () => {
    document.body.innerHTML = '<div><p data-fit-text style="font-size:40px">x</p></div>'
    const el = document.querySelector('p')
    fitText(el)
    expect(el.style.fontSize).toBe('40px')
  })

  it('init não registra resize sem [data-fit-text]', () => {
    const add = vi.spyOn(window, 'addEventListener')
    init()
    expect(add).not.toHaveBeenCalledWith('resize', expect.anything(), expect.anything())
    add.mockRestore()
  })
})
