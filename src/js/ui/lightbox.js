import { $, $$ } from '../core/dom.js'
import { lockScroll, unlockScroll } from '../core/smooth-scroll.js'

const SWIPE = 50
const icon = id => `<svg aria-hidden="true"><use href="/icons.svg#${id}"/></svg>`

export function createLightbox(items) {
  const el = document.createElement('dialog')
  el.className = 'lightbox'
  el.setAttribute('aria-label', 'Galeria de fotos')
  el.innerHTML = `
    <figure class="lightbox__figure">
      <img class="lightbox__img" alt="">
      <figcaption class="lightbox__caption"></figcaption>
    </figure>
    <p class="lightbox__counter" aria-live="polite"></p>
    <button type="button" class="lightbox__btn--prev" aria-label="Foto anterior">${icon('chevron-left')}</button>
    <button type="button" class="lightbox__btn--next" aria-label="Próxima foto">${icon('chevron-right')}</button>
    <button type="button" class="lightbox__btn--close" aria-label="Fechar galeria">${icon('close')}</button>`
  document.body.append(el)

  const img = $('.lightbox__img', el)
  const caption = $('.lightbox__caption', el)
  const counter = $('.lightbox__counter', el)
  const total = items.length
  let current = 0
  let isOpen = false
  let lastFocus = null
  let startX = 0
  let startY = 0

  const wrap = i => (i + total) % total

  function preload(i) {
    const item = items[wrap(i)]
    if (!item) return
    const pre = new Image()
    if (item.srcset) pre.srcset = item.srcset
    pre.src = item.src
  }

  function show(i) {
    current = wrap(i)
    const item = items[current]
    img.src = item.src
    if (item.srcset) img.srcset = item.srcset
    else img.removeAttribute('srcset')
    img.alt = '' // a legenda visível carrega o texto: um só anúncio
    caption.textContent = item.alt
    counter.textContent = `${current + 1} / ${total}`
    preload(current - 1)
    preload(current + 1)
  }

  function open(i = 0, opener) {
    if (!total) return
    show(i)
    if (isOpen) return
    lastFocus = opener || (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    if (typeof el.showModal === 'function') {
      try { el.showModal() } catch { el.setAttribute('open', '') }
    } else {
      el.setAttribute('open', '')
    }
    isOpen = true
    lockScroll()
    $('.lightbox__btn--close', el).focus()
  }

  function close() {
    if (!isOpen) return
    isOpen = false
    if (typeof el.close === 'function' && el.hasAttribute('open')) el.close()
    el.removeAttribute('open')
    unlockScroll()
    lastFocus?.focus?.()
    lastFocus = null
  }

  const next = () => show(current + 1)
  const prev = () => show(current - 1)

  $('.lightbox__btn--next', el).addEventListener('click', next)
  $('.lightbox__btn--prev', el).addEventListener('click', prev)
  $('.lightbox__btn--close', el).addEventListener('click', close)

  // Escape nativo (showModal): usa o nosso close() para destravar o scroll e devolver o foco.
  el.addEventListener('cancel', e => {
    e.preventDefault()
    close()
  })
  // Clique no backdrop: o alvo é o próprio dialog.
  el.addEventListener('click', e => {
    if (e.target === el) close()
  })

  // Setas e Escape; Tab preso no diálogo (também na alternativa sem showModal).
  document.addEventListener('keydown', e => {
    if (!isOpen) return
    if (e.key === 'ArrowRight') next()
    else if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  })
  el.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return
    const f = $$('button', el)
    const first = f[0]
    const last = f.at(-1)
    const active = document.activeElement
    if (e.shiftKey && (active === first || !el.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (active === last || !el.contains(active))) {
      e.preventDefault()
      first.focus()
    }
  })

  el.addEventListener('touchstart', e => {
    const t = e.touches?.[0] || e.changedTouches?.[0]
    if (!t) return
    startX = t.clientX
    startY = t.clientY
  }, { passive: true })
  el.addEventListener('touchend', e => {
    const t = e.changedTouches?.[0]
    if (!t) return
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy)) return
    if (dx < 0) next()
    else prev()
  }, { passive: true })

  return { el, open, close, next, prev, index: () => current }
}

export function init() {
  const links = $$('[data-gallery] a[data-gallery-item]')
  if (!links.length) return
  const items = links.map(a => {
    const im = $('img', a)
    return { src: a.getAttribute('href'), srcset: a.dataset.srcset, alt: im?.getAttribute('alt') || '' }
  })
  const lb = createLightbox(items)
  links.forEach((a, i) => {
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return
      e.preventDefault()
      lb.open(i, a)
    })
  })
}
