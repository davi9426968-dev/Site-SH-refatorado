import { $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { finePointer, reducedMotion } from '../core/motion.js'

const REACH = 60

export function init() {
  if (!finePointer() || reducedMotion()) return
  const els = $$('[data-magnetic]')
  if (!els.length) return

  for (const el of els) {
    const strength = Number(el.dataset.magneticStrength) || 0.35
    const toX = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
    const toY = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
    let inside = false

    window.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect()
      const near = e.clientX > r.left - REACH && e.clientX < r.right + REACH
        && e.clientY > r.top - REACH && e.clientY < r.bottom + REACH
      if (near) {
        inside = true
        toX((e.clientX - (r.left + r.width / 2)) * strength)
        toY((e.clientY - (r.top + r.height / 2)) * strength)
      } else if (inside) {
        inside = false
        toX(0); toY(0)
      }
    }, { passive: true })
  }
}
