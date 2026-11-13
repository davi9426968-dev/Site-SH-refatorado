import { $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'

export function init() {
  const els = $$('[data-parallax]')
  if (!els.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    for (const el of els) {
      const speed = Number(el.dataset.parallax) || 0.15
      const parent = el.parentElement
      if (!parent) continue
      // A imagem fica ampliada dentro de um wrapper que corta o excesso.
      parent.style.overflow = 'hidden'
      gsap.set(el, { scale: 1.15 })
      gsap.fromTo(el, { yPercent: -speed * 100 }, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: { trigger: parent, start: 'top bottom', end: 'bottom top', scrub: true },
      })
    }
    return () => els.forEach(el => { if (el.parentElement) el.parentElement.style.overflow = '' })
  })
}
