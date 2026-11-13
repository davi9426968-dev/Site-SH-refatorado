const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

/** Canais RGB (0–255) de `#rgb` ou `#rrggbb`. */
function parseHex(hex) {
  const m = HEX.exec(String(hex).trim())
  if (!m) throw new TypeError(`Cor hex inválida: ${hex}`)
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
}

/** Luminância relativa da WCAG 2.x. */
function luminance(hex) {
  const [r, g, b] = parseHex(hex).map(v => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Razão de contraste da WCAG 2.x entre duas cores hex (a ordem não importa).
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number} de 1 a 21
 */
export function contrastRatio(hexA, hexB) {
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Lê as propriedades customizadas (`--nome: valor;`) de um CSS, ignorando comentários.
 * Se o nome se repete, vale a última ocorrência.
 * @param {string} css
 * @returns {Record<string, string>}
 */
export function readTokens(css) {
  const tokens = {}
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const m of clean.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}
