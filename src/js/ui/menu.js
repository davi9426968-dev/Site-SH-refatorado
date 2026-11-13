import { $, $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { reducedMotion } from '../core/motion.js'
import { lockScroll, unlockScroll } from '../core/smooth-scroll.js'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function createMenu({ toggle, panel, onOpen, onClose }) {
  let opened = false
  const root = document.documentElement
  // Ruling 13: o ciclo de foco é [botão, ...focáveis do painel].
  const cycle = () => [toggle, ...$$(FOCUSABLE, panel)]

  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return }
    if (e.key !== 'Tab') return
    const items = cycle()
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || !items.includes(active))) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && (active === last || !items.includes(active))) {
      e.preventDefault(); first.focus()
    }
  }

  function open() {
    if (opened) return
    opened = true
    panel.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Fechar menu')
    root.classList.add('menu-open')
    document.addEventListener('keydown', onKeydown)
    $(FOCUSABLE, panel)?.focus()
    onOpen?.()
  }

  function close() {
    if (!opened) return
    opened = false
    panel.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Abrir menu')
    root.classList.remove('menu-open')
    document.removeEventListener('keydown', onKeydown)
    toggle.focus()
    onClose?.()
  }

  toggle.addEventListener('click', () => (opened ? close() : open()))
  panel.addEventListener('click', e => { if (e.target.closest('.menu-mobile__link')) close() })

  return { open, close, isOpen: () => opened }
}

export function init() {
  const toggle = $('[data-menu-toggle]')
  const panel = $('[data-menu]')
  if (!toggle || !panel) return

  const menu = createMenu({
    toggle,
    panel,
    onOpen() {
      lockScroll()
      if (!reducedMotion()) {
        gsap.fromTo($$('.menu-mobile__link', panel),
          { opacity: 0, yPercent: 40 },
          { opacity: 1, yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity' })
      }
    },
    onClose() { unlockScroll() },
  })

  window.matchMedia?.('(min-width: 901px)')?.addEventListener?.('change', e => {
    if (e.matches && menu.isOpen()) menu.close()
  })
}
