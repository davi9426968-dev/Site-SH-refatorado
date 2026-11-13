import { $ } from '../core/dom.js'
import { reducedMotion } from '../core/motion.js'

export function headerState({ y, lastY, scrolledAfter = 40, hiddenAfter = 400 }) {
  return {
    scrolled: y > scrolledAfter,
    hidden: y > hiddenAfter && y > lastY,
  }
}

export function markCurrent(root, page) {
  if (!page) return
  root.querySelectorAll('a[data-nav]').forEach(a => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })
}

export function init() {
  markCurrent(document, document.body?.dataset.page)
  const header = $('[data-header]')
  if (!header) return
  let lastY = window.scrollY
  let ticking = false

  const update = () => {
    ticking = false
    const y = window.scrollY
    const state = headerState({ y, lastY })
    header.classList.toggle('is-scrolled', state.scrolled)
    // Com movimento reduzido, ou com o menu aberto, o header nunca esconde.
    const menuOpen = document.documentElement.classList.contains('menu-open')
    header.classList.toggle('is-hidden', state.hidden && !reducedMotion() && !menuOpen)
    lastY = y
  }
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(update)
  }, { passive: true })
  update()
}
