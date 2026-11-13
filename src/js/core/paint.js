/** Tempo-limite: uma aba oculta nunca pinta, e os chunks não podem ficar esperando para sempre. */
export const PAINT_TIMEOUT = 1500

/**
 * Resolve depois do primeiro quadro com conteúdo (first-contentful-paint, que já chega com o tempo em que
 * o quadro foi apresentado), ou no tempo-limite. Sem Paint Timing: um quadro (rAF) e uma tarefa.
 * Usado só para os chunks lazy não críticos (Ruling 29); nada antes do __fxReady espera por isto.
 * @param {number} [timeout]
 * @returns {Promise<void>}
 */
export function whenPainted(timeout = PAINT_TIMEOUT) {
  return new Promise(resolve => {
    let observer = null
    const finish = () => {
      clearTimeout(timer)
      observer?.disconnect()
      resolve()
    }
    const timer = setTimeout(finish, timeout)
    try {
      if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('paint')) {
        observer = new PerformanceObserver(list => {
          if (list.getEntries().some(e => e.name === 'first-contentful-paint')) finish()
        })
        observer.observe({ type: 'paint', buffered: true })
        return
      }
    } catch { /* sem Paint Timing utilizável: cai no rAF */ }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(finish, 0))
  })
}
