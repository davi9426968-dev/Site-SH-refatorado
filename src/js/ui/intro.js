import { $ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { lockScroll, unlockScroll } from '../core/smooth-scroll.js'

export const INTRO_KEY = 'sh-intro'

/**
 * A intro só aparece na primeira visita da sessão, com storage disponível e sem movimento reduzido.
 * O script inline do <head> do index.html repete esta regra para pôr `intro-on` antes de pintar.
 * @param {Storage | null} storage
 * @param {boolean} reduced
 */
export function shouldShowIntro(storage, reduced) {
  if (reduced || !storage) return false
  try {
    return storage.getItem(INTRO_KEY) === null
  } catch {
    return false
  }
}

function sessionStore() {
  try { return window.sessionStorage } catch { return null }
}

export function init() {
  const el = $('[data-intro]')
  const root = document.documentElement
  if (!el || !root.classList.contains('intro-on')) return
  // Avisa o mecanismo de segurança do <head> que a intro está nas mãos do módulo.
  window.__shIntro = true

  const count = $('.intro__count', el)
  const counter = { value: 0 }
  let revealed = false
  let done = false
  let tl

  // A cortina começa a subir: a intro conta como vista e o hero começa por baixo dela.
  // intro-on sai antes do evento, então quem iniciar depois não fica esperando; .is-leaving segura o overlay.
  function reveal() {
    if (revealed) return
    revealed = true
    el.classList.add('is-leaving')
    root.classList.remove('intro-on')
    try { sessionStore()?.setItem(INTRO_KEY, '1') } catch { /* storage cheio ou bloqueado */ }
    window.dispatchEvent(new CustomEvent('sh:intro-done'))
  }

  function finish() {
    if (done) return
    done = true
    reveal()
    tl?.kill()
    el.classList.remove('is-leaving')
    el.removeEventListener('click', finish)
    document.removeEventListener('keydown', onKey)
    unlockScroll()
  }

  function onKey(e) {
    if (e.key === 'Escape') finish()
  }

  lockScroll()
  el.addEventListener('click', finish)
  document.addEventListener('keydown', onKey)

  tl = gsap.timeline({ onComplete: finish })
  tl.to(counter, {
    value: 100,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: () => { if (count) count.textContent = String(Math.round(counter.value)) },
  })
  tl.add(reveal)
  tl.fromTo(el, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.inOut' })
}
