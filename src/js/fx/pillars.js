import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'

const STACK = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'
const LIFT = '(max-width: 1023px) and (prefers-reduced-motion: no-preference)'

/**
 * Pilares da Home. A partir de 1024 px, com movimento permitido, os cards 2 e 3 começam em y 60% e 120%
 * e se empilham sob os anteriores com scrub. Fora disso, entram como o reveal comum (fx/reveal).
 * Com movimento reduzido ficam parados e visíveis.
 */
export function init() {
  const groups = $$('[data-pillars]')
  if (!groups.length) return

  const mm = gsap.matchMedia()
  for (const wrap of groups) {
    const cards = $$('.pillar', wrap)
    if (!cards.length) continue

    mm.add(STACK, () => {
      const offsets = [0, 60, 120]
      const tl = gsap.timeline({
        scrollTrigger: { trigger: wrap, start: 'top 85%', end: 'top 40%', scrub: true, invalidateOnRefresh: true },
      })
      cards.forEach((card, i) => {
        if (offsets[i]) tl.fromTo(card, { yPercent: offsets[i] }, { yPercent: 0, ease: 'none' }, 0)
      })
    })

    // O mesmo movimento do fx/reveal (sobe 40 px e aparece em .9s, em sequência, em top 85%).
    mm.add(LIFT, () => {
      gsap.set(cards, { y: 40, opacity: 0 })
      ScrollTrigger.batch(cards, {
        start: 'top 85%',
        once: true,
        onEnter: els => gsap.to(els, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.08, overwrite: 'auto' }),
      })
    })
  }
}
