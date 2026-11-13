/**
 * O refresh do ScrollTrigger tira as seções fixadas (pin) do pin-spacer e as devolve; mover no DOM o elemento
 * focado derruba o foco para o <body>. Quem navega pelo teclado dentro de uma seção fixada (o trilho dos pontos
 * turísticos) perdia o lugar a cada refresh. Guarda o foco no refreshInit e o devolve no refresh, se ele caiu.
 * @param {{ addEventListener?: (type: string, fn: () => void) => void }} ScrollTrigger
 */
export function keepFocusOnRefresh(ScrollTrigger) {
  let held = null
  ScrollTrigger.addEventListener?.('refreshInit', () => {
    const el = document.activeElement
    held = el && el !== document.body && el !== document.documentElement ? el : null
  })
  ScrollTrigger.addEventListener?.('refresh', () => {
    const el = held
    held = null
    const dropped = !document.activeElement || document.activeElement === document.body
    if (el?.isConnected && dropped) el.focus({ preventScroll: true })
  })
}
