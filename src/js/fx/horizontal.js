import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'
import { scrollToTarget } from '../core/smooth-scroll.js'

export const PIN_MIN_WIDTH = 1024

/** A seção fixa e a fileira anda na horizontal só a partir de 1024 px e com movimento permitido. */
export function shouldPin(width, reduced) {
  return width >= PIN_MIN_WIDTH && !reduced
}

/**
 * Quanto o track anda para o último card encostar na margem direita: `scrollWidth − largura + edge`.
 * O track tem `padding-left: var(--edge)` e nenhum à direita quando fixado (home.css).
 */
export function travelDistance(trackWidth, viewportWidth, edge) {
  return Math.max(0, trackWidth - viewportWidth + edge)
}

/** Posição de rolagem (no trecho fixado) que deixa o card com `offsetLeft` alinhado à margem esquerda. */
export function scrollForOffset(offsetLeft, { edge, start, distance }) {
  return start + Math.min(distance, Math.max(0, offsetLeft - edge))
}

/** true se o elemento aparece inteiro na janela. */
export function fullyInView(el) {
  const r = el.getBoundingClientRect()
  return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight
}

/**
 * `[data-horizontal]` é o track que anda; a seção em volta é a que fica fixada.
 * Fora do pin (abaixo de 1024 px ou com movimento reduzido) o CSS deixa a fileira com
 * `overflow-x: auto` e `scroll-snap`, e este módulo não faz nada.
 */
export function init() {
  const tracks = $$('[data-horizontal]')
  if (!tracks.length) return

  const mm = gsap.matchMedia()
  // As duas condições fazem o matchMedia refazer tudo ao cruzar 1024 px ou ao mudar a preferência.
  mm.add({ wide: `(min-width: ${PIN_MIN_WIDTH}px)`, reduce: '(prefers-reduced-motion: reduce)' }, ctx => {
    if (!shouldPin(window.innerWidth, ctx.conditions.reduce)) return
    const cleanups = tracks.map(pinTrack)
    // Este módulo é lazy: os gatilhos abaixo da seção (criados antes) precisam contar o espaço do pin.
    ScrollTrigger.sort()
    ScrollTrigger.refresh()
    return () => cleanups.forEach(fn => fn())
  })
}

function pinTrack(track) {
  const viewport = track.parentElement
  const section = track.closest('section') ?? viewport
  section.classList.add('is-pinned')

  const edge = () => parseFloat(getComputedStyle(track).paddingLeft) || 0
  const distance = () => travelDistance(track.scrollWidth, viewport.clientWidth, edge())

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: true,
      start: 'top top',
      end: () => `+=${distance()}`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  })

  // Teclado: o card que recebe foco fora da tela traz a rolagem até ele (o viewport usa overflow: clip).
  // Se ele já está inteiro na tela, nada se mexe.
  const onFocus = event => {
    const card = [...track.children].find(c => c.contains(event.target))
    const st = tween.scrollTrigger
    if (!card || !st || fullyInView(card)) return
    scrollToTarget(scrollForOffset(card.offsetLeft, { edge: edge(), start: st.start, distance: st.end - st.start }), { immediate: true })
  }
  track.addEventListener('focusin', onFocus)

  return () => {
    track.removeEventListener('focusin', onFocus)
    section.classList.remove('is-pinned')
  }
}
