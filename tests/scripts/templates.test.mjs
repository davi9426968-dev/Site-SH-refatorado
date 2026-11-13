// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  escapeHtml, seoTitle, mapsUrl, telHref, renderPicture, renderJsonLd,
  renderDetailPage, renderHubPage, neighbors, buildSite,
} from '../../scripts/lib/templates.mjs'
import { contrastRatio, readTokens } from '../../scripts/lib/color.mjs'
import { HtmlValidate, StaticConfigLoader } from 'html-validate'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

const inventario = readJson('content/inventario.json')
const lugares = readJson('content/lugares.json')
const contatos = readJson('content/contatos-comercios.json')
const manifest = readJson('scripts/images.manifest.json')
const { semFotos } = readJson('scripts/images.config.json')

const pages = buildSite({ inventario, lugares, contatos, manifest, semFotos })
const htmlOf = file => {
  const found = pages.find(p => p.file === file)
  if (!found) throw new Error(`página não gerada: ${file}`)
  return found.html
}
const parse = html => new DOMParser().parseFromString(html, 'text/html')
const doc = file => parse(htmlOf(file))
const lugar = slug => lugares.lugares.find(l => l.slug === slug)
const categoria = slug => ({ slug, ...lugares.categorias[slug] })
const fotosDe = (cat, slug) => Object.keys(manifest).filter(k => k.startsWith(`${cat}/${slug}/`)).sort()
const meta = (d, sel) => d.querySelector(sel)?.getAttribute('content')
const jsonLd = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent))
const graphTypes = d => jsonLd(d).flatMap(j => j['@graph'] ?? [j]).map(n => n['@type'])
const text = el => el.textContent.replace(/\s+/g, ' ').trim()

const record = {
  dest: 'eventos/teste/01',
  alt: 'Palco "iluminado" & público',
  role: 'cover',
  large: { url: '/img/eventos/teste/01-1600.webp', width: 1600, height: 1067 },
  small: { url: '/img/eventos/teste/01-800.webp', width: 800, height: 533 },
  og: '/og/eventos-teste-01.jpg',
}

describe('utilitários', () => {
  it('escapeHtml troca & < > " e \'', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;')
    expect(escapeHtml(80)).toBe('80')
  })

  it('seoTitle', () => expect(seoTitle('Coreto')).toBe('Coreto · Santo Hipólito-MG'))

  it('mapsUrl e telHref', () => {
    expect(mapsUrl('Coreto')).toBe('https://www.google.com/maps/search/?api=1&query=Coreto%20Santo%20Hip%C3%B3lito%20MG')
    expect(telHref('(38) 9 9817-7279')).toBe('tel:+5538998177279')
  })

  it('telHref aceita fixo e recusa o que não é telefone', () => {
    expect(telHref('(38) 3725-1234')).toBe('tel:+553837251234')
    expect(() => telHref('9817-7279')).toThrow(TypeError)
    expect(() => telHref('(38) 99817-7279')).toThrow(TypeError)
  })
})

describe('renderPicture', () => {
  it('renderPicture: src=1600, srcset "…-800.webp 800w, …-1600.webp 1600w", width/height da 1600, alt escapado, lazy e async', () => {
    const html = renderPicture(record, { sizes: '50vw' })
    const img = parse(html).querySelector('img')
    expect(img.getAttribute('src')).toBe('/img/eventos/teste/01-1600.webp')
    expect(img.getAttribute('srcset')).toBe('/img/eventos/teste/01-800.webp 800w, /img/eventos/teste/01-1600.webp 1600w')
    expect(img.getAttribute('sizes')).toBe('50vw')
    expect(img.getAttribute('width')).toBe('1600')
    expect(img.getAttribute('height')).toBe('1067')
    expect(html).toContain('alt="Palco &quot;iluminado&quot; &amp; público"')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('decoding')).toBe('async')
    expect(img.hasAttribute('fetchpriority')).toBe(false)
  })

  it('hero: eager com fetchpriority high; classe e alt próprios', () => {
    const img = parse(renderPicture(record, { loading: 'eager', fetchpriority: 'high', className: 'x', alt: '' })).querySelector('img')
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(img.getAttribute('class')).toBe('x')
    expect(img.getAttribute('alt')).toBe('')
  })

  it('foto menor que 800 px (as duas saídas com a mesma largura): sem srcset repetido', () => {
    const small = { ...record, large: { url: '/a-1600.webp', width: 714, height: 833 }, small: { url: '/a-800.webp', width: 714, height: 833 } }
    const img = parse(renderPicture(small)).querySelector('img')
    expect(img.getAttribute('src')).toBe('/a-1600.webp')
    expect(img.hasAttribute('srcset')).toBe(false)
    expect(img.getAttribute('width')).toBe('714')
  })
})

describe('página de lugar', () => {
  it('detalhe com fotos: um h1, data-page, includes header/footer/cta-fotos, trilha / → /<categoria>/, galeria com N itens, og:image = capa .og', () => {
    const html = htmlOf('eventos/forrozao/index.html')
    const d = parse(html)
    const item = lugar('forrozao')

    expect(d.querySelectorAll('h1')).toHaveLength(1)
    expect(text(d.querySelector('h1'))).toBe('Forrozão')
    expect(d.querySelector('h1').hasAttribute('data-split')).toBe(true)
    expect(d.body.dataset.page).toBe('eventos')
    expect(d.body.dataset.headerTheme).toBe('over-dark')
    expect(html).toMatch(/<head>\s*<!-- @include head -->/)
    expect(html).toMatch(/<body[^>]*>\s*<!-- @include header -->\s*<main id="conteudo" tabindex="-1">/)
    expect(html).toMatch(/<!-- @include cta-fotos -->\s*<\/main>\s*<!-- @include footer -->\s*<\/body>/)

    const crumbs = [...d.querySelectorAll('nav.breadcrumb[aria-label="Você está em"] ol > li')]
    expect(crumbs.map(li => li.querySelector('a')?.getAttribute('href') ?? null)).toEqual(['/', '/eventos/', null])
    expect(text(crumbs[2].querySelector('[aria-current="page"]'))).toBe('Forrozão')

    const fotos = fotosDe('eventos', 'forrozao')
    const links = [...d.querySelectorAll('.gallery-section .gallery[data-gallery] > a.gallery__item[data-gallery-item]')]
    expect(links).toHaveLength(fotos.length)
    expect(links.map(a => a.getAttribute('href'))).toEqual(fotos.map(k => manifest[k].large.url))
    for (const a of links) {
      expect(a.dataset.reveal).toBe('clip')
      expect(a.dataset.cursor).toBe('Ver')
      expect(a.dataset.srcset).toMatch(/-800\.webp \d+w, .*-1600\.webp \d+w$/)
      expect(a.querySelector('img').getAttribute('loading')).toBe('lazy')
    }
    expect(text(d.querySelector('.gallery-section h2'))).toBe('Galeria')

    expect(meta(d, 'meta[property="og:image"]')).toBe(manifest['eventos/forrozao/01'].og)
    expect(text(d.querySelector('title'))).toBe(seoTitle('Forrozão'))
    expect(meta(d, 'meta[name="description"]')).toBe(item.descricao)
    expect(meta(d, 'meta[property="og:title"]')).toBe(seoTitle('Forrozão'))
    expect(meta(d, 'meta[property="og:description"]')).toBe(item.descricao)
  })

  it('hero com a capa 1600 eager/high sob parallax, etiqueta da categoria e chips; o resto das imagens é lazy', () => {
    const d = doc('eventos/forrozao/index.html')
    const hero = d.querySelector('section.page-hero')
    expect(hero.classList.contains('page-hero--type')).toBe(false)
    const media = hero.querySelector('.page-hero__media[data-parallax="0.12"]')
    const img = media.querySelector('img')
    expect(img.getAttribute('src')).toBe(manifest['eventos/forrozao/01'].large.url)
    expect(img.getAttribute('loading')).toBe('eager')
    expect(img.getAttribute('fetchpriority')).toBe('high')
    expect(text(hero.querySelector('.page-hero__content .eyebrow'))).toBe('Eventos')
    expect([...hero.querySelectorAll('.page-hero__chips .chip')].map(text)).toEqual(lugar('forrozao').chips)

    const others = [...d.querySelectorAll('img')].filter(i => i !== img)
    expect(others.length).toBeGreaterThan(0)
    for (const i of others) {
      expect(i.getAttribute('loading')).toBe('lazy')
      expect(i.hasAttribute('fetchpriority')).toBe(false)
    }
    for (const i of d.querySelectorAll('img')) {
      for (const a of ['alt', 'width', 'height']) expect(i.hasAttribute(a)).toBe(true)
      expect(i.getAttribute('decoding')).toBe('async')
    }
  })

  it('conteúdo: lead por linhas, parágrafos com reveal e info-card com as linhas do info e "Como chegar"', () => {
    const d = doc('pontos-turisticos/capela-nossa-senhora-das-dores/index.html')
    const item = lugar('capela-nossa-senhora-das-dores')
    const layout = d.querySelector('section.detail-layout.grid-12')
    expect(text(layout.querySelector('.lead[data-split-lines]'))).toBe(item.lead)
    expect([...layout.querySelectorAll('p[data-reveal]')].map(text)).toEqual(item.paragrafos)

    const card = layout.querySelector('aside .info-card')
    const rows = [...card.querySelectorAll('dl.info-card__list > .info-card__row')]
    const pares = rows.map(r => [text(r.querySelector('dt')), text(r.querySelector('dd'))])
    for (const info of item.info) expect(pares).toContainEqual([info.rotulo, info.valor])
    for (const info of item.info) {
      const row = rows.find(r => text(r.querySelector('dt')) === info.rotulo)
      expect(row.querySelector('dt svg use').getAttribute('href')).toBe(`/icons.svg#${info.icone}`)
    }

    const maps = [...card.querySelectorAll('.info-card__actions a')].find(a => text(a) === 'Como chegar')
    expect(maps.getAttribute('href')).toBe(mapsUrl(item.titulo))
    expect(maps.getAttribute('target')).toBe('_blank')
    expect(maps.getAttribute('rel')).toBe('noopener noreferrer')
    const share = card.querySelector('button[data-share]')
    expect(share.getAttribute('type')).toBe('button')
    expect(share.getAttribute('aria-label')).toBe('Compartilhar')
    expect(card.querySelector('[data-share-status]').getAttribute('aria-live')).toBe('polite')
    expect(card.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('JSON-LD: TouristAttraction (pontos), Place (comunidades), LocalBusiness com address (depósito), BreadcrumbList em todos; JSON válido', () => {
    expect(graphTypes(doc('pontos-turisticos/coreto/index.html'))).toEqual(['TouristAttraction', 'BreadcrumbList'])
    expect(graphTypes(doc('comunidades/salobro/index.html'))).toEqual(['Place', 'BreadcrumbList'])
    // Event exige startDate, e o conteúdo não tem datas (spec §10 não pede Event): só a trilha.
    expect(graphTypes(doc('eventos/forrozao/index.html'))).toEqual(['BreadcrumbList'])

    const [deposito] = jsonLd(doc('comercios/deposito-pereira/index.html'))
    const [business, crumbs] = deposito['@graph']
    expect(deposito['@context']).toBe('https://schema.org')
    expect(business['@type']).toBe('LocalBusiness')
    expect(business.name).toBe('Depósito Pereira')
    expect(business.address).toMatchObject({
      '@type': 'PostalAddress',
      streetAddress: 'Rua Raimundo da Glória Caldeira, 80, Santa Rita',
      postalCode: '39210-000',
      addressLocality: 'Santo Hipólito',
      addressRegion: 'MG',
      addressCountry: 'BR',
    })
    expect(business.image).toBe(manifest['comercios/deposito-pereira/01'].og)
    expect(crumbs.itemListElement.map(i => [i.position, i.name, i.item])).toEqual([
      [1, 'Início', '/'], [2, 'Comércios', '/comercios/'], [3, 'Depósito Pereira', undefined],
    ])

    const [ma] = jsonLd(doc('comercios/ma-fitness/index.html'))
    expect(ma['@graph'][0]['@type']).toBe('LocalBusiness')
    expect(ma['@graph'][0]).not.toHaveProperty('address')

    for (const p of pages) {
      const d = parse(p.html)
      expect([p.file, graphTypes(d).includes('BreadcrumbList')]).toEqual([p.file, true])
    }

    // Texto com "</script>" não fecha o bloco.
    const html = renderJsonLd({ ...lugar('coreto'), titulo: 'A </script><b>' }, categoria('pontos-turisticos'))
    expect(html).not.toContain('</script><b>')
    const parsed = JSON.parse(parse(html).querySelector('script').textContent)
    expect(parsed['@graph'][0].name).toBe('A </script><b>')
  })

  it('detalhe sem fotos: page-hero--type, sem data-gallery, com "Ainda não temos fotos"', () => {
    const d = doc('comunidades/caquende/index.html')
    const hero = d.querySelector('section.page-hero.page-hero--type')
    expect(hero).not.toBeNull()
    expect(hero.querySelector('.page-hero__media, img')).toBeNull()
    const word = hero.querySelector('[data-fit-text]')
    expect(word.getAttribute('aria-hidden')).toBe('true')
    expect(text(word)).toBe('Caquende')
    expect(d.querySelector('[data-gallery]')).toBeNull()
    expect(text(d.querySelector('.gallery-section'))).toContain('Ainda não temos fotos')
    expect(d.querySelector('.gallery-section a[href^="mailto:roberto133ro@gmail.com"]')).not.toBeNull()
    expect(d.querySelector('img[fetchpriority]')).toBeNull()
    expect(meta(d, 'meta[property="og:image"]')).toBe('/og/home-og-default.jpg')
    expect(graphTypes(d)).toEqual(['Place', 'BreadcrumbList'])
    expect(jsonLd(d)[0]['@graph'][0]).not.toHaveProperty('image')
  })

  it('comércio com contatos: tel: e Instagram com rel noopener', () => {
    const d = doc('comercios/ma-fitness/index.html')
    const card = d.querySelector('aside .info-card')
    const tels = [...card.querySelectorAll('a[href^="tel:"]')]
    expect(tels.map(a => a.getAttribute('href'))).toEqual(contatos['ma-fitness'].telefones.map(telHref))
    contatos['ma-fitness'].telefones.forEach((t, i) => expect(text(tels[i])).toBe(`Ligar ${t}`))

    const insta = card.querySelector('a[href="https://www.instagram.com/mafitness17/"]')
    expect(insta.getAttribute('target')).toBe('_blank')
    expect(insta.getAttribute('rel')).toBe('noopener noreferrer')
    expect(text(insta)).toBe('Instagram @mafitness17')

    const numero = [...card.querySelectorAll('.info-card__row')].find(r => text(r.querySelector('dd')) === '222')
    expect(numero.querySelector('dt svg use').getAttribute('href')).toBe('/icons.svg#map-pin')

    // Só o número do imóvel: sem "Ligar" nem Instagram.
    const imperio = doc('comercios/imperio-store/index.html').querySelector('aside .info-card')
    expect(imperio.querySelector('a[href^="tel:"]')).toBeNull()
    expect(imperio.querySelector('a[href*="instagram.com"]')).toBeNull()
    expect([...imperio.querySelectorAll('.info-card__row dd')].map(text)).toContain('119')

    // Sem contatos: nem linha de número.
    const padaria = doc('comercios/padaria-jr/index.html').querySelector('aside .info-card')
    expect([...padaria.querySelectorAll('.info-card__row dt')].map(text)).not.toContain('Número do imóvel')
  })

  it('info-card: botões na ordem "Como chegar", "Ligar", "Instagram" e "Compartilhar"', () => {
    const { telefones, instagram } = contatos['ma-fitness']
    const acoes = [...doc('comercios/ma-fitness/index.html').querySelectorAll('aside .info-card__actions > *')]
    expect(acoes.map(el => el.getAttribute('aria-label') ?? text(el))).toEqual([
      'Como chegar', ...telefones.map(t => `Ligar ${t}`), `Instagram @${instagram}`, 'Compartilhar',
    ])
  })

  it('galeria: o sizes de cada foto segue o mosaico, inclusive no fim incompleto do ciclo de 6', () => {
    // Colunas no mosaico de 4 (desktop); no de 2 (celular), 2 vira a largura toda.
    const COLS = { '(min-width: 900px) 25vw, 50vw': 1, '(min-width: 900px) 50vw, 100vw': 2 }
    const colunas = n => [...parse(renderDetailPage(lugar('coreto'), {
      categoria: categoria('pontos-turisticos'),
      images: { cover: record, gallery: Array.from({ length: n - 1 }, () => record) },
    })).querySelectorAll('.gallery > .gallery__item img')].map(i => COLS[i.getAttribute('sizes')] ?? i.getAttribute('sizes'))

    expect(colunas(1)).toEqual(['(min-width: 600px) 560px, 100vw'])
    expect(colunas(2)).toEqual([2, 2])
    expect(colunas(3)).toEqual([2, 1, 1])
    expect(colunas(4)).toEqual([2, 1, 1, 2])
    expect(colunas(5)).toEqual([2, 1, 1, 1, 1])
    expect(colunas(6)).toEqual([2, 1, 1, 1, 1, 2])
    // Resto 1: a sexta deixa de ser larga e a sétima entra ao lado dela (sem linha a mais).
    expect(colunas(7)).toEqual([2, 1, 1, 1, 1, 1, 1])
    expect(colunas(8)).toEqual([2, 1, 1, 1, 1, 2, 2, 2])
    expect(colunas(13)).toEqual([2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1])
    expect(colunas(12)).toEqual([2, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2])
  })

  it('depósito: o endereço aparece uma vez na tela (linha do info), e o endereco só vai para o JSON-LD', () => {
    const d = doc('comercios/deposito-pereira/index.html')
    const visivel = text(d.body)
    expect(visivel.split('Rua Raimundo da Glória Caldeira, 80').length - 1).toBe(1)
  })

  it('relacionados: 3, sem o próprio item; anterior e próximo dão a volta', () => {
    const entries = ['a', 'b', 'c', 'd', 'e'].map(slug => ({ item: { slug } }))
    const slugs = list => list.map(e => e.item.slug)
    expect(slugs(neighbors(entries, 'a').related)).toEqual(['b', 'c', 'd'])
    expect(slugs(neighbors(entries, 'd').related)).toEqual(['e', 'a', 'b'])
    expect(neighbors(entries, 'a').prev.item.slug).toBe('e')
    expect(neighbors(entries, 'e').next.item.slug).toBe('a')
    expect(slugs(neighbors(entries.slice(0, 3), 'b').related)).toEqual(['c', 'a'])

    const d = doc('eventos/encontro-dos-cachaceiros/index.html')
    const related = d.querySelector('section.related')
    const cards = [...related.querySelectorAll('.places-grid > a')]
    expect(cards.map(a => a.getAttribute('href'))).toEqual(['/eventos/forrozao/', '/eventos/desfile-civico/', '/eventos/corrida-de-argolinhas/'])
    expect(cards.every(a => a.dataset.cursor === 'Ver' && a.hasAttribute('data-reveal'))).toBe(true)
    expect(related.querySelector('a[rel="prev"]').getAttribute('href')).toBe('/eventos/campeonato-de-bairros/')
    expect(related.querySelector('a[rel="next"]').getAttribute('href')).toBe('/eventos/forrozao/')
    expect(text(related.querySelector('a[rel="next"]'))).toContain('Forrozão')

    const primeiro = doc('eventos/forrozao/index.html').querySelector('section.related')
    expect(primeiro.querySelector('a[rel="prev"]').getAttribute('href')).toBe('/eventos/encontro-dos-cachaceiros/')
    // Card do item sem foto vira card-type também nos relacionados.
    const ultimo = doc('eventos/campeonato-de-bairros/index.html').querySelector('section.related .places-grid')
    expect(ultimo.querySelector('a.card-type').getAttribute('href')).toBe('/eventos/encontro-dos-cachaceiros/')

    // Em todas as 24 páginas: 3 relacionados distintos, nunca a própria página.
    for (const i of inventario) {
      const proprio = `/${i.categoria}/${i.slug}/`
      const hrefs = [...doc(`${i.categoria}/${i.slug}/index.html`).querySelectorAll('section.related .places-grid > a')]
        .map(a => a.getAttribute('href'))
      expect([proprio, hrefs.length, new Set(hrefs).size, hrefs.includes(proprio)]).toEqual([proprio, 3, 3, false])
    }
  })

  it('escapa o texto interpolado', () => {
    const item = { ...lugar('coreto'), titulo: 'Coreto <script>alert(1)</script> & cia', chips: ['<b>x</b>'] }
    const html = renderDetailPage(item, {
      categoria: categoria('pontos-turisticos'),
      images: { cover: record, gallery: [] },
      related: [], prev: { item: lugar('praca-joao-velho') }, next: { item: lugar('ponte-rio-das-velhas') },
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('Coreto &lt;script&gt;alert(1)&lt;/script&gt; &amp; cia')
  })
})

describe('página de categoria', () => {
  it('hub: N cards com href /<categoria>/<slug>/, card-type para semFotos, chip com a contagem e data-header-theme="light"', () => {
    const d = doc('eventos/index.html')
    const itens = inventario.filter(i => i.categoria === 'eventos')
    const cards = [...d.querySelectorAll('.places-grid > a')]
    expect(cards.map(a => a.getAttribute('href'))).toEqual(itens.map(i => `/eventos/${i.slug}/`))
    for (const [i, a] of cards.entries()) {
      const semFoto = semFotos.includes(itens[i].slug)
      expect([itens[i].slug, a.className]).toEqual([itens[i].slug, semFoto ? 'card-type' : 'card-place'])
      expect(a.hasAttribute('data-reveal')).toBe(true)
      expect(a.dataset.cursor).toBe('Ver')
    }
    expect(d.querySelectorAll('.places-grid > a.card-type')).toHaveLength(1)
    expect(text(d.querySelector('.hub-hero .chip'))).toBe('07 eventos')
    expect(d.body.dataset.headerTheme).toBe('light')
    expect(d.body.dataset.page).toBe('eventos')
  })

  it('hub: hero com trilha, etiqueta, palavra gigante, h1, arco eager e intro; SEO da categoria; marquee com os nomes', () => {
    const html = htmlOf('comunidades/index.html')
    const d = parse(html)
    const cat = lugares.categorias.comunidades
    const hero = d.querySelector('section.hub-hero')

    expect([...hero.querySelectorAll('.breadcrumb li')].map(text)).toEqual(['Início', 'Comunidades'])
    expect(hero.querySelector('.breadcrumb [aria-current="page"]')).not.toBeNull()
    expect(text(hero.querySelector('.eyebrow'))).toBe('Santo Hipólito · Comunidades')
    const word = hero.querySelector('p.hub-hero__word[data-fit-text]')
    expect(word.getAttribute('aria-hidden')).toBe('true')
    expect(text(word)).toBe('Comunidades')
    expect(d.querySelectorAll('h1')).toHaveLength(1)
    expect(text(hero.querySelector('h1'))).toBe('Comunidades')
    const arch = hero.querySelector('.arch img')
    expect(arch.getAttribute('src')).toBe(manifest['home/cat-comunidades'].large.url)
    expect(arch.getAttribute('loading')).toBe('eager')
    expect(arch.getAttribute('fetchpriority')).toBe('high')
    expect(text(hero)).toContain(cat.intro)

    expect(text(d.querySelector('title'))).toBe('Comunidades · Santo Hipólito-MG')
    expect(meta(d, 'meta[name="description"]')).toBe(cat.descricao)
    expect(meta(d, 'meta[property="og:title"]')).toBe('Comunidades · Santo Hipólito-MG')
    expect(meta(d, 'meta[property="og:description"]')).toBe(cat.descricao)
    expect(meta(d, 'meta[property="og:image"]')).toBe('/og/home-cat-comunidades.jpg')
    expect(graphTypes(d)).toEqual(['BreadcrumbList'])

    const nomes = inventario.filter(i => i.categoria === 'comunidades').map(i => i.titulo)
    const marquee = d.querySelector('.marquee[data-marquee] .marquee__track')
    expect([...marquee.querySelectorAll('.marquee__item')].map(text)).toEqual(nomes)
    expect(marquee.querySelectorAll('svg.marquee__sep use[href="/icons.svg#star"]')).toHaveLength(nomes.length)
    expect(html).toMatch(/<!-- @include cta-fotos -->\s*<\/main>/)

    const imgs = [...d.querySelectorAll('img')].filter(i => i !== arch)
    expect(imgs.every(i => i.getAttribute('loading') === 'lazy' && i.getAttribute('decoding') === 'async')).toBe(true)
  })

  it('renderHubPage direto: índice de dois dígitos e card-type sem capa', () => {
    const cat = categoria('comercios')
    const entries = [{ item: lugar('ma-fitness'), cover: record }, { item: lugar('varejao-mg'), cover: null }]
    const d = parse(renderHubPage(cat, entries, { hero: manifest['home/cat-comercios'] }))
    expect(text(d.querySelector('.card-place .card-place__index'))).toBe('01')
    expect(text(d.querySelector('.card-type .card-type__title'))).toBe('Varejão MG')
    expect(text(d.querySelector('.card-type .card-type__initial'))).toBe('V')
  })
})

describe('buildSite', () => {
  it('gera as 4 categorias e os 24 lugares, e todo link interno aponta para uma página gerada ou para a Home', () => {
    expect(pages).toHaveLength(28)
    const files = pages.map(p => p.file)
    for (const cat of Object.keys(lugares.categorias)) expect(files).toContain(`${cat}/index.html`)
    for (const i of inventario) expect(files).toContain(`${i.categoria}/${i.slug}/index.html`)

    const urls = new Set(['/', ...files.map(f => `/${f.replace(/index\.html$/, '')}`)])
    const fotos = new Set(Object.values(manifest).map(r => r.large.url))
    for (const p of pages) {
      const d = parse(p.html)
      for (const a of d.querySelectorAll('a[href^="/"]:not([data-gallery-item])')) {
        expect([p.file, a.getAttribute('href'), urls.has(a.getAttribute('href'))]).toEqual([p.file, a.getAttribute('href'), true])
      }
      for (const a of d.querySelectorAll('a[data-gallery-item]')) expect(fotos.has(a.getAttribute('href'))).toBe(true)
    }
  })

  it('as 28 páginas passam no html-validate (.htmlvalidate.json do projeto)', async () => {
    // doctype-style está configurado para minúsculas no próprio .htmlvalidate.json (contrato de páginas).
    const validator = new HtmlValidate(new StaticConfigLoader(readJson(".htmlvalidate.json")))
    const problemas = []
    for (const p of pages) {
      const report = await validator.validateString(p.html, p.file)
      for (const r of report.results) for (const m of r.messages) problemas.push(`${p.file}:${m.line} ${m.ruleId} ${m.message}`)
    }
    expect(problemas).toEqual([])
  })
})

describe('CSS das páginas geradas', () => {
  const css = file => fs.readFileSync(path.join(root, 'src/styles/sections', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  /** Declarações do primeiro bloco cujo seletor é exatamente `sel`. */
  const rule = (src, sel) => src.match(new RegExp(`(?:^|[{};])\\s*${sel.replace(/[.[\]()-]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  const tokens = readTokens(fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8'))
  /** `fg` com opacidade `alpha` sobre `bg`, em hex. */
  const over = (fg, alpha, bg) => '#' + [1, 3, 5]
    .map(i => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)))
    .map(v => v.toString(16).padStart(2, '0')).join('')

  it('hero de lugar: gradiente que sai de --green-950 a 80% na base; título em --fs-display com overflow-wrap: anywhere', () => {
    const detail = css('detail.css')
    expect(detail).toMatch(/linear-gradient\(\s*to top,\s*color-mix\(in srgb, var\(--green-950\) 80%, transparent\) 0%/)
    const titulo = rule(detail, '.page-hero__title')
    expect(titulo).toMatch(/font-size:\s*var\(--fs-display\)/)
    expect(titulo).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('anel de foco ≥ 3:1 nos heróis escuros (CARRY Rulings 11/12): creme sobre a foto com véu, ouro 500 no verde', () => {
    const detail = css('detail.css')
    expect(rule(detail, '.page-hero')).toMatch(/--focus-ring:\s*var\(--cream-100\)/)
    expect(rule(detail, '.page-hero--type')).toMatch(/--focus-ring:\s*var\(--gold-500\)/)
    // Pior caso da foto: branco puro sob o véu de 70% onde ficam a trilha e os chips. O ouro 500 não passaria.
    const fotoBranca = over(tokens['--green-950'], 0.7, '#FFFFFF')
    expect(contrastRatio(tokens['--cream-100'], fotoBranca)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(tokens['--gold-500'], fotoBranca)).toBeLessThan(3)
    expect(contrastRatio(tokens['--gold-500'], tokens['--green-800'])).toBeGreaterThanOrEqual(3)
  })

  it('palavras gigantes (fit-text) medem a largura do conteúdo e não quebram linha', () => {
    for (const [file, sel] of [['hub.css', '.hub-hero__word'], ['detail.css', '.page-hero__word']]) {
      const decl = rule(css(file), sel)
      expect([sel, /width:\s*max-content/.test(decl), /white-space:\s*nowrap/.test(decl)]).toEqual([sel, true, true])
    }
  })
})
