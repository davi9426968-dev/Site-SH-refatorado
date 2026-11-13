import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'

const START = 'top 85%'

export function init() {
  const plain = $$('[data-reveal]').filter(el => el.dataset.reveal !== 'clip' && !el.hasAttribute('data-reveal-stagger'))
  const clips = $$('[data-reveal="clip"]')
  const staggered = $$('[data-reveal-stagger] > *')
  if (!plain.length && !clips.length && !staggered.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const lift = (targets, stagger = 0) =>
      gsap.fromTo(targets, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger, overwrite: 'auto' })

    const batch = (targets, onEnter) => {
      if (targets.length) ScrollTrigger.batch(targets, { start: START, once: true, onEnter })
    }

    batch(plain, els => lift(els, 0.08))
    batch(staggered, els => lift(els, 0.08))
    batch(clips, els => gsap.fromTo(els, { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.out', stagger: 0.08,
    }))
  })
}
