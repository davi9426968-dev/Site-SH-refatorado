// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { init, sharePage } from '../../src/js/ui/share.js'

const data = { title: 'Santo Hipólito', url: 'https://x.test/' }

describe('sharePage', () => {
  it('usa navigator.share quando existe → "shared"', async () => {
    const share = vi.fn().mockResolvedValue()
    expect(await sharePage(data, { share })).toBe('shared')
    expect(share).toHaveBeenCalledWith(data)
  })

  it('AbortError (usuário dispensou) → "shared", sem cair no clipboard', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    const writeText = vi.fn()
    expect(await sharePage(data, { share, clipboard: { writeText } })).toBe('shared')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('outro erro de share cai no clipboard → "copied"', async () => {
    const share = vi.fn().mockRejectedValue(new Error('falhou'))
    const writeText = vi.fn().mockResolvedValue()
    expect(await sharePage(data, { share, clipboard: { writeText } })).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(data.url)
  })

  it('sem share, copia com clipboard.writeText → "copied"', async () => {
    const writeText = vi.fn().mockResolvedValue()
    expect(await sharePage(data, { clipboard: { writeText } })).toBe('copied')
    expect(writeText).toHaveBeenCalledWith(data.url)
  })

  it('sem os dois → "failed"', async () => {
    expect(await sharePage(data, {})).toBe('failed')
  })

  it('com erro em tudo → "failed"', async () => {
    const share = vi.fn().mockRejectedValue(new Error('a'))
    const writeText = vi.fn().mockRejectedValue(new Error('b'))
    expect(await sharePage(data, { share, clipboard: { writeText } })).toBe('failed')
  })
})

describe('init', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('é no-op sem [data-share]', () => {
    document.body.innerHTML = ''
    expect(() => init()).not.toThrow()
  })

  it('escreve o status em [data-share-status]', async () => {
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    document.body.innerHTML = '<button data-share>Compartilhar</button><span data-share-status aria-live="polite"></span>'
    init()
    document.querySelector('[data-share]').click()
    await vi.waitFor(() => expect(document.querySelector('[data-share-status]').textContent).toBe('Link copiado'))
  })

  it('mostra erro quando nada funciona', async () => {
    vi.stubGlobal('navigator', {})
    document.body.innerHTML = '<button data-share>Compartilhar</button><span data-share-status></span>'
    init()
    document.querySelector('[data-share]').click()
    await vi.waitFor(() => expect(document.querySelector('[data-share-status]').textContent).toBe('Não foi possível copiar o link'))
  })
})
