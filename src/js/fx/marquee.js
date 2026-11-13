import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger } from '../core/gsap.js'
import { finePointer } from '../core/motion.js'

const REVERSE_HEADROOM = 10000

/**
 * Duplica o conteúdo do track num clone aria-hidden (display: contents, então o gap segue uniforme)
 * e tira do Tab os links do clone.
 */
export function setupMarquee(el) {
  const track = el.querySelector('.marquee__track')
  const clone = document.createElement('div')
  clone.className = 'marquee__clone'
  clone.style.display = 'contents'
  clone.setAttribute('aria-hidden', 'true')
  for (const child of track.children) clone.append(child.cloneNode(true))
  clone.querySelectorAll('a, button, [tabindex]').forEach(n => n.setAttribute('tabindex', '-1'))
  // O gap entre o fim do original e o início do clone entra no -50% exato.
  track.style.paddingRight = getComputedStyle(track).columnGap || ''
  track.append(clone)
  return { track, clone }
}

// Com movimento reduzido a faixa fica estática e sem clone (init só clona dentro do matchMedia).
export function init() {
  const els = $$('[data-marquee]')
  if (!els.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const cleanups = []
    for (const el of els) {
      if (!el.querySelector('.marquee__track')) continue
      const { track, clone } = setupMarquee(el)
      const speed = Number(el.dataset.marqueeSpeed) || 80
      let dir = 1
      let hovering = false
      let decay

      const tween = gsap.to(track, {
        xPercent: -50,
        ease: 'none',
        repeat: -1,
        duration: Math.max(1, track.scrollWidth / 2 / speed),
      })
      // Começa bem adiante no loop: o playhead nunca encosta em 0, então rolar para cima
      // (timeScale negativo) continua girando em vez de travar.
      tween.totalTime(tween.duration() * REVERSE_HEADROOM)

      const trigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: self => {
          if (self.direction) dir = self.direction
          if (hovering) return
          const boost = Math.min(4, 1 + Math.abs(self.getVelocity()) / 400)
          decay?.kill()
          tween.timeScale(dir * boost)
          decay = gsap.to(tween, { timeScale: dir, duration: 0.6, ease: 'power1.out', delay: 0.05 })
        },
      })

      let onEnter, onLeave
      if (finePointer()) {
        onEnter = () => { hovering = true; decay?.kill(); gsap.to(tween, { timeScale: 0, duration: 0.4, overwrite: true }) }
        onLeave = () => { hovering = false; gsap.to(tween, { timeScale: dir, duration: 0.4, overwrite: true }) }
        el.addEventListener('pointerenter', onEnter)
        el.addEventListener('pointerleave', onLeave)
      }

      cleanups.push(() => {
        trigger.kill()
        decay?.kill()
        tween.kill()
        gsap.set(track, { clearProps: 'transform' })
        track.style.paddingRight = ''
        clone.remove()
        if (onEnter) {
          el.removeEventListener('pointerenter', onEnter)
          el.removeEventListener('pointerleave', onLeave)
        }
      })
    }
    return () => cleanups.forEach(fn => fn())
  })
}
