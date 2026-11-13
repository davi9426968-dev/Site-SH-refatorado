const mq = query => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null)

export const reducedMotion = () => !!mq('(prefers-reduced-motion: reduce)')?.matches
export const finePointer = () => !!mq('(hover: hover) and (pointer: fine)')?.matches

/** Chama `cb` quando a preferência de movimento muda. Devolve a função que cancela. */
export function onMotionChange(cb) {
  const m = mq('(prefers-reduced-motion: reduce)')
  if (!m) return () => {}
  const handler = () => cb(m.matches)
  m.addEventListener('change', handler)
  return () => m.removeEventListener('change', handler)
}
