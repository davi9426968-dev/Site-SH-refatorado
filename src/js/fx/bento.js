import { $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { finePointer } from '../core/motion.js'

const GLOW_RADIUS = 300
const TILT = 6

/** 1 com o ponteiro dentro do retângulo; cai linearmente até 0 a `radius` px da borda. */
export function glowIntensity(rect, x, y, radius) {
  const dx = Math.max(rect.left - x, 0, x - (rect.left + rect.width))
  const dy = Math.max(rect.top - y, 0, y - (rect.top + rect.height))
  return Math.max(0, 1 - Math.hypot(dx, dy) / radius)
}

export function init() {
  const grids = $$('[data-bento]')
  if (!grids.length || !finePointer()) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const cards = grids.flatMap(g => $$('.card-bento', g))
    if (!cards.length) return

    const spot = document.createElement('div')
    spot.className = 'spotlight'
    spot.setAttribute('aria-hidden', 'true')
    document.body.append(spot)

    const spotX = gsap.quickTo(spot, 'x', { duration: 0.5, ease: 'power3.out' })
    const spotY = gsap.quickTo(spot, 'y', { duration: 0.5, ease: 'power3.out' })
    const tilts = new Map(cards.map(card => {
      gsap.set(card, { transformPerspective: 900 })
      return [card, {
        rx: gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' }),
        ry: gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' }),
      }]
    }))

    const onMove = e => {
      const { clientX: x, clientY: y } = e
      let overGrid = false
      for (const card of cards) {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--glow-x', `${x - r.left}px`)
        card.style.setProperty('--glow-y', `${y - r.top}px`)
        card.style.setProperty('--glow-intensity', String(glowIntensity(r, x, y, GLOW_RADIUS)))
        const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
        const t = tilts.get(card)
        if (inside) {
          overGrid = true
          t.ry(((x - (r.left + r.width / 2)) / (r.width / 2)) * TILT)
          t.rx(-((y - (r.top + r.height / 2)) / (r.height / 2)) * TILT)
        } else {
          t.ry(0); t.rx(0)
        }
      }
      spotX(x); spotY(y)
      gsap.to(spot, { opacity: overGrid ? 1 : 0, duration: 0.3, overwrite: 'auto' })
    }
    const onLeave = () => {
      gsap.to(spot, { opacity: 0, duration: 0.3, overwrite: 'auto' })
      for (const card of cards) { tilts.get(card).rx(0); tilts.get(card).ry(0) }
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      spot.remove()
    }
  })
}
