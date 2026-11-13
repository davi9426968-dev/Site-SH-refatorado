import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Global Constraint: estados iniciais escondidos por animação só podem existir sob html.motion-ok.
// Sem JS, com movimento reduzido ou depois do mecanismo de segurança do boot, todo o conteúdo aparece.

const ANIMATED = /\[data-(reveal|split)/
const HIDDEN = /(?:^|[\s;])(?:opacity\s*:\s*(?:0+(?:\.0*)?|\.0+)%?|visibility\s*:\s*hidden)\s*(?:!important\s*)?(?:;|$)/
const CONTAINERS = /^@(media|supports|layer|container|scope)\b/

/** Blocos `prelúdio { corpo }` do nível atual, ignorando chaves dentro de strings. */
function blocks(css) {
  const out = []
  let depth = 0, preludeStart = 0, bodyStart = 0, prelude = '', quote = null
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
    } else if (c === '"' || c === "'") quote = c
    else if (c === '{') {
      if (depth === 0) { prelude = css.slice(preludeStart, i).trim(); bodyStart = i + 1 }
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) { out.push({ prelude, body: css.slice(bodyStart, i) }); preludeStart = i + 1 }
    } else if (c === ';' && depth === 0) preludeStart = i + 1
  }
  return out
}

/** Separa uma lista de seletores nas vírgulas de nível zero (fora de parênteses e colchetes). */
function splitSelectors(list) {
  const out = []
  let depth = 0, start = 0
  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1 }
  }
  out.push(list.slice(start).trim())
  return out.filter(Boolean)
}

/** Declarações do próprio bloco, sem os blocos aninhados. */
const ownDeclarations = body => {
  let depth = 0, text = ''
  for (const c of body) {
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (depth === 0) text += c
  }
  return text
}

/** Todas as regras de estilo, entrando em @media/@layer/@supports e em regras aninhadas (`&`). */
function styleRules(css, parents = null) {
  const rules = []
  for (const { prelude, body } of blocks(css.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    if (prelude.startsWith('@')) {
      if (CONTAINERS.test(prelude)) rules.push(...styleRules(body, parents))
      continue // @keyframes, @font-face, @view-transition…
    }
    const own = splitSelectors(prelude)
    const selectors = parents
      ? own.flatMap(s => parents.map(p => (s.includes('&') ? s.replaceAll('&', p) : `${p} ${s}`)))
      : own
    rules.push({ selectors, declarations: ownDeclarations(body) })
    rules.push(...styleRules(body, selectors))
  }
  return rules
}

/** Seletores que escondem [data-reveal…]/[data-split…] sem estar sob `.motion-ok`. */
function hiddenOutsideMotionOk(css) {
  return styleRules(css)
    .filter(r => r.selectors.some(s => ANIMATED.test(s)) && HIDDEN.test(r.declarations))
    .flatMap(r => r.selectors.filter(s => !s.startsWith('.motion-ok')))
}

const stylesDir = path.resolve('src/styles')
const cssFiles = fs.readdirSync(stylesDir, { recursive: true })
  .filter(f => f.endsWith('.css'))
  .map(f => ({ file: f.split(path.sep).join('/'), css: fs.readFileSync(path.join(stylesDir, f), 'utf8') }))

describe('varredura de estados ocultos', () => {
  it('acusa [data-reveal] oculto fora de .motion-ok', () =>
    expect(hiddenOutsideMotionOk('[data-reveal] { opacity: 0 }')).toEqual(['[data-reveal]']))
  it('acusa o seletor da lista que não começa por .motion-ok', () =>
    expect(hiddenOutsideMotionOk('.motion-ok [data-reveal], .x [data-split] { visibility: hidden; }')).toEqual(['.x [data-split]']))
  it('entra em @layer e @media e aceita .motion-ok', () =>
    expect(hiddenOutsideMotionOk('@layer c { @media (min-width: 1px) { .motion-ok [data-split-lines] { opacity: 0; transform: none } [data-reveal] { opacity: .5 } } }')).toEqual([]))
  it('resolve regras aninhadas com &', () =>
    expect(hiddenOutsideMotionOk('[data-reveal] { color: red; &.x { opacity: 0 } }')).toEqual(['[data-reveal].x']))
  it('ignora @keyframes e opacidades diferentes de zero', () =>
    expect(hiddenOutsideMotionOk('@keyframes k { from { opacity: 0 } } [data-reveal] { opacity: 0.4 }')).toEqual([]))
})

describe('src/styles/**/*.css', () => {
  it('estado inicial oculto só sob .motion-ok', () => {
    const problems = cssFiles.flatMap(({ file, css }) => hiddenOutsideMotionOk(css).map(s => `${file}: ${s}`))
    expect(problems).toEqual([])
  })

  it('define os estados iniciais ocultos de [data-reveal] sob .motion-ok', () => {
    const rules = cssFiles.flatMap(({ css }) => styleRules(css))
    const hiddenReveal = rules.filter(r =>
      r.selectors.some(s => s.startsWith('.motion-ok') && s.includes('[data-reveal')) && HIDDEN.test(r.declarations))
    expect(hiddenReveal.length).toBeGreaterThan(0)
  })
})
