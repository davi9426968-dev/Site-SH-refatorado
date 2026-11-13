import { $, $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'

const START = 'inset(6% 14% round 28px)'
const END = 'inset(0% 0% round 0px)'

/**
 * Vídeo da Home: com a seção fixada no scroll, a moldura sai de 72% da largura com raio 28 px
 * e cresce até a largura toda, sem raio. Desligado com movimento reduzido (fica a moldura aberta).
 */
export function init() {
  const els = $$('[data-video-expand]')
  if (!els.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    for (const el of els) {
      const frame = $('.video-section__frame', el) ?? el
      gsap.fromTo(frame, { clipPath: START }, {
        clipPath: END,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: '+=120%', pin: true, scrub: 1, invalidateOnRefresh: true },
      })
    }
    // O pin entra depois dos gatilhos eager mais abaixo na página: reordena e recalcula as posições.
    ScrollTrigger.sort()
    ScrollTrigger.refresh()
  })
}
