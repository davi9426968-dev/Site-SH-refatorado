// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bindVideo, init } from '../../src/js/ui/video.js'

const html = (mute = true) => `<div class="video-player" data-video><video muted playsinline></video>
<div class="video-player__controls"><button data-video-toggle aria-pressed="false" aria-label="Reproduzir vídeo"></button>
${mute ? '<button data-video-mute aria-pressed="true" aria-label="Ativar som"></button>' : ''}</div></div>`

let root, video, ioCallback, ioOpts, ioCreated, originals
const mm = matches => { window.matchMedia = () => ({ matches, addEventListener() {}, removeEventListener() {} }) }

function stubVideo(playImpl) {
  let paused = true
  Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
  video.play = vi.fn(() => {
    if (playImpl) return playImpl()
    paused = false
    video.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  video.pause = vi.fn(() => {
    paused = true
    video.dispatchEvent(new Event('pause'))
  })
}

beforeEach(() => {
  originals = { io: globalThis.IntersectionObserver, mm: window.matchMedia }
  ioCreated = false
  globalThis.IntersectionObserver = class {
    constructor(cb, opts) { ioCallback = cb; ioOpts = opts; ioCreated = true }
    observe() {}
    disconnect() {}
  }
  mm(false)
  document.body.innerHTML = html()
  root = document.querySelector('[data-video]')
  video = root.querySelector('video')
  stubVideo()
})

afterEach(() => {
  globalThis.IntersectionObserver = originals.io
  window.matchMedia = originals.mm
  document.body.innerHTML = ''
})

const toggle = () => root.querySelector('[data-video-toggle]')
const mute = () => root.querySelector('[data-video-mute]')
const see = isIntersecting => ioCallback([{ isIntersecting }])

describe('bindVideo', () => {
  it('toggle alterna aria-pressed e o rótulo "Pausar vídeo"/"Reproduzir vídeo"', () => {
    bindVideo(root)
    toggle().click()
    expect(video.play).toHaveBeenCalled()
    expect(toggle().getAttribute('aria-pressed')).toBe('true')
    expect(toggle().getAttribute('aria-label')).toBe('Pausar vídeo')
    toggle().click()
    expect(video.pause).toHaveBeenCalled()
    expect(toggle().getAttribute('aria-pressed')).toBe('false')
    expect(toggle().getAttribute('aria-label')).toBe('Reproduzir vídeo')
  })

  it('mute alterna video.muted e aria-pressed', () => {
    bindVideo(root)
    mute().click()
    expect(video.muted).toBe(false)
    expect(mute().getAttribute('aria-pressed')).toBe('false')
    expect(mute().getAttribute('aria-label')).toBe('Desativar som')
    mute().click()
    expect(video.muted).toBe(true)
    expect(mute().getAttribute('aria-pressed')).toBe('true')
    expect(mute().getAttribute('aria-label')).toBe('Ativar som')
  })

  it('sem [data-video-mute] nada quebra', () => {
    document.body.innerHTML = html(false)
    root = document.querySelector('[data-video]')
    video = root.querySelector('video')
    stubVideo()
    expect(() => bindVideo(root)).not.toThrow()
    toggle().click()
    expect(toggle().getAttribute('aria-pressed')).toBe('true')
  })

  it('observer com limite .4: play ao aparecer, pausa ao sair', () => {
    bindVideo(root)
    expect(ioOpts.threshold).toBe(0.4)
    see(true)
    expect(video.paused).toBe(false)
    expect(toggle().getAttribute('aria-pressed')).toBe('true')
    see(false)
    expect(video.paused).toBe(true)
  })

  it('pausa do usuário impede o auto-play ao reaparecer', () => {
    bindVideo(root)
    see(true)
    toggle().click()
    video.play.mockClear()
    see(false)
    see(true)
    expect(video.play).not.toHaveBeenCalled()
    expect(video.paused).toBe(true)
  })

  it('com movimento reduzido não há autoplay, mas o botão funciona', () => {
    mm(true)
    bindVideo(root)
    expect(ioCreated).toBe(false)
    expect(video.play).not.toHaveBeenCalled()
    toggle().click()
    expect(video.paused).toBe(false)
  })

  it('play() rejeitado mantém a UI coerente com video.paused', async () => {
    stubVideo(() => Promise.reject(new DOMException('bloqueado', 'NotAllowedError')))
    bindVideo(root)
    see(true)
    await new Promise(r => setTimeout(r, 0))
    expect(video.paused).toBe(true)
    expect(toggle().getAttribute('aria-pressed')).toBe('false')
    expect(toggle().getAttribute('aria-label')).toBe('Reproduzir vídeo')
  })
})

describe('init', () => {
  it('é no-op sem [data-video]', () => {
    document.body.innerHTML = ''
    expect(() => init()).not.toThrow()
  })

  it('liga todos os [data-video]', () => {
    init()
    toggle().click()
    expect(toggle().getAttribute('aria-pressed')).toBe('true')
  })
})
