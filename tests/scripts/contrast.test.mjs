import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { contrastRatio, readTokens } from '../../scripts/lib/color.mjs'

const t = readTokens(fs.readFileSync(path.resolve('src/styles/tokens.css'), 'utf8'))

describe('contrastRatio', () => {
  it('calcula contraste conhecido', () => expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1))
  it('#777 sobre branco dá 4,48:1', () => expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2))
  it('não depende da ordem e aceita a forma curta', () =>
    expect(contrastRatio('#fff', '#123F2E')).toBeCloseTo(contrastRatio('#123F2E', '#ffffff'), 10))
  it('recusa o que não é hex', () => expect(() => contrastRatio('rgb(0 0 0)', '#fff')).toThrow(TypeError))
})

describe('readTokens', () => {
  it('lê --nome: valor; e apara o valor', () =>
    expect(readTokens(':root {\n  --a: #FFF;\n  --b:  rgb(1 2 3 / .5) ;\n  color: red;\n}')).toEqual({ '--a': '#FFF', '--b': 'rgb(1 2 3 / .5)' }))
  it('ignora comentários', () => expect(readTokens('/* --x: 1; */ --y: 2;')).toEqual({ '--y': '2' }))
})

describe('tokens.css', () => {
  it('tem as cores das Global Constraints', () => expect(t).toMatchObject({
    '--green-950': '#0A2219', '--green-900': '#0E3024', '--green-800': '#123F2E', '--green-700': '#1B5640',
    '--green-100': '#E3EDE6', '--gold-500': '#E3A72F', '--gold-300': '#F2CF7E', '--gold-700': '#8A6210',
    '--cream-50': '#FFFDF8', '--cream-100': '#FBF7EE', '--cream-200': '#F4ECDA', '--ink-900': '#14201A',
    '--ink-600': 'rgb(20 32 26 / .68)', '--line': 'rgb(18 63 46 / .14)',
    '--theme-natureza': '#123F2E', '--theme-rio': '#0F4C5C', '--theme-tradicao': '#8C3B21', '--theme-fe': '#8A5D0E',
  }))

  it('tem a tipografia, o layout, a forma e o movimento da spec §5.1', () => expect(t).toMatchObject({
    '--font-sans': '"Poppins", system-ui, sans-serif',
    '--font-serif': '"Fraunces Variable", Georgia, serif',
    '--fs-hero': 'clamp(4.5rem, 21vw, 20rem)',
    '--fs-display': 'clamp(2.75rem, 7vw, 6.5rem)',
    '--fs-h2': 'clamp(2.25rem, 5vw, 4.5rem)',
    '--fs-h3': 'clamp(1.25rem, 1.6vw, 1.625rem)',
    '--fs-lead': 'clamp(1.125rem, 1.4vw, 1.375rem)',
    '--fs-body': '1.0625rem',
    '--fs-small': '.875rem',
    '--fs-eyebrow': '.6875rem',
    '--layout-max': '1440px',
    '--gutter': 'clamp(20px, 4.2vw, 60px)',
    '--edge': 'max(var(--gutter), calc((100vw - var(--layout-max)) / 2 + var(--gutter)))',
    '--section-y': 'clamp(88px, 12vw, 160px)',
    '--r-sm': '12px', '--r-md': '20px', '--r-lg': '28px', '--r-pill': '999px',
    '--shadow-card': '0 16px 40px rgb(18 63 46 / .10)',
    '--glow-gold': '0 0 48px rgb(227 167 47 / .25)',
    '--ease-out': 'cubic-bezier(.16, 1, .3, 1)',
    '--dur-fast': '.2s', '--dur-base': '.5s', '--dur-slow': '.9s',
  }))

  // Pares da brief e os pares texto/fundo que os componentes usam.
  it.each([
    ['--gold-500', '--green-800', 4.5], ['--cream-100', '--green-800', 4.5],
    ['--gold-700', '--cream-100', 4.5], ['--ink-900', '--cream-100', 7],
    ['--cream-100', '--theme-natureza', 4.5], ['--cream-100', '--theme-rio', 4.5],
    ['--cream-100', '--theme-tradicao', 4.5], ['--cream-100', '--theme-fe', 4.5],
    ['--gold-700', '--cream-50', 4.5], ['--gold-700', '--cream-200', 4.5],
    ['--green-800', '--cream-100', 4.5], ['--green-800', '--cream-200', 4.5], ['--green-800', '--green-100', 4.5],
    ['--gold-700', '--green-100', 4.5],
    ['--ink-900', '--cream-200', 7], ['--ink-900', '--cream-50', 7],
    ['--cream-100', '--green-900', 4.5], ['--cream-100', '--green-950', 4.5], ['--cream-100', '--green-700', 4.5],
    ['--gold-500', '--green-900', 4.5], ['--gold-500', '--green-950', 4.5],
    ['--green-950', '--gold-500', 4.5], ['--green-950', '--gold-300', 4.5],
  ])('%s sobre %s ≥ %s', (a, b, min) => expect(contrastRatio(t[a], t[b])).toBeGreaterThanOrEqual(min))
})

// Ruling 11: anel de foco (WCAG 1.4.11, ≥ 3:1) com a cor certa para cada fundo.
// O anel fica no fundo EM VOLTA do elemento focado, com 3 px de afastamento.
const css = file => fs.readFileSync(path.resolve('src/styles', file), 'utf8')

/** Cor sólida de `fg` com opacidade `alpha` sobre `bg` (para o vidro do header). */
const over = (fg, alpha, bg) => '#' + [1, 3, 5]
  .map(i => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
  .map(v => v.toString(16).padStart(2, '0')).join('')

describe('anel de foco', () => {
  it(':focus-visible usa 2px sólido em var(--focus-ring), com 3px de afastamento', () => {
    const rule = css('base.css').match(/(?:^|\n)\s*:focus-visible\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toMatch(/outline:\s*2px solid var\(--focus-ring\)/)
    expect(rule).toMatch(/outline-offset:\s*3px/)
  })

  it('o padrão (fundos claros) é --gold-700', () => expect(t['--focus-ring']).toBe('var(--gold-700)'))

  it('contextos escuros trocam para --gold-500 e o header transparente para --cream-100', () => {
    const layout = css('layout.css')
    expect(layout).toMatch(/\.section--dark,[^{]*\.site-footer,[^{]*\.menu-mobile[^{]*\{[^}]*--focus-ring:\s*var\(--gold-500\)/)
    expect(layout).toMatch(/\[data-header-theme="over-dark"\]\s*\{[^}]*--header-focus:\s*var\(--cream-100\)/)
  })

  it.each([
    // --gold-700: superfícies claras.
    ['--gold-700', '--cream-50'], ['--gold-700', '--cream-100'], ['--gold-700', '--cream-200'], ['--gold-700', '--green-100'],
    // --gold-500: seções escuras, menu mobile, rodapé e lightbox.
    ['--gold-500', '--green-800'], ['--gold-500', '--green-900'], ['--gold-500', '--green-950'],
    // --cream-100: header transparente sobre o hero (o ouro 500 dá só 2,7:1 sobre o tema Fé).
    ['--cream-100', '--theme-natureza'], ['--cream-100', '--theme-rio'], ['--cream-100', '--theme-tradicao'],
    ['--cream-100', '--theme-fe'], ['--cream-100', '--green-950'],
  ])('%s sobre %s ≥ 3', (ring, bg) => expect(contrastRatio(t[ring], t[bg])).toBeGreaterThanOrEqual(3))

  it('header com vidro (.is-scrolled): --green-800 ≥ 3 mesmo com o hero escuro atrás do vidro', () => {
    for (const behind of ['--green-950', '--theme-fe', '--cream-100']) {
      expect(contrastRatio(t['--green-800'], over(t['--cream-100'], 0.78, t[behind]))).toBeGreaterThanOrEqual(3)
    }
  })

  it('Home: o hero de temas usa anel --cream-100 (≥ 3 nos 4 temas) e o vídeo fica em .section--dark (--gold-500)', () => {
    const home = css('sections/home.css')
    expect(home).toMatch(/\.hero-themes\s*\{[^}]*--focus-ring:\s*var\(--cream-100\)/)
    for (const theme of ['--theme-natureza', '--theme-rio', '--theme-tradicao', '--theme-fe']) {
      expect(contrastRatio(t['--cream-100'], t[theme])).toBeGreaterThanOrEqual(3)
    }
    const index = fs.readFileSync(path.resolve('index.html'), 'utf8')
    expect(index).toMatch(/<section[^>]*class="[^"]*\bvideo-section\b[^"]*\bsection--dark\b/)
  })

  // Foto de fundo do hero: no pior caso (pixel branco na foto translúcida sobre o tema mais claro), só o véu
  // da barra já garante 4,5:1 para o creme das abas, da pausa e do "Role".
  it('Home: o véu da barra do hero mantém o creme ≥ 4,5 sobre a foto de fundo, mesmo num pixel branco', () => {
    const home = css('sections/home.css')
    const opacity = Number(home.match(/\.hero-themes__backdrop-img\s*\{[^}]*opacity:\s*var\(--backdrop-opacity,\s*(\.\d+)\)/)?.[1])
    const scrim = Number(home.match(/\.hero-themes__bar::before\s*\{[^}]*rgb\(10 34 25 \/ (\.\d+)\) 32px\)/)?.[1])
    expect(opacity).toBeGreaterThan(0)
    expect(scrim).toBeGreaterThan(0)
    for (const theme of ['--theme-natureza', '--theme-rio', '--theme-tradicao', '--theme-fe']) {
      const fundo = over(t['--green-950'], scrim, over('#FFFFFF', opacity, t[theme]))
      expect([theme, contrastRatio(t['--cream-100'], fundo) >= 4.5]).toEqual([theme, true])
    }
  })

  it('o voltar ao topo (fixo sobre qualquer fundo) usa anel --gold-700 com halo --cream-100 (≥ 3 entre os dois)', () => {
    const components = css('components.css')
    expect(components).toMatch(/\.to-top\s*\{[^}]*--focus-ring:\s*var\(--gold-700\)/)
    expect(components).toMatch(/\.to-top:focus-visible\s*\{[^}]*box-shadow:\s*0 0 0 3px var\(--cream-100\)/)
    expect(contrastRatio(t['--gold-700'], t['--cream-100'])).toBeGreaterThanOrEqual(3)
  })
})
