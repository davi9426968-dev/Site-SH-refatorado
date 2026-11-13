/**
 * Templates das páginas geradas (spec §7.2 e §7.3): as 4 categorias e os 24 lugares.
 * Funções puras: recebem os dados e devolvem HTML com os `<!-- @include … -->`, que o
 * partialsPlugin do Vite expande. Todo texto interpolado passa por escapeHtml.
 */

const CITY = 'Santo Hipólito'
const OG_DEFAULT = '/og/home-og-default.jpg'
const EMAIL_FOTOS = 'roberto133ro@gmail.com'

// Larguras exibidas (components.css, hub.css e detail.css): grade de cards, arco do hub e mosaico da galeria.
const CARD_SIZES = '(min-width: 1024px) min(30vw, 440px), (min-width: 600px) 46vw, 92vw'
const ARCH_SIZES = 'min(64vw, 340px)'
// Por colunas ocupadas no mosaico de 4 (desktop); no de 2 (celular), 2 colunas são a largura toda.
const GALLERY_SIZES = { 1: '(min-width: 900px) 25vw, 50vw', 2: '(min-width: 900px) 50vw, 100vw' }
const GALLERY_SINGLE = '(min-width: 600px) 560px, 100vw'

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapa texto para o corpo do HTML e para valores de atributo entre aspas. */
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ENTITIES[c])
}
const e = escapeHtml

export const seoTitle = titulo => `${titulo} · Santo Hipólito-MG`

export const mapsUrl = nome =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome} Santo Hipólito MG`)}`

// Celular "(dd) 9 dddd-dddd" ou fixo "(dd) dddd-dddd", como em contatos-comercios.json.
const PHONE = /^\(\d{2}\) (?:9 )?\d{4}-\d{4}$/

/** '(38) 9 9817-7279' → 'tel:+5538998177279'. */
export function telHref(tel) {
  if (!PHONE.test(tel)) throw new TypeError(`Telefone fora do formato "(dd) 9 dddd-dddd" ou "(dd) dddd-dddd": ${tel}`)
  return `tel:+55${tel.replace(/\D/g, '')}`
}

const icon = (id, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="/icons.svg#${id}"/></svg>`
const pad2 = n => String(n).padStart(2, '0')
const placeUrl = item => `/${item.categoria}/${item.slug}/`

/** "url-800 800w, url-1600 1600w" com as larguras reais; vazio quando as duas saídas têm o mesmo tamanho. */
function srcsetOf({ large, small }) {
  if (!small || small.width >= large.width) return ''
  return `${small.url} ${small.width}w, ${large.url} ${large.width}w`
}

/**
 * `<img>` de um registro do manifest: src = 1600, srcset 800/1600, width/height reais da 1600.
 * @param {{ alt: string, large: { url: string, width: number, height: number }, small?: { url: string, width: number } }} record
 * @param {{ sizes?: string, loading?: 'lazy' | 'eager', fetchpriority?: 'high', className?: string, alt?: string }} [opts]
 */
export function renderPicture(record, { sizes = '100vw', loading = 'lazy', fetchpriority, className, alt } = {}) {
  const { large } = record
  const srcset = srcsetOf(record)
  const attrs = [
    className && `class="${e(className)}"`,
    `src="${e(large.url)}"`,
    srcset && `srcset="${e(srcset)}" sizes="${e(sizes)}"`,
    `width="${e(large.width)}" height="${e(large.height)}"`,
    `alt="${e(alt ?? record.alt)}"`,
    `loading="${e(loading)}"`,
    fetchpriority && `fetchpriority="${e(fetchpriority)}"`,
    'decoding="async"',
  ]
  return `<img ${attrs.filter(Boolean).join(' ')}>`
}

// ───── JSON-LD ─────

const CITY_LD = { '@type': 'City', name: CITY, containedInPlace: { '@type': 'State', name: 'Minas Gerais' } }
const LOCALITY = { '@type': 'PostalAddress', addressLocality: CITY, addressRegion: 'MG', addressCountry: 'BR' }

function breadcrumbLd(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.label, ...(t.href && { item: t.href }) })),
  }
}

/** `<script type="application/ld+json">` com `@graph`; `<` vira < para o texto nunca fechar o script. */
function ldScript(graph) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}

function placeEntity(item, categoria, image) {
  const base = { name: item.titulo, description: item.descricao, ...(image && { image }) }
  switch (categoria.slug) {
    case 'pontos-turisticos':
      return { '@type': 'TouristAttraction', ...base, containedInPlace: CITY_LD }
    case 'comunidades':
      return { '@type': 'Place', ...base, containedInPlace: CITY_LD }
    case 'comercios': {
      const end = item.endereco
      const address = end && {
        ...LOCALITY,
        streetAddress: [end.logradouro, end.bairro].filter(Boolean).join(', '),
        ...(end.cep && { postalCode: end.cep }),
      }
      return { '@type': 'LocalBusiness', ...base, ...(address && { address }), containedInPlace: CITY_LD }
    }
    case 'eventos':
      // Event exige startDate e o conteúdo não tem datas (nenhum fato novo, spec §8.1): só a trilha.
      return null
    default:
      throw new Error(`Categoria sem tipo de JSON-LD: ${categoria.slug}`)
  }
}

const trailOf = (categoria, item) => [
  { label: 'Início', href: '/' },
  { label: categoria.nome, href: item ? `/${categoria.slug}/` : undefined },
  ...(item ? [{ label: item.titulo }] : []),
]

/**
 * JSON-LD de um lugar: a entidade (TouristAttraction, Place ou LocalBusiness; eventos não têm) e o BreadcrumbList.
 * @param {object} item lugar de lugares.json
 * @param {{ slug: string, nome: string }} categoria
 * @param {{ image?: string }} [opts] imagem de compartilhamento (og) da capa
 */
export function renderJsonLd(item, categoria, { image } = {}) {
  return ldScript([placeEntity(item, categoria, image), breadcrumbLd(trailOf(categoria, item))].filter(Boolean))
}

// ───── Blocos ─────

function breadcrumb(trail) {
  const items = trail.map((t, i) => (i === trail.length - 1
    ? `<li><span aria-current="page">${e(t.label)}</span></li>`
    : `<li><a href="${e(t.href)}">${e(t.label)}</a></li>`))
  return `<nav class="breadcrumb" aria-label="Você está em"><ol>${items.join('')}</ol></nav>`
}

/** Card da grade: card-place com a capa ou card-type quando o lugar não tem fotos. */
function renderCard({ item, cover, index }, heading) {
  const open = `<a class="${cover ? 'card-place' : 'card-type'}" href="${e(placeUrl(item))}" data-reveal data-cursor="Ver">`
  if (!cover) {
    return `${open}
          <span class="card-type__initial" aria-hidden="true">${e([...item.titulo][0].toUpperCase())}</span>
          <span class="card-type__label">${e(item.tipo)}</span>
          <${heading} class="card-type__title">${e(item.titulo)}</${heading}>
          <span class="card-type__note">${icon('camera')}Ainda não temos fotos. Envie a sua.</span>
        </a>`
  }
  return `${open}
          <div class="card-place__media">${renderPicture(cover, { sizes: CARD_SIZES })}</div>
          <span class="card-place__index" aria-hidden="true">${pad2(index)}</span>
          <span class="card-place__label">${e(item.tipo)}</span>
          <${heading} class="card-place__title">${e(item.titulo)}</${heading}>
          <p class="card-place__text">${e(item.resumo)}</p>
        </a>`
}

function page({ title, description, ogImage, jsonLd, dataPage, headerTheme, main }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <!-- @include head -->
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:image" content="${e(ogImage)}">
  ${jsonLd}
</head>
<body data-page="${e(dataPage)}" data-header-theme="${e(headerTheme)}">
  <!-- @include header -->
  <main id="conteudo" tabindex="-1">
${main}
    <!-- @include cta-fotos -->
  </main>
  <!-- @include footer -->
</body>
</html>
`
}

// ───── Página de lugar (spec §7.3) ─────

/** Categoria e tipo sem repetir palavra: "Evento · Música", mas "Comunidade rural". */
function categoriaValor(categoria, item) {
  const tipo = item.tipo ?? ''
  return tipo.toLowerCase().startsWith(categoria.singular.toLowerCase()) ? tipo : [categoria.singular, tipo].filter(Boolean).join(' · ')
}

function heroDetail(item, categoria, cover) {
  const chips = item.chips.map(c => `<li class="chip">${e(c)}</li>`).join('')
  const content = `<div class="page-hero__content container">
        ${breadcrumb(trailOf(categoria, item))}
        <p class="eyebrow">${e(categoria.nome)}</p>
        <h1 class="page-hero__title" data-split>${e(item.titulo)}</h1>
        ${chips ? `<ul class="page-hero__chips">${chips}</ul>` : ''}
      </div>`
  if (!cover) {
    return `    <section class="page-hero page-hero--type">
      <div class="page-hero__backdrop">
        <p class="page-hero__word" data-fit-text aria-hidden="true">${e(item.titulo)}</p>
      </div>
      ${content}
    </section>`
  }
  return `    <section class="page-hero">
      <div class="page-hero__media" data-parallax="0.12">
        ${renderPicture(cover, { loading: 'eager', fetchpriority: 'high', sizes: '100vw' })}
      </div>
      ${content}
    </section>`
}

function infoCard(item, categoria, contatos = {}) {
  const rows = [
    { icone: 'star', rotulo: 'Categoria', valor: categoriaValor(categoria, item) },
    ...item.info,
    ...(contatos.numero ? [{ icone: 'map-pin', rotulo: 'Número do imóvel', valor: contatos.numero }] : []),
  ].map(r => `<div class="info-card__row"><dt>${icon(e(r.icone))}${e(r.rotulo)}</dt><dd>${e(r.valor)}</dd></div>`)

  // Ordem da brief: "Como chegar", "Ligar" (um por telefone), "Instagram" e "Compartilhar".
  // O .btn tem white-space: nowrap, então o número nunca quebra de linha (por isso o html-validate
  // ignora .btn em tel-non-breaking; a Poppins não tem o hífen inseparável U+2011).
  const actions = [
    `<a class="btn btn--gold" href="${e(mapsUrl(item.titulo))}" target="_blank" rel="noopener noreferrer">${icon('map-pin', 'btn__icon')}<span class="btn__label">Como chegar</span></a>`,
    ...(contatos.telefones ?? []).map(t =>
      `<a class="btn btn--primary" href="${e(telHref(t))}">${icon('phone', 'btn__icon')}<span class="btn__label">Ligar ${e(t)}</span></a>`),
    ...(contatos.instagram
      ? [`<a class="btn btn--ghost" href="https://www.instagram.com/${e(contatos.instagram)}/" target="_blank" rel="noopener noreferrer">${icon('instagram', 'btn__icon')}<span class="btn__label"><span class="visually-hidden">Instagram </span>@${e(contatos.instagram)}</span>${icon('arrow-up-right', 'btn__icon')}</a>`]
      : []),
    `<button class="btn btn--icon" type="button" data-share aria-label="Compartilhar">${icon('share', 'btn__icon')}</button>`,
  ]

  return `<aside class="detail-layout__aside" aria-labelledby="info-titulo">
        <div class="info-card">
          <h2 class="eyebrow detail-layout__label" id="info-titulo">Informações</h2>
          <dl class="info-card__list">
            ${rows.join('\n            ')}
          </dl>
          <div class="info-card__actions">
            ${actions.join('\n            ')}
          </div>
          <p class="detail-layout__status" data-share-status aria-live="polite"></p>
        </div>
      </aside>`
}

/**
 * Colunas que a foto `i` (de `n`) ocupa no mosaico de 4 colunas, para o `sizes`.
 * O ciclo de 6 (components.css) é grande 2×2, 2 simples, 2 altas e 1 larga; detail.css
 * reorganiza o ciclo incompleto do fim (resto r) para não deixar buracos.
 */
function galleryCols(i, n) {
  const r = n % 6
  const k = i - (n - r) // posição dentro do ciclo incompleto (negativa nos ciclos completos)
  if (r === 1 && (k === 0 || k === -1)) return 1 // sobra uma: ela e a larga de antes dividem a linha
  if (k === 1 && r === 2) return 2 // par: duas grandes lado a lado
  if (k === 3 && r === 4) return 2 // quarta: larga, embaixo das duas simples
  return i % 6 === 0 || i % 6 === 5 ? 2 : 1
}

function gallerySection(item, photos) {
  if (!photos.length) {
    const subject = encodeURIComponent(`Fotos de ${item.titulo} para o site de Santo Hipólito`)
    return `    <section class="gallery-section gallery-section--empty section section--dark" aria-labelledby="galeria-titulo">
      <div class="gallery-section__empty container">
        ${icon('camera', 'gallery-section__icon')}
        <h2 class="gallery-section__title" id="galeria-titulo">Ainda não temos fotos — <em class="accent">envie a sua</em></h2>
        <p class="gallery-section__text">Tem fotos daqui? Mande para a gente e elas podem aparecer nesta página.</p>
        <a class="btn btn--gold" href="mailto:${EMAIL_FOTOS}?subject=${e(subject)}">${icon('mail', 'btn__icon')}<span class="btn__label">Enviar fotos por e-mail</span></a>
      </div>
    </section>`
  }
  const n = photos.length
  const items = photos.map((r, i) => {
    const srcset = srcsetOf(r)
    const sizes = n === 1 ? GALLERY_SINGLE : GALLERY_SIZES[galleryCols(i, n)]
    return `<a class="gallery__item" href="${e(r.large.url)}" data-gallery-item${srcset ? ` data-srcset="${e(srcset)}"` : ''} data-reveal="clip" data-cursor="Ver">${renderPicture(r, { sizes })}</a>`
  })
  return `    <section class="gallery-section section section--dark" aria-labelledby="galeria-titulo">
      <div class="container">
        <div class="gallery-section__header">
          <h2 class="section-title" id="galeria-titulo">Galeria</h2>
          <p class="gallery-section__count">${n} ${n === 1 ? 'foto' : 'fotos'}</p>
        </div>
        <div class="gallery" data-gallery data-count="${n}">
          ${items.join('\n          ')}
        </div>
      </div>
    </section>`
}

function relatedSection(categoria, related, prev, next) {
  const navLink = (entry, dir) => {
    const label = dir === 'prev' ? 'Anterior' : 'Próximo'
    const arrow = icon(dir === 'prev' ? 'arrow-left' : 'arrow-right', 'related__arrow')
    return `<a class="related__link related__link--${dir}" href="${e(placeUrl(entry.item))}" rel="${dir}">${dir === 'prev' ? arrow : ''}<span class="related__dir">${label}</span><span class="related__name">${e(entry.item.titulo)}</span>${dir === 'next' ? arrow : ''}</a>`
  }
  return `    <section class="related section" aria-labelledby="relacionados-titulo">
      <div class="container">
        <div class="section-header">
          <p class="eyebrow">Continue explorando</p>
          <h2 class="section-title" id="relacionados-titulo">Mais em <em class="accent">${e(categoria.nome.toLowerCase())}</em></h2>
        </div>
        <div class="places-grid">
        ${related.map(r => renderCard(r, 'h3')).join('\n        ')}
        </div>
        ${prev && next ? `<nav class="related__nav" aria-label="Anterior e próximo">
          ${navLink(prev, 'prev')}
          ${navLink(next, 'next')}
        </nav>` : ''}
      </div>
    </section>`
}

/**
 * Página de um lugar.
 * @param {object} item lugar de lugares.json
 * @param {{
 *   categoria: { slug: string, nome: string, singular: string },
 *   images?: { cover?: object | null, gallery?: object[] },
 *   related?: Array<{ item: object, cover?: object | null, index?: number }>,
 *   prev?: { item: object }, next?: { item: object },
 *   contatos?: { telefones?: string[], instagram?: string, numero?: string },
 * }} opts
 */
export function renderDetailPage(item, { categoria, images = {}, related = [], prev, next, contatos } = {}) {
  const { cover = null, gallery = [] } = images
  const photos = cover ? [cover, ...gallery] : []
  const main = [
    heroDetail(item, categoria, cover),
    `    <section class="detail-layout grid-12 container section" aria-labelledby="sobre-titulo">
      <div class="detail-layout__text">
        <h2 class="eyebrow detail-layout__label" id="sobre-titulo">Sobre</h2>
        <p class="lead" data-split-lines>${e(item.lead)}</p>
        ${item.paragrafos.map(p => `<p data-reveal>${e(p)}</p>`).join('\n        ')}
      </div>
      ${infoCard(item, categoria, contatos)}
    </section>`,
    gallerySection(item, photos),
    relatedSection(categoria, related, prev, next),
  ].join('\n')

  return page({
    title: seoTitle(item.titulo),
    description: item.descricao,
    ogImage: cover?.og ?? OG_DEFAULT,
    jsonLd: renderJsonLd(item, categoria, { image: cover?.og }),
    dataPage: categoria.slug,
    headerTheme: 'over-dark',
    main,
  })
}

// ───── Página de categoria (spec §7.2) ─────

/**
 * Página de uma categoria.
 * @param {{ slug: string, nome: string, intro: string, descricao: string, contagem: string }} categoria
 * @param {Array<{ item: object, cover?: object | null, index?: number }>} entries na ordem do inventário
 * @param {{ hero: object }} opts registro `home/cat-<categoria>` do manifest
 */
export function renderHubPage(categoria, entries, { hero }) {
  const cards = entries.map((entry, i) => renderCard({ ...entry, index: entry.index ?? i + 1 }, 'h2'))
  const marquee = entries.map(({ item }) =>
    `<span class="marquee__item">${e(item.titulo)}</span>${icon('star', 'marquee__sep')}`)

  const main = `    <section class="hub-hero" aria-labelledby="hub-titulo">
      <div class="orbs" aria-hidden="true"><span class="orb"></span><span class="orb"></span><span class="orb"></span></div>
      <div class="hub-hero__inner container">
        ${breadcrumb(trailOf(categoria))}
        <p class="eyebrow hub-hero__eyebrow">Santo Hipólito · ${e(categoria.nome)}</p>
        <div class="hub-hero__stage">
          <p class="hub-hero__word" data-fit-text aria-hidden="true">${e(categoria.nome)}</p>
          <div class="hub-hero__arch arch">${renderPicture(hero, { loading: 'eager', fetchpriority: 'high', sizes: ARCH_SIZES })}</div>
        </div>
        <div class="hub-hero__foot">
          <h1 class="hub-hero__title" id="hub-titulo" data-split>${e(categoria.nome)}</h1>
          <p class="hub-hero__intro">${e(categoria.intro)}</p>
          <p class="chip hub-hero__count">${e(categoria.contagem)}</p>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="places-grid">
        ${cards.join('\n        ')}
        </div>
      </div>
    </section>
    <div class="marquee" data-marquee aria-hidden="true">
      <div class="marquee__track">${marquee.join('')}</div>
    </div>`

  return page({
    title: seoTitle(categoria.nome),
    description: categoria.descricao,
    ogImage: hero.og ?? OG_DEFAULT,
    jsonLd: ldScript([breadcrumbLd(trailOf(categoria))]),
    dataPage: categoria.slug,
    headerTheme: 'light',
    main,
  })
}

// ───── Dados → páginas ─────

/** Os 3 itens seguintes da categoria (voltando ao começo, sem o próprio) e o anterior/próximo com volta. */
export function neighbors(entries, slug) {
  const i = entries.findIndex(en => en.item.slug === slug)
  if (i < 0) throw new Error(`"${slug}" não está na lista`)
  const n = entries.length
  const related = Array.from({ length: Math.min(3, n - 1) }, (_, k) => entries[(i + k + 1) % n])
  return { related, prev: entries[(i - 1 + n) % n], next: entries[(i + 1) % n] }
}

function imagesFor(manifest, item, semFotos) {
  if (semFotos.includes(item.slug)) return { cover: null, gallery: [] }
  const prefix = `${item.categoria}/${item.slug}/`
  const cover = manifest[`${prefix}01`]
  if (!cover) throw new Error(`"${item.slug}" não tem capa (${prefix}01) no manifest nem está em semFotos`)
  const gallery = Object.keys(manifest).filter(k => k.startsWith(prefix) && k !== `${prefix}01`).sort().map(k => manifest[k])
  return { cover, gallery }
}

/**
 * Monta as 28 páginas a partir dos dados.
 * @returns {Array<{ file: string, html: string }>} `file` relativo à raiz ("eventos/forrozao/index.html")
 */
export function buildSite({ inventario, lugares, contatos = {}, manifest, semFotos = [] }) {
  const bySlug = new Map(lugares.lugares.map(l => [l.slug, l]))
  const pages = []
  for (const [slug, cat] of Object.entries(lugares.categorias)) {
    const categoria = { slug, ...cat }
    const hero = manifest[`home/cat-${slug}`]
    if (!hero) throw new Error(`Falta home/cat-${slug} no manifest`)
    const entries = inventario.filter(i => i.categoria === slug).map((inv, i) => {
      const item = bySlug.get(inv.slug)
      if (!item) throw new Error(`"${inv.slug}" não está em lugares.json`)
      return { item, ...imagesFor(manifest, item, semFotos), index: i + 1 }
    })
    pages.push({ file: `${slug}/index.html`, html: renderHubPage(categoria, entries, { hero }) })
    for (const entry of entries) {
      const { related, prev, next } = neighbors(entries, entry.item.slug)
      pages.push({
        file: `${slug}/${entry.item.slug}/index.html`,
        html: renderDetailPage(entry.item, {
          categoria,
          images: { cover: entry.cover, gallery: entry.gallery },
          related,
          prev,
          next,
          contatos: contatos[entry.item.slug],
        }),
      })
    }
  }
  return pages
}
