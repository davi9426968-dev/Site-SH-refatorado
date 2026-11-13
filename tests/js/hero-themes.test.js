// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, bindHeroThemes, flankFontSize, init, nextIndex, readThemes } from '../../src/js/fx/hero-themes.js'

const read = f => readFileSync(resolve(process.cwd(), f), 'utf8')
const index = read('index.html')
const manifest = JSON.parse(read('scripts/images.manifest.json'))
const video = JSON.parse(read('public/video/video.json'))
const parsed = () => new DOMParser().parseFromString(index, 'text/html')
const heroMarkup = () => parsed().querySelector('[data-hero-themes]').outerHTML

const TEMAS = [
  ['natureza', 'Natureza'], ['rio', 'Rio das Velhas'], ['tradicao', 'Tradição'], ['fe', 'Fé'],
]

const media = ({ reduce = false, fine = false } = {}) => {
  window.matchMedia = vi.fn(q => ({
    matches: q.includes('reduce') ? reduce : q.includes('no-preference') ? !reduce : q.includes('pointer: fine') ? fine : false,
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
}

let root, api
const tabs = () => [...root.querySelectorAll('[data-theme]')]
const pressed = () => tabs().map(t => t.getAttribute('aria-pressed'))
const word = () => root.querySelector('.hero-themes__word').textContent.trim()

beforeEach(() => {
  vi.useFakeTimers()
  document.documentElement.className = 'js motion-ok'
  document.body.innerHTML = heroMarkup()
  root = document.querySelector('[data-hero-themes]')
  api = null
  media()
})

afterEach(() => {
  api?.destroy()
  vi.clearAllTimers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('readThemes', () => {
  it('lê os 4 botões, cada um com 4 órbitas', () => {
    const themes = readThemes(root)
    expect(themes.map(t => t.word)).toEqual(TEMAS.map(([, w]) => w))
    expect(themes.map(t => t.color)).toEqual(TEMAS.map(([k]) => `var(--theme-${k})`))
    for (const t of themes) {
      expect(Object.keys(t).sort()).toEqual(['alt', 'color', 'image', 'imageSmall', 'orbits', 'word'])
      expect(t.orbits).toHaveLength(4)
    }
  })

  it('as imagens, os textos alternativos e as órbitas vêm do manifest', () => {
    readThemes(root).forEach((t, i) => {
      const [key] = TEMAS[i]
      const tema = manifest[`home/tema-${key}`]
      expect(t.image).toBe(tema.large.url)
      expect(t.imageSmall).toBe(tema.small.url)
      expect(t.alt).toBe(tema.alt)
      expect(t.orbits).toEqual([1, 2, 3, 4].map(n => manifest[`home/orbita-${key}-${n}`].small.url))
    })
  })
})

describe('nextIndex', () => {
  it.each([[3, 4, 1, 0], [0, 4, -1, 3], [1, 4, 1, 2]])('nextIndex(%s,%s,%s)=%s', (i, n, dir, out) =>
    expect(nextIndex(i, n, dir)).toBe(out))
  it('dir padrão é 1', () => expect(nextIndex(2, 4)).toBe(3))
})

// Task 13b (decisão do "Fé"): no desktop a palavra curta sumia atrás do arco; as letras se abrem para as
// faixas livres de fora das órbitas, com o tamanho que cabe nelas.
describe('flankFontSize', () => {
  const base = { word: { left: 60, right: 1380 }, obstacles: { left: 250, right: 1180 }, charRatio: 0.6, font: 522, archWidth: 420 }

  it('Fé (567 px atrás de um arco de 420 px) abre para as laterais, no tamanho da faixa menor', () => {
    expect(flankFontSize({ ...base, lineWidth: 567 })).toBeCloseTo((190 * 0.9) / 0.6, 5)
  })

  it('palavra longa, que já se lê em volta do arco, fica como está', () => {
    expect(flankFontSize({ ...base, lineWidth: 1100 })).toBeNull()
  })

  it('nunca passa do tamanho atual e desiste se a faixa for estreita demais', () => {
    expect(flankFontSize({ ...base, obstacles: { left: 600, right: 800 }, lineWidth: 567 })).toBe(522)
    expect(flankFontSize({ ...base, obstacles: { left: 90, right: 1350 }, lineWidth: 567 })).toBeNull()
  })
})

describe('hero de temas: palavra curta no desktop', () => {
  const rect = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top })

  it('Fé ganha a classe --flank e o tamanho da faixa; Rio das Velhas não', () => {
    // Sem layout no happy-dom: larguras medidas pelos getters (linha: 567 px "Fé" / 1250 px; letra: .6 em).
    const proto = HTMLElement.prototype
    const saved = ['scrollWidth', 'offsetWidth', 'clientWidth'].map(k => [k, Object.getOwnPropertyDescriptor(proto, k)])
    const long = () => root.querySelector('.hero-themes__line')?.textContent.length > 3
    Object.defineProperty(proto, 'scrollWidth', { configurable: true, get() { return this.classList.contains('hero-themes__line') ? (this.textContent.length > 3 ? 1250 : 567) : 0 } })
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get() { return this.classList.contains('hero-themes__char') ? 0.6 * parseFloat(getComputedStyle(this).fontSize) : 0 } })
    Object.defineProperty(proto, 'clientWidth', { configurable: true, get() { return this.classList.contains('hero-themes__word') ? 1320 : 0 } })
    try {
      window.matchMedia = vi.fn(q => ({ matches: q.includes('900px') || q.includes('no-preference'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
      const wordEl = root.querySelector('.hero-themes__word')
      wordEl.style.fontSize = '522px'
      wordEl.getBoundingClientRect = rect(60, 200, 1320, 450)
      root.querySelector('.hero-themes__arch').getBoundingClientRect = rect(498, 178, 420, 560)
      const orbits = [...root.querySelectorAll('.hero-themes__orbit')]
      orbits[0].getBoundingClientRect = rect(250, 185, 210, 245)
      orbits[1].getBoundingClientRect = rect(950, 110, 150, 180)
      orbits[2].getBoundingClientRect = rect(310, 540, 170, 200)
      orbits[3].getBoundingClientRect = rect(990, 495, 190, 235)
      const themes = readThemes(root)
      applyTheme(root, themes[3], { instant: true })
      const line = root.querySelector('.hero-themes__line')
      expect(long()).toBe(false)
      expect(line.classList.contains('hero-themes__line--flank')).toBe(true)
      expect(parseFloat(line.style.fontSize)).toBeCloseTo((190 * 0.9) / 0.6, 0)
      applyTheme(root, themes[1], { instant: true })
      expect(root.querySelector('.hero-themes__line').classList.contains('hero-themes__line--flank')).toBe(false)
    } finally {
      for (const [k, d] of saved) d ? Object.defineProperty(proto, k, d) : delete proto[k]
    }
  })
})

describe('applyTheme', () => {
  it('instantâneo: cor, palavra, foto e órbitas do tema, e aria-pressed só no botão dele', () => {
    const [, rio] = readThemes(root)
    applyTheme(root, rio, { instant: true })
    expect(root.style.getPropertyValue('--hero-color')).toBe('var(--theme-rio)')
    expect(word()).toBe('Rio das Velhas')
    expect(pressed()).toEqual(['false', 'true', 'false', 'false'])
    const photo = root.querySelector('.hero-themes__photo:not([aria-hidden])')
    expect([rio.image, rio.imageSmall]).toContain(photo.getAttribute('src'))
    expect(photo.hasAttribute('srcset')).toBe(false)
    expect(photo.getAttribute('alt')).toBe(rio.alt)
    expect([...root.querySelectorAll('.hero-themes__orbit img')].map(img => img.getAttribute('src'))).toEqual(rio.orbits)
  })
})

describe('hero de temas', () => {
  it('clicar no botão 2 marca aria-pressed só nele e troca a palavra; com reduced é instantâneo', () => {
    media({ reduce: true })
    api = bindHeroThemes(root)
    expect(pressed()).toEqual(['true', 'false', 'false', 'false'])
    tabs()[1].click()
    expect(pressed()).toEqual(['false', 'true', 'false', 'false'])
    expect(word()).toBe('Rio das Velhas')
    expect(root.style.getPropertyValue('--hero-color')).toBe('var(--theme-rio)')
    expect(api.index()).toBe(1)
  })

  it('com movimento, clicar marca aria-pressed na hora e a troca anima (sem lançar)', () => {
    api = bindHeroThemes(root)
    expect(() => tabs()[2].click()).not.toThrow()
    expect(pressed()).toEqual(['false', 'false', 'true', 'false'])
    expect(api.index()).toBe(2)
  })

  it('sem troca automática com reduced motion', () => {
    media({ reduce: true })
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(7000)
    expect(api.index()).toBe(0)
    expect(pressed()[0]).toBe('true')
  })

  it('troca sozinha a cada 6000 ms com movimento permitido, voltando ao primeiro depois do último', () => {
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(5999)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(1)
    expect(api.index()).toBe(1)
    expect(pressed()[1]).toBe('true')
    vi.advanceTimersByTime(6000 * 3)
    expect(api.index()).toBe(0)
  })

  it('pausa com o mouse em cima e retoma do ponto onde parou', () => {
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(2000)
    root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    vi.advanceTimersByTime(7000)
    expect(api.index()).toBe(0)
    root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    vi.advanceTimersByTime(3999)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(1)
    expect(api.index()).toBe(1)
  })

  it('pausa com o foco de teclado (:focus-visible) dentro do hero', () => {
    api = bindHeroThemes(root)
    tabs()[0].focus()
    tabs()[0].dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    vi.advanceTimersByTime(7000)
    expect(api.index()).toBe(0)
    tabs()[0].blur()
    tabs()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    vi.advanceTimersByTime(6000)
    expect(api.index()).toBe(1)
  })

  // Task 10 (minor): o clique do mouse também foca o botão; esse foco (sem :focus-visible) não pode deixar a
  // troca automática parada depois que o mouse sai do hero.
  it('clicar com o mouse num tema (foco sem :focus-visible) não deixa a troca automática parada', () => {
    api = bindHeroThemes(root)
    const tab = tabs()[1]
    const matches = tab.matches.bind(tab)
    tab.matches = sel => (sel === ':focus-visible' ? false : matches(sel))
    root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    tab.focus()
    tab.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    tab.click()
    expect(api.index()).toBe(1)
    root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    vi.advanceTimersByTime(6000)
    expect(api.index()).toBe(2)
  })

  it('pausa com a aba oculta', () => {
    api = bindHeroThemes(root)
    const vis = state => {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    vis('hidden')
    vi.advanceTimersByTime(7000)
    expect(api.index()).toBe(0)
    vis('visible')
    vi.advanceTimersByTime(6000)
    expect(api.index()).toBe(1)
  })

  it('a troca manual reinicia a contagem dos 6000 ms', () => {
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(4000)
    tabs()[3].click()
    vi.advanceTimersByTime(5999)
    expect(api.index()).toBe(3)
    vi.advanceTimersByTime(1)
    expect(api.index()).toBe(0)
  })

  it('com intro-on, a entrada e a troca automática esperam sh:intro-done', () => {
    document.documentElement.classList.add('intro-on')
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(7000)
    expect(api.index()).toBe(0)
    document.documentElement.classList.remove('intro-on')
    window.dispatchEvent(new CustomEvent('sh:intro-done'))
    vi.advanceTimersByTime(6000)
    expect(api.index()).toBe(1)
  })

  it('marca o hero como pronto (.is-ready) ao assumir', () => {
    api = bindHeroThemes(root)
    expect(root.classList.contains('is-ready')).toBe(true)
  })

  // Task 13b: a foto do arco é o LCP; ela pinta no primeiro quadro (na pose de início da entrada) e a
  // entrada só a move e escala, sem esconder.
  it('a entrada sobe o arco de scale .9 sem escondê-lo (a foto pinta desde o primeiro quadro)', () => {
    api = bindHeroThemes(root)
    const arch = root.querySelector('.hero-themes__arch')
    expect(arch.style.opacity).not.toBe('0')
    expect(arch.style.transform).toMatch(/scale\(0\.9/)
    expect(arch.style.transform).toMatch(/80px/)
  })

  it('init é no-op sem [data-hero-themes]', () => {
    document.body.innerHTML = ''
    expect(() => init()).not.toThrow()
  })
})

describe('index.html: hero, faixa, A cidade e vídeo', () => {
  const doc = parsed()
  const $ = s => doc.querySelector(s)

  it('head: title, description, og:image e JSON-LD com City e TouristDestination', () => {
    expect($('title').textContent).toBe('Santo Hipólito-MG · Turismo, história e tradição')
    const description = $('meta[name="description"]').getAttribute('content')
    expect(description.length).toBeGreaterThanOrEqual(50)
    expect(description.length).toBeLessThanOrEqual(155)
    expect($('meta[property="og:image"]').getAttribute('content')).toBe('/og/home-og-default.jpg')
    const graph = JSON.parse($('script[type="application/ld+json"]').textContent)['@graph']
    const city = graph.find(n => n['@type'] === 'City')
    expect(city.name).toBe('Santo Hipólito')
    expect(city.containedInPlace.name).toBe('Minas Gerais')
    expect(graph.some(n => n['@type'] === 'TouristDestination')).toBe(true)
  })

  it('body com o header sobre fundo escuro e um único h1, visualmente oculto', () => {
    expect($('body').getAttribute('data-header-theme')).toBe('over-dark')
    const h1s = doc.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    expect(h1s[0].classList.contains('visually-hidden')).toBe(true)
    expect(h1s[0].textContent.trim()).toBe('Santo Hipólito — turismo, história e tradição em Minas Gerais')
  })

  it('#inicio: 4 botões "01 Natureza"… "04 Fé", o primeiro pressionado, e o CTA magnético para #a-cidade', () => {
    const hero = $('#inicio')
    expect(hero.hasAttribute('data-hero-themes')).toBe(true)
    const labels = [...hero.querySelectorAll('button.hero-themes__tab[data-theme]')].map(b => b.textContent.replace(/\s+/g, ' ').trim())
    expect(labels).toEqual(['01 Natureza', '02 Rio das Velhas', '03 Tradição', '04 Fé'])
    expect([...hero.querySelectorAll('[data-theme]')].map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false'])
    const cta = hero.querySelector('a[data-magnetic][href="#a-cidade"]')
    expect(cta.textContent.trim()).toBe('Explorar a cidade')
    expect(hero.querySelector('.hero-themes__word').getAttribute('aria-hidden')).toBe('true')
  })

  it('as órbitas estão na ordem 1 a 4 e começam com as fotos do primeiro tema, na mesma ordem', () => {
    const chips = [...$('#inicio').querySelectorAll('.hero-themes__orbit')]
    expect(chips.map(c => c.className.match(/hero-themes__orbit--(\d)/)[1])).toEqual(['1', '2', '3', '4'])
    expect(chips.map(c => c.querySelector('img').getAttribute('src')))
      .toEqual([1, 2, 3, 4].map(n => manifest[`home/orbita-natureza-${n}`].small.url))
  })

  it('a foto do hero é a do primeiro tema, com fetchpriority alto e as medidas reais', () => {
    const img = $('#inicio .hero-themes__photo')
    const tema = manifest['home/tema-natureza']
    expect(img.getAttribute('src')).toBe(tema.large.url)
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('width')).toBe(String(tema.large.width))
    expect(img.getAttribute('height')).toBe(String(tema.large.height))
    // Ruling 29: a foto do LCP tem também a largura menor (extra, 600) no srcset.
    expect(tema.extra?.[0]?.width).toBe(600)
    expect(img.getAttribute('srcset')).toBe(`${tema.extra[0].url} ${tema.extra[0].width}w, ${tema.small.url} ${tema.small.width}w, ${tema.large.url} ${tema.large.width}w`)
    // Recorte 3:4 (Task 13b): a largura exibida é a do arco, min(78vw, 420px) na spec.
    expect(tema.large.width / tema.large.height).toBeCloseTo(3 / 4, 2)
    expect(img.getAttribute('sizes')).toBe('min(78vw, 420px)')
  })

  it('faixa do brasão com o texto da spec', () => {
    expect($('.brand-bar').textContent.replace(/\s+/g, ' ').trim())
      .toBe('Município da região Central de Minas Gerais, às margens do Rio das Velhas — emancipado em 1962.')
    expect($('.brand-bar strong').textContent).toBe('emancipado em 1962')
  })

  it('#a-cidade: etiqueta, título letra a letra, 3 pilares e o botão para os pontos turísticos', () => {
    const s = $('#a-cidade')
    expect(s.querySelector('.eyebrow').textContent.trim()).toBe('A cidade')
    const h2 = s.querySelector('h2')
    expect(h2.hasAttribute('data-split')).toBe(true)
    expect(h2.textContent.trim()).toBe('Natureza tranquila, alma mineira')
    expect(h2.querySelector('em.accent').textContent).toBe('alma mineira')
    expect([...s.querySelectorAll('[data-pillars] .pillar__title')].map(t => t.textContent.trim()))
      .toEqual(['Gente acolhedora', 'Às margens do Rio das Velhas', 'Cultura e tradição'])
    expect(s.querySelector('[data-pillars]').textContent).toMatch(/feijão tropeiro.*frango com quiabo.*doce de leite artesanal/s)
    expect(s.querySelector('a.btn[href="/pontos-turisticos/"]').textContent.trim()).toBe('Explorar pontos turísticos')
    expect(s.querySelector('img[data-parallax]').getAttribute('src')).toBe(manifest['home/cidade-matriz'].large.url)
  })

  it('#video: título, atributos do vídeo e medidas de video.json, botão de som só com áudio', () => {
    const s = $('#video')
    expect(s.querySelector('h2').textContent.trim()).toBe('Santo Hipólito em movimento')
    expect(s.querySelector('[data-video-expand]')).not.toBeNull()
    const v = s.querySelector('[data-video] video')
    for (const a of ['muted', 'loop', 'playsinline']) expect(v.hasAttribute(a)).toBe(true)
    expect(v.getAttribute('preload')).toBe('none')
    expect(v.getAttribute('poster')).toBe('/video/santo-hipolito-poster.webp')
    expect(v.getAttribute('width')).toBe(String(video.width))
    expect(v.getAttribute('height')).toBe(String(video.height))
    expect(s.querySelector('[data-video-toggle]').getAttribute('aria-pressed')).toBe('false')
    expect(!!s.querySelector('[data-video-mute]')).toBe(video.hasAudio)
  })

  it('home.css usa a proporção de video.json no player', () => {
    expect(read('src/styles/sections/home.css')).toContain(`aspect-ratio: ${video.width} / ${video.height}`)
  })
})

// Task 13b (desempenho): a foto do arco é o LCP da Home e não pode esperar a intro nem a entrada.
describe('home.css: estado antes do fx/hero-themes', () => {
  const css = read('src/styles/sections/home.css')
  const rule = selector => {
    const at = css.indexOf(selector)
    return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
  }

  it('antes do .is-ready ficam ocultos palavra, órbitas, barra e header, mas não o palco nem o arco', () => {
    const hidden = css.match(/[^}]*:not\(\.is-ready\)[^{]*\{[^}]*opacity:\s*0[^}]*\}/g) ?? []
    expect(hidden.length).toBeGreaterThan(0)
    const selectors = hidden.join(' ')
    for (const s of ['__word', '__orbit', '__bar', '.site-header']) expect(selectors).toContain(s)
    expect(selectors).not.toMatch(/__stage|__arch|__photo/)
  })

  it('o arco começa visível na pose de início da entrada (80 px abaixo, scale .9)', () => {
    const arch = rule('.motion-ok .hero-themes:not(.is-ready) .hero-themes__arch')
    expect(arch).toMatch(/transform:\s*translateY\(80px\) scale\(\.9\)/)
    expect(arch).not.toMatch(/opacity/)
  })

  // Ruling 29: o itálico de destaque (Fraunces, 46 KB) só aparece abaixo da dobra; baixa quando a intro termina.
  it('durante a intro o itálico de destaque não usa a Fraunces', () => {
    expect(rule('.motion-ok.intro-on em.accent')).toMatch(/font-family:\s*inherit/)
  })

  it('durante a intro as órbitas nem baixam (display: none sob .motion-ok.intro-on)', () => {
    expect(rule('.motion-ok.intro-on .hero-themes__orbit')).toMatch(/display:\s*none/)
  })
})

// Ruling 30 / WCAG 2.2.2: o usuário pausa a troca automática.
describe('botão de pausa da troca de temas', () => {
  const btn = () => root.querySelector('.hero-themes__pause')

  it('é um button com aria-pressed=false e rótulo em pt-BR', () => {
    api = bindHeroThemes(root)
    expect(btn().tagName).toBe('BUTTON')
    expect(btn().type).toBe('button')
    expect(btn().getAttribute('aria-pressed')).toBe('false')
    expect(btn().getAttribute('aria-label')).toBe('Pausar troca de temas')
  })

  it('não existe com movimento reduzido (não há troca automática)', () => {
    media({ reduce: true })
    api = bindHeroThemes(root)
    expect(btn()).toBeNull()
  })

  it('pausar para o relógio de 6000 ms e a barra; apertar de novo retoma', () => {
    api = bindHeroThemes(root)
    vi.advanceTimersByTime(2000)
    btn().click()
    expect(btn().getAttribute('aria-pressed')).toBe('true')
    expect(btn().getAttribute('aria-label')).toBe('Retomar troca de temas')
    vi.advanceTimersByTime(20000)
    expect(api.index()).toBe(0)
    btn().click()
    expect(btn().getAttribute('aria-pressed')).toBe('false')
    expect(btn().getAttribute('aria-label')).toBe('Pausar troca de temas')
    vi.advanceTimersByTime(3999)
    expect(api.index()).toBe(0)
    vi.advanceTimersByTime(1)
    expect(api.index()).toBe(1)
  })

  it('sair do hero com o mouse ou do foco não retoma uma pausa do usuário', () => {
    api = bindHeroThemes(root)
    root.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    btn().click()
    root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    btn().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(20000)
    expect(api.index()).toBe(0)
  })

  it('escolher um tema à mão durante a pausa não reinicia a troca automática', () => {
    api = bindHeroThemes(root)
    btn().click()
    tabs()[2].click()
    vi.advanceTimersByTime(20000)
    expect(api.index()).toBe(2)
  })
})
