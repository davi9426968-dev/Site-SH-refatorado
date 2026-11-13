import { $$ } from '../core/dom.js'
import { gsap, ScrollTrigger, SplitText } from '../core/gsap.js'

const CHAR_FROM = { yPercent: 120, scaleY: 2.3, scaleX: 0.7, opacity: 0, transformOrigin: '50% 0%' }

/**
 * Dividir todos os títulos no boot era a maior tarefa do carregamento da Home (Task 13b). Só os que já estão
 * na tela são divididos no boot, como antes; os outros, pelo IntersectionObserver, quando chegam a uma tela
 * abaixo dela (meia acima) — os que já estão nessa faixa, logo no primeiro quadro —, bem antes do
 * `top 85%` que dispara a animação.
 */
const NEAR = { above: 0.5, below: 1 }
export const NEAR_MARGIN = `${NEAR.above * 100}% 0px ${NEAR.below * 100}% 0px`

/** true se o elemento aparece na tela agora. */
export function inViewport(el, viewport = window.innerHeight) {
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < viewport
}

function splitTitle(el) {
  const scrub = el.hasAttribute('data-split-scrub')
  // Dentro do matchMedia (ou do ctx.add) o SplitText é revertido junto com o contexto.
  SplitText.create(el, {
    type: 'chars,words',
    aria: 'auto',
    onSplit: self => gsap.from(self.chars, {
      ...CHAR_FROM,
      duration: 1,
      ease: 'back.inOut(2)',
      stagger: 0.03,
      scrollTrigger: scrub
        ? { trigger: el, start: 'top bottom', end: 'bottom 60%', scrub: true }
        : { trigger: el, start: 'top 85%', once: true },
    }),
  })
}

function splitLines(el) {
  SplitText.create(el, {
    type: 'lines',
    aria: 'none', // o aria-label automático num <p> sem papel é proibido (axe aria-prohibited-attr); o texto continua legível
    mask: 'lines',
    autoSplit: true,
    onSplit: self => gsap.from(self.lines, {
      yPercent: 100,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    }),
  })
}

export function init() {
  const jobs = [
    ...$$('[data-split]').map(el => [el, splitTitle]),
    ...$$('[data-split-lines]').map(el => [el, splitLines]),
  ]
  if (!jobs.length) return

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', ctx => {
    const canWait = typeof IntersectionObserver !== 'undefined'
    // Primeiro todas as leituras de posição, depois as divisões (que mexem no DOM): um layout só.
    const near = jobs.map(([el]) => !canWait || inViewport(el))
    const later = new Map()
    jobs.forEach(([el, split], i) => {
      if (near[i]) split(el)
      else later.set(el, split)
    })
    if (!later.size) return

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const split = entry.isIntersecting && later.get(entry.target)
        if (!split) continue
        later.delete(entry.target)
        io.unobserve(entry.target)
        ctx.add(() => split(entry.target))
        // Gatilhos criados depois do refresh inicial: refresh seguro (espera um quadro e o fim da rolagem,
        // e várias divisões seguidas viram um refresh só).
        ScrollTrigger.refresh(true)
      }
      if (!later.size) io.disconnect()
    }, { rootMargin: NEAR_MARGIN })
    later.forEach((_, el) => io.observe(el))
    return () => io.disconnect()
  })
}
