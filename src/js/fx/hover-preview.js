import { $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { finePointer } from '../core/motion.js'

export function previewSource(row) {
  return row.getAttribute('data-preview-src') || null
}

export function init() {
  const lists = $$('[data-hover-preview]')
  if (!lists.length || !finePointer()) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const preview = document.createElement('div')
    preview.className = 'hover-preview'
    preview.setAttribute('aria-hidden', 'true')
    const imgs = [0, 1].map(() => {
      const img = document.createElement('img')
      img.alt = ''
      img.decoding = 'async'
      gsap.set(img, { opacity: 0 })
      preview.append(img)
      return img
    })
    document.body.append(preview)

    const moveX = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3.out' })
    const moveY = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3.out' })
    let front = 0
    let shown = null
    let visible = false

    const rows = lists.flatMap(l => $$('[data-preview-src]', l))
    const preloaded = new Set()
    for (const row of rows) {
      const src = previewSource(row)
      if (src && !preloaded.has(src)) { preloaded.add(src); new Image().src = src }
    }

    const show = row => {
      const src = previewSource(row)
      if (!src) return
      if (src !== shown) {
        const next = imgs[1 - front]
        next.src = src
        gsap.to(next, { opacity: 1, duration: 0.35, overwrite: true })
        gsap.to(imgs[front], { opacity: 0, duration: 0.35, overwrite: true })
        front = 1 - front
        shown = src
      }
      if (!visible) {
        visible = true
        preview.classList.add('is-visible')
        gsap.fromTo(preview, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' })
        gsap.to(preview, { opacity: 1, duration: 0.3, overwrite: 'auto' })
      }
    }
    const hide = () => {
      visible = false
      preview.classList.remove('is-visible')
      gsap.to(preview, { opacity: 0, duration: 0.25, overwrite: 'auto' })
    }
    const onMove = e => { moveX(e.clientX); moveY(e.clientY) }

    const offs = lists.map(list => {
      // Linha sem data-preview-src (item sem fotos, Ruling 27): a prévia some em vez de ficar com a foto anterior.
      const enter = e => {
        const row = e.target.closest?.('a, [data-preview-src]')
        if (!row || !list.contains(row)) return
        if (previewSource(row)) show(row)
        else hide()
      }
      const leave = () => hide()
      list.addEventListener('pointerover', enter)
      list.addEventListener('pointerleave', leave)
      list.addEventListener('pointermove', onMove, { passive: true })
      return () => {
        list.removeEventListener('pointerover', enter)
        list.removeEventListener('pointerleave', leave)
        list.removeEventListener('pointermove', onMove)
      }
    })

    return () => { offs.forEach(fn => fn()); preview.remove() }
  })
}
