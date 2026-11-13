// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HtmlValidate, StaticConfigLoader } from 'html-validate'
import { contrastRatio, readTokens } from '../../scripts/lib/color.mjs'

// Home (spec §7.1), lida do index.html do código-fonte (os partials ainda são comentários @include).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const readJson = rel => JSON.parse(read(rel))

const html = read('index.html')
const doc = new DOMParser().parseFromString(html, 'text/html')
const inventario = readJson('content/inventario.json')
const { lugares } = readJson('content/lugares.json')
const manifest = readJson('scripts/images.manifest.json')

const $ = (sel, el = doc) => el.querySelector(sel)
const $$ = (sel, el = doc) => [...el.querySelectorAll(sel)]
const text = el => el?.textContent.replace(/\s+/g, ' ').trim()
const lugar = slug => lugares.find(l => l.slug === slug)
const doInventario = categoria => inventario.filter(i => i.categoria === categoria)
const urlsDoManifest = new Set(Object.values(manifest).flatMap(r => [r.large.url, r.small?.url]).filter(Boolean))
const SECOES = ['explore', 'pontos', 'numeros', 'historia', 'eventos']
const { semFotos } = readJson('scripts/images.config.json')
const slugDe = a => a.getAttribute('href').split('/').filter(Boolean).pop()

describe('Home: estrutura', () => {
  it('as seções aparecem na ordem: inicio, a-cidade, video, explore, pontos, numeros, historia, eventos', () => {
    const ordem = ['inicio', 'a-cidade', 'video', 'explore', 'pontos', 'numeros', 'historia', 'eventos']
    expect($$('main section[id]').map(s => s.id).filter(id => ordem.includes(id))).toEqual(ordem)
  })

  it('as seções 5 a 9 ficam entre os marcadores da parte 2, e o cta-fotos fecha o main', () => {
    const parte2 = html.match(/<!-- home:parte-2:inicio -->([\s\S]*)<!-- home:parte-2:fim -->/)?.[1] ?? ''
    for (const id of SECOES) expect(parte2).toMatch(new RegExp(`<section\\b[^>]*\\bid="${id}"`))
    expect(html).toMatch(/<!-- home:parte-2:fim -->\s*<!-- @include cta-fotos -->\s*<\/main>/)
  })

  it.each([
    ['explore', 'Explore', 'Tudo o que a cidade tem de melhor', 'tem de melhor'],
    ['pontos', null, 'Pontos turísticos', null],
    ['numeros', 'Em números', 'Pequena no tamanho, gigante no coração', 'gigante no coração'],
    ['historia', null, 'De fazenda com capela a município', 'a município'],
    ['eventos', 'Agenda cultural', 'Festas que contam quem somos', 'contam quem somos'],
  ])('#%s: etiqueta %j e título exatamente como na spec', (id, etiqueta, titulo, destaque) => {
    const section = $(`#${id}`)
    const h2 = $(`#${section.getAttribute('aria-labelledby')}`, section)
    expect(h2?.tagName).toBe('H2')
    expect(text(h2)).toBe(titulo)
    expect(text($('em.accent', h2))).toBe(destaque ?? undefined)
    if (etiqueta) expect(text($('.eyebrow', section))).toBe(etiqueta)
  })
})

describe('Home: explore', () => {
  it('bento: 4 cards com href /pontos-turisticos/, /eventos/, /comunidades/ e /comercios/ e rótulos 06 lugares, 07 eventos, 05 comunidades e 06 negócios', () => {
    const cards = $$('#explore [data-bento] > a.card-bento')
    expect(cards.map(a => a.getAttribute('href'))).toEqual(['/pontos-turisticos/', '/eventos/', '/comunidades/', '/comercios/'])
    expect(cards.map(a => text($('.card-bento__label', a)))).toEqual(['06 lugares', '07 eventos', '05 comunidades', '06 negócios'])
    for (const a of cards) expect(a.getAttribute('data-cursor')).toBe('Ver')
  })
})

describe('Home: pontos', () => {
  it('pontos: 6 cards com href igual a cada ponto do inventário e um card-place--more para /pontos-turisticos/', () => {
    const pontos = doInventario('pontos-turisticos')
    const cards = $$('#pontos [data-horizontal] > a.card-place')
    const fotos = cards.filter(a => !a.classList.contains('card-place--more'))
    expect(fotos.map(a => a.getAttribute('href'))).toEqual(pontos.map(p => `/pontos-turisticos/${p.slug}/`))
    expect(fotos.map(a => text($('.card-place__title', a)))).toEqual(pontos.map(p => p.titulo))
    expect(fotos.map(a => text($('.card-place__text', a)))).toEqual(pontos.map(p => lugar(p.slug).resumo))
    const mais = cards.filter(a => a.classList.contains('card-place--more'))
    expect(mais.map(a => a.getAttribute('href'))).toEqual(['/pontos-turisticos/'])
    expect(cards.at(-1)).toBe(mais[0])
  })
})

describe('Home: números', () => {
  it('números: data-count-to 2717, 430 e 270, e data-count-years-since="1963-03-01" mostrando 63', () => {
    const numeros = $$('#numeros .stat__number[data-count-to]')
    const fixos = numeros.filter(n => !n.hasAttribute('data-count-years-since'))
    expect(fixos.map(n => n.getAttribute('data-count-to'))).toEqual(['2717', '430', '270'])
    // Sem JS o HTML já mostra o valor final, formatado em pt-BR.
    expect(fixos.map(n => text($('.stat__value', n)))).toEqual(['2.717', '430', '270'])
    const anos = numeros.filter(n => n.getAttribute('data-count-years-since') === '1963-03-01')
    expect(anos).toHaveLength(1)
    expect(text($('.stat__value', anos[0]))).toBe('63')
  })

  it('os rótulos e as legendas são os da spec, na ordem', () => {
    expect($$('#numeros .stat').map(s => [text($('.stat__number', s)), text($('.stat__label strong', s)), text($('.stat__label', s))])).toEqual([
      ['2.717', 'Habitantes', 'Habitantes População estimada'],
      ['430km²', 'Território', 'Território No bioma Cerrado'],
      ['63', 'Anos de emancipação', 'Anos de emancipação Lei Estadual nº 2.764, de 1962'],
      ['270km', 'De Belo Horizonte', 'De Belo Horizonte Microrregião de Curvelo'],
    ])
  })
})

describe('Home: história', () => {
  const MARCOS = [
    ['Origens', 'A cidade nasce em torno de uma fazenda com uma capela.'],
    ['1910', 'Chega a estação de trem, o povoado se forma ao redor e os irmãos Moreira constroem uma nova capela em terreno doado.'],
    ['1943', 'Um decreto-lei estadual dá o nome de Nossa Senhora da Glória ao antigo Piçarrão.'],
    ['30/12/1962', 'A Lei Estadual nº 2.764 cria o município de Santo Hipólito; distritos como Nossa Senhora da Glória, antes ligados a Corinto, passam a fazer parte dele.'],
    ['1º/03/1963', 'Instalação do município, data registrada no brasão.'],
  ]

  it('linha do tempo: 5 itens com as datas Origens, 1910, 1943, 30/12/1962 e 1º/03/1963', () => {
    const itens = $$('#historia [data-timeline] .timeline__item')
    expect(itens.map(i => text($('.timeline__date', i)))).toEqual(MARCOS.map(m => m[0]))
    expect(itens.map(i => text($('.timeline__text', i)))).toEqual(MARCOS.map(m => m[1]))
    expect($('#historia [data-timeline] .timeline__line .timeline__progress')).not.toBeNull()
  })
})

describe('Home: eventos', () => {
  it('eventos: 7 linhas hover-list__row com href igual a cada evento do inventário e data-preview-src existente no manifest', () => {
    const eventos = doInventario('eventos')
    const linhas = $$('#eventos [data-hover-preview] > a.hover-list__row')
    expect(linhas).toHaveLength(7)
    expect(linhas.map(a => a.getAttribute('href'))).toEqual(eventos.map(e => `/eventos/${e.slug}/`))
    expect(linhas.map(a => text($('.hover-list__name', a)))).toEqual(eventos.map(e => e.titulo))
    expect(linhas.map(a => text($('.hover-list__tag', a)))).toEqual(eventos.map(e => lugar(e.slug).tipo))
    // Ruling 27: os eventos sem fotos (semFotos) não pegam emprestada uma paisagem qualquer.
    for (const a of linhas.filter(a => !semFotos.includes(slugDe(a)))) expect(urlsDoManifest).toContain(a.getAttribute('data-preview-src'))
  })

  it('evento sem fotos (Ruling 27): sem data-preview-src nem <img>, com miniatura tipográfica da inicial', () => {
    const linhas = $$('#eventos [data-hover-preview] > a.hover-list__row').filter(a => semFotos.includes(slugDe(a)))
    expect(linhas.map(slugDe)).toEqual(['encontro-dos-cachaceiros'])
    for (const a of linhas) {
      expect(a.hasAttribute('data-preview-src')).toBe(false)
      expect($('img', a)).toBeNull()
      const thumb = $('.hover-list__thumb.hover-list__thumb--type', a)
      expect(thumb?.getAttribute('aria-hidden')).toBe('true')
      expect(text(thumb)).toBe(text($('.hover-list__name', a)).charAt(0))
    }
  })

  it('a faixa rolando tem os 5 nomes com o separador em SVG (sem o caractere ✦)', () => {
    const faixa = $('#eventos [data-marquee]')
    expect($$('.marquee__item', faixa).map(text)).toEqual(['Forrozão', 'Desfile Cívico', 'Corrida de Argolinhas', 'Quadrilha dos Amigos', 'Campeonatos'])
    expect($$('.marquee__track > svg.marquee__sep use', faixa).map(u => u.getAttribute('href'))).toEqual(Array(5).fill('/icons.svg#star'))
    expect(faixa.textContent).not.toMatch(/✦/)
  })
})

describe('Home: imagens e acessibilidade da parte 2', () => {
  const porUrl = new Map(Object.values(manifest).map(r => [r.large.url, r]))
  const imgs = SECOES.flatMap(id => $$(`#${id} img`))

  it('toda <img> vem do manifest, com width/height e srcset reais (Ruling 20), lazy e async', () => {
    expect(imgs.length).toBeGreaterThan(0)
    for (const img of imgs) {
      const r = porUrl.get(img.getAttribute('src'))
      expect(r, img.getAttribute('src')).toBeDefined()
      expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual([String(r.large.width), String(r.large.height)])
      const srcset = r.small && r.small.width < r.large.width ? `${r.small.url} ${r.small.width}w, ${r.large.url} ${r.large.width}w` : null
      expect(img.getAttribute('srcset')).toBe(srcset)
      expect(img.hasAttribute('alt')).toBe(true)
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('decoding')).toBe('async')
    }
  })

  it('cards, bento e linhas de eventos são links reais (funcionam no primeiro toque)', () => {
    const links = $$('#explore .card-bento, #pontos .card-place, #eventos .hover-list__row')
    expect(links).toHaveLength(4 + 7 + 7)
    for (const a of links) expect(a.tagName === 'A' && a.getAttribute('href')?.startsWith('/')).toBe(true)
  })

  it('números e eventos são superfícies escuras com anel de foco ouro 500 (.section--dark)', () => {
    for (const id of ['numeros', 'eventos']) expect($(`#${id}`).classList.contains('section--dark')).toBe(true)
  })

  it('o véu sobre a foto dos números garante 4,5:1 para o creme, o ouro 500 e o texto suave mesmo sobre branco', () => {
    const t = readTokens(read('src/styles/tokens.css'))
    const parte2 = read('src/styles/sections/home.css').split('/* === Home parte 2 === */')[1] ?? ''
    const veu = parte2.match(/\.numbers__media::after\s*\{([^}]*)\}/)?.[1] ?? ''
    const alphas = [...veu.matchAll(/rgb\(10 34 25 \/ (0?\.\d+|1)\)/g)].map(m => Number(m[1]))
    expect(alphas.length).toBeGreaterThan(0)
    const over = (fg, alpha, bg) => '#' + [1, 3, 5]
      .map(i => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
      .map(v => v.toString(16).padStart(2, '0')).join('')
    const fundo = over(t['--green-950'], Math.min(...alphas), '#FFFFFF')
    expect(contrastRatio(t['--cream-100'], fundo)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(t['--gold-500'], fundo)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(over(t['--cream-100'], 0.72, fundo), fundo)).toBeGreaterThanOrEqual(4.5)
  })

  it('o index.html passa no html-validate (.htmlvalidate.json do projeto)', async () => {
    // doctype-style fica de fora: "<!doctype html>" em minúsculas é o do contrato de páginas.
    const config = readJson('.htmlvalidate.json')
    const validator = new HtmlValidate(new StaticConfigLoader({ ...config, rules: { ...config.rules, 'doctype-style': 'off' } }))
    const report = await validator.validateString(html, 'index.html')
    expect(report.results.flatMap(r => r.messages.map(m => `${m.line}:${m.column} ${m.ruleId} ${m.message}`))).toEqual([])
  })
})

describe('Home: head', () => {
  it('head: title ≤ 60, og:image /og/home-og-default.jpg e JSON-LD que tem City e TouristDestination', () => {
    const title = text($('head title'))
    expect(title?.length).toBeGreaterThan(0)
    expect(title.length).toBeLessThanOrEqual(60)
    expect($('meta[property="og:image"]')?.getAttribute('content')).toBe('/og/home-og-default.jpg')
    const tipos = $$('script[type="application/ld+json"]')
      .map(s => JSON.parse(s.textContent))
      .flatMap(j => j['@graph'] ?? [j])
      .flatMap(n => [n['@type']].flat())
    expect(tipos).toEqual(expect.arrayContaining(['City', 'TouristDestination']))
  })
})

// Task 13b (desempenho): o primeiro layout da Home acontece num script inline no fim do body, que espera o CSS
// e roda antes dos módulos; sem ele, quando o JS chegava junto com o CSS, o layout inteiro (~80 ms) caía dentro
// da avaliação do bundle da GSAP.
describe('Home: primeiro layout antes dos módulos', () => {
  it('o último elemento do body é um script inline clássico que lê o layout', () => {
    const last = [...doc.body.children].at(-1)
    expect(last?.tagName).toBe('SCRIPT')
    expect(last.hasAttribute('src') || last.hasAttribute('type')).toBe(false)
    expect(last.textContent).toMatch(/offsetHeight/)
    expect(html).toMatch(/<!-- @include footer -->\s*(<!--[\s\S]*?-->\s*)?<script>[^<]*offsetHeight[^<]*<\/script>\s*<\/body>/)
  })
})
