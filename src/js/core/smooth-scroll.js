import Lenis from 'lenis'
import { gsap, ScrollTrigger } from './gsap.js'
import { reducedMotion } from './motion.js'

let lenis = null
let locked = 0
let anchorsBound = false

export function getLenis() { return lenis }

const headerHeight = () => document.querySelector('[data-header]')?.offsetHeight ?? 0

/** Rola até um seletor, elemento ou posição (px). Usa Lenis quando existe; senão, a rolagem nativa. */
export function scrollToTarget(target, opts = {}) {
  const { offset = 0, immediate = false } = opts
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (lenis) {
    if (typeof target === 'number') lenis.scrollTo(target + offset, { immediate })
    else if (el) lenis.scrollTo(el, { offset, immediate })
    return
  }
  const top = typeof target === 'number'
    ? target
    : el && el.getBoundingClientRect().top + window.scrollY
  if (typeof top !== 'number' || Number.isNaN(top)) return
  window.scrollTo({ top: top + offset, behavior: immediate || reducedMotion() ? 'instant' : 'smooth' })
}

export function lockScroll() {
  lenis?.stop()
  document.documentElement.style.overflow = 'hidden'
  locked += 1
}

export function unlockScroll() {
  locked = Math.max(0, locked - 1)
  if (locked > 0) return
  lenis?.start()
  document.documentElement.style.overflow = ''
}

/** Âncoras da mesma página: `#x`, ou `/#x` quando já estamos em `/`. */
function anchorHash(a) {
  const href = a.getAttribute('href') || ''
  if (href.startsWith('#')) return href.length > 1 ? href : null
  if (href.startsWith('/#') && window.location.pathname === '/') return href.slice(1)
  return null
}

function onAnchorClick(event) {
  if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const a = event.target.closest?.('a[href^="#"], a[href^="/#"]')
  if (!a || (a.target && a.target !== '_self')) return
  const hash = anchorHash(a)
  if (!hash) return
  let el = null
  try { el = document.querySelector(hash) } catch { return }
  if (!el) return
  event.preventDefault()
  scrollToTarget(el, { offset: -headerHeight() })
  history.pushState(null, '', hash)
  // Como na navegação nativa por hash: o foco vai para o destino (vale para o link "Pular para o conteúdo").
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

export function initSmoothScroll() {
  if (!anchorsBound) {
    document.addEventListener('click', onAnchorClick)
    anchorsBound = true
  }
  if (reducedMotion() || lenis) return lenis
  lenis = new Lenis({ lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}
