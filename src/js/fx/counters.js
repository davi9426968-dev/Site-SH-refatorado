import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'

export function formatCount(value, { decimals = 0 } = {}) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

/** Anos completos desde a data ISO (AAAA-MM-DD) até `now`. */
export function yearsSince(iso, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  let years = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years -= 1
  return years
}

export function init() {
  const els = $$('[data-count-to]')
  if (!els.length) return

  const items = els
    .map(el => {
      const value = el.querySelector('.stat__value')
      if (!value) return null
      const decimals = Number(el.dataset.countDecimals) || 0
      const since = el.dataset.countYearsSince
      const target = since ? yearsSince(since) : Number(el.dataset.countTo)
      // O valor calculado vale sempre (também sem animação), para não envelhecer.
      if (since) value.textContent = formatCount(target, { decimals })
      return { el, value, decimals, target }
    })
    .filter(Boolean)

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    for (const { el, value, decimals, target } of items) {
      const state = { n: 0 }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          value.textContent = formatCount(0, { decimals })
          gsap.to(state, {
            n: target,
            duration: 2,
            ease: 'power3.out',
            onUpdate: () => { value.textContent = formatCount(state.n, { decimals }) },
            onComplete: () => { value.textContent = formatCount(target, { decimals }) },
          })
        },
      })
    }
  })
}
