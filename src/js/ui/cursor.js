import { gsap } from '../core/gsap.js'
import { finePointer, reducedMotion } from '../core/motion.js'

export const lerp = (a, b, t) => a + (b - a) * t

const INTERACTIVE = 'a, button, [data-cursor]'
const TEXT_FIELD = 'input, textarea, select, [contenteditable]'

export function init() {
  if (!finePointer() || reducedMotion()) return

  const dot = document.createElement('div')
  dot.className = 'cursor-dot is-hidden'
  const ring = document.createElement('div')
  ring.className = 'cursor-ring is-hidden'
  const label = document.createElement('span')
  label.className = 'cursor-ring__label'
  ring.append(label)
  dot.setAttribute('aria-hidden', 'true')
  ring.setAttribute('aria-hidden', 'true')
  document.body.append(dot, ring)
  document.documentElement.classList.add('has-cursor')

  let x = -100, y = -100, rx = -100, ry = -100
  let seen = false

  const place = (el, px, py) => { el.style.transform = `translate3d(${px}px, ${py}px, 0)` }
  const setHidden = hidden => {
    ring.classList.toggle('is-hidden', hidden)
    dot.classList.toggle('is-hidden', hidden)
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return
    x = e.clientX; y = e.clientY
    if (!seen) { seen = true; rx = x; ry = y }
    place(dot, x, y)
    const target = e.target instanceof Element ? e.target : null
    const interactive = !!target?.closest(INTERACTIVE)
    const text = target?.closest('[data-cursor]')?.dataset.cursor
    ring.classList.toggle('is-link', interactive && !text)
    dot.classList.toggle('is-link', interactive && !text)
    ring.classList.toggle('is-label', !!text)
    dot.classList.toggle('is-label', !!text)
    label.textContent = text || ''
    // Em campos de texto o cursor nativo volta (CSS) e o nosso some.
    setHidden(!!target?.closest(TEXT_FIELD))
  }, { passive: true })

  document.addEventListener('pointerdown', () => { ring.classList.add('is-down'); dot.classList.add('is-down') })
  document.addEventListener('pointerup', () => { ring.classList.remove('is-down'); dot.classList.remove('is-down') })
  document.documentElement.addEventListener('mouseleave', () => setHidden(true))
  document.documentElement.addEventListener('mouseenter', () => { if (seen) setHidden(false) })

  gsap.ticker.add(() => {
    rx = lerp(rx, x, 0.18)
    ry = lerp(ry, y, 0.18)
    place(ring, rx, ry)
  })
}
