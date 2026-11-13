import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'

/**
 * Linha do tempo: `.timeline__progress` desenha de scaleY 0 a 1 ligado ao scroll, com a ponta
 * no centro da tela, e cada item ganha `is-active` (o ponto fica dourado) ao passar do centro.
 * Com movimento reduzido (ou sem JS) nada é criado: a linha fica inteira e home.css doura os pontos.
 */
export function init() {
  const timelines = $$('[data-timeline]')
  if (!timelines.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    for (const timeline of timelines) {
      const progress = timeline.querySelector('.timeline__progress')
      if (progress) {
        gsap.fromTo(progress, { scaleY: 0 }, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: timeline.querySelector('.timeline__line') ?? timeline,
            start: 'top center',
            end: 'bottom center',
            scrub: true,
          },
        })
      }
      for (const item of timeline.querySelectorAll('.timeline__item')) {
        ScrollTrigger.create({
          trigger: item,
          start: 'top center',
          onEnter: () => item.classList.add('is-active'),
          onLeaveBack: () => item.classList.remove('is-active'),
        })
      }
    }
    return () => timelines.forEach(t => t.querySelectorAll('.timeline__item.is-active').forEach(i => i.classList.remove('is-active')))
  })
}
