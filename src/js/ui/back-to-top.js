import { $ } from '../core/dom.js'
import { scrollToTarget } from '../core/smooth-scroll.js'

export const ringOffset = (progress, circumference) =>
  circumference * (1 - Math.min(1, Math.max(0, progress)))

export function init() {
  const btn = $('[data-to-top]')
  if (!btn) return
  const ring = $('.to-top__progress', btn)
  const r = Number(ring?.getAttribute('r')) || 22
  const circumference = 2 * Math.PI * r
  if (ring) ring.style.strokeDasharray = String(circumference)
  let ticking = false

  const update = () => {
    ticking = false
    const y = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    btn.classList.toggle('is-visible', y > 600)
    if (ring) ring.style.strokeDashoffset = String(ringOffset(max > 0 ? y / max : 0, circumference))
  }
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }, { passive: true })
  btn.addEventListener('click', () => {
    scrollToTarget(0)
    // O botão fica oculto perto do topo: o foco segue para o conteúdo em vez de ficar num botão invisível.
    $('#conteudo')?.focus({ preventScroll: true })
  })
  update()
}
