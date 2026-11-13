import { $$ } from '../core/dom.js'

/** Tamanho de fonte que faz um texto medido em `measured` px (com `base` px) ocupar `target` px. */
export function fitFontSize(measured, base, target, { min = 16, max = 400 } = {}) {
  return Math.min(max, Math.max(min, (base * target) / measured))
}

/** Ajusta o font-size do elemento à largura do pai vezes data-fit-width (padrão 0.92). */
export function fitText(el) {
  const parent = el.parentElement
  if (!parent) return
  const base = parseFloat(getComputedStyle(el).fontSize)
  const measured = el.scrollWidth
  const cs = getComputedStyle(parent)
  const inner = parent.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
  const ratio = Number(el.dataset.fitWidth) || 0.92
  if (!base || !measured || inner <= 0) return
  el.style.fontSize = `${fitFontSize(measured, base, inner * ratio)}px`
}

export function init() {
  const els = $$('[data-fit-text]')
  if (!els.length) return
  const run = () => els.forEach(fitText)
  run()
  let timer
  window.addEventListener('resize', () => {
    clearTimeout(timer)
    timer = setTimeout(run, 150)
  }, { passive: true })
  document.fonts?.ready.then(run)
}
