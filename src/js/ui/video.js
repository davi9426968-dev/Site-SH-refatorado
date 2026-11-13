import { $, $$ } from '../core/dom.js'
import { reducedMotion } from '../core/motion.js'

export function bindVideo(root) {
  const video = $('video', root)
  const toggle = $('[data-video-toggle]', root)
  const mute = $('[data-video-mute]', root)
  if (!video || !toggle) return
  let userPaused = false

  const syncToggle = () => {
    const playing = !video.paused
    toggle.setAttribute('aria-pressed', String(playing))
    toggle.setAttribute('aria-label', playing ? 'Pausar vídeo' : 'Reproduzir vídeo')
  }
  const syncMute = () => {
    if (!mute) return
    mute.setAttribute('aria-pressed', String(video.muted))
    mute.setAttribute('aria-label', video.muted ? 'Ativar som' : 'Desativar som')
  }
  const play = () => {
    try {
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(syncToggle)
    } catch {
      syncToggle()
    }
  }

  video.addEventListener('play', syncToggle)
  video.addEventListener('pause', syncToggle)
  video.addEventListener('volumechange', syncMute)

  toggle.addEventListener('click', () => {
    if (video.paused) {
      userPaused = false
      play()
    } else {
      userPaused = true
      video.pause()
    }
    syncToggle()
  })

  mute?.addEventListener('click', () => {
    video.muted = !video.muted
    syncMute()
  })

  if (!reducedMotion() && 'IntersectionObserver' in globalThis) {
    new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!userPaused && video.paused) play()
        } else if (!video.paused) {
          video.pause()
        }
      }
    }, { threshold: 0.4 }).observe(video)
  }

  syncToggle()
  syncMute()
}

export function init() {
  $$('[data-video]').forEach(bindVideo)
}
