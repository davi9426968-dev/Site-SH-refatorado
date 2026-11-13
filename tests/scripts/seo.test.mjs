import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { injectSeo, buildSitemap, pagePathOf } from '../../scripts/lib/seo.mjs'

const root = path.resolve(import.meta.dirname, '..', '..')
const SITE = 'https://x.com'

const page = (extra = '') => `<!doctype html><html lang="pt-BR"><head>
<title>Eventos</title>
<meta property="og:title" content="Eventos">
<meta property="og:image" content="/og/a.jpg">
${extra}</head><body></body></html>`

const ld = html => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])

describe('injectSeo', () => {
  it('injeta canonical e og:url absolutos', () => {
    const out = injectSeo(page(), { siteUrl: SITE, pagePath: '/eventos/' })
    expect(out).toContain('<link rel="canonical" href="https://x.com/eventos/">')
    expect(out).toContain('<meta property="og:url" content="https://x.com/eventos/">')
  })

  it('torna og:image absoluto', () => {
    const out = injectSeo(page(), { siteUrl: SITE, pagePath: '/eventos/' })
    expect(out).toContain('content="https://x.com/og/a.jpg"')
    expect(out).not.toContain('content="/og/a.jpg"')
  })

  it('aceita siteUrl com barra final sem duplicá-la', () => {
    const out = injectSeo(page(), { siteUrl: 'https://x.com/', pagePath: '/' })
    expect(out).toContain('href="https://x.com/"')
  })

  it('mantém og:image que já é absoluto', () => {
    const html = page().replace('/og/a.jpg', 'https://cdn.exemplo.com/a.jpg')
    expect(injectSeo(html, { siteUrl: SITE, pagePath: '/' })).toContain('content="https://cdn.exemplo.com/a.jpg"')
  })

  it('sem siteUrl não muda nada', () => {
    const html = page()
    expect(injectSeo(html, { siteUrl: '', pagePath: '/eventos/' })).toBe(html)
    expect(injectSeo(html, { pagePath: '/eventos/' })).toBe(html)
  })

  it('torna absolutos url, item, image e @id relativos do JSON-LD', () => {
    const data = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: '/' }, { '@type': 'ListItem', position: 2, name: 'Eventos', item: '/eventos/' }] },
        { '@type': 'Place', '@id': '/eventos/forrozao/#lugar', url: '/eventos/forrozao/', image: '/img/eventos/forrozao/01-1600.webp', name: '/nao-mexer', sameAs: 'https://www.instagram.com/x/' },
      ],
    }
    const html = page(`<script type="application/ld+json">${JSON.stringify(data)}</script>\n`)
    const out = ld(injectSeo(html, { siteUrl: SITE, pagePath: '/eventos/' }))
    expect(out['@graph'][0].itemListElement.map(i => i.item)).toEqual(['https://x.com/', 'https://x.com/eventos/'])
    const place = out['@graph'][1]
    expect(place['@id']).toBe('https://x.com/eventos/forrozao/#lugar')
    expect(place.url).toBe('https://x.com/eventos/forrozao/')
    expect(place.image).toBe('https://x.com/img/eventos/forrozao/01-1600.webp')
    expect(place.name).toBe('/nao-mexer')
    expect(place.sameAs).toBe('https://www.instagram.com/x/')
  })

  it('mantém o escape de "<" no JSON-LD', () => {
    const html = page(`<script type="application/ld+json">{"name":"a \\u003c/script> b","url":"/x/"}</script>`)
    const out = injectSeo(html, { siteUrl: SITE, pagePath: '/' })
    const raw = out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
    expect(raw).not.toContain('<')
    expect(JSON.parse(raw)).toEqual({ name: 'a </script> b', url: 'https://x.com/x/' })
  })

  it('deixa um JSON-LD inválido como está', () => {
    const html = page('<script type="application/ld+json">{quebrado</script>')
    expect(() => injectSeo(html, { siteUrl: SITE, pagePath: '/' })).not.toThrow()
  })
})

describe('pagePathOf', () => {
  const r = path.resolve('/site')
  it.each([['index.html', '/'], ['eventos/index.html', '/eventos/'], ['eventos/forrozao/index.html', '/eventos/forrozao/']])('%s vira %s', (f, o) =>
    expect(pagePathOf(path.join(r, ...f.split('/')), r)).toBe(o))
  it('a 404 não recebe canonical', () => expect(pagePathOf(path.join(r, '404.html'), r)).toBeNull())
})

describe('buildSitemap', () => {
  it('lista as URLs com barra final', () => {
    const xml = buildSitemap(['/', '/eventos/'], 'https://x.com')
    expect(xml).toContain('<loc>https://x.com/</loc>')
    expect(xml).toContain('<loc>https://x.com/eventos/</loc>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
  })
})

describe('site.webmanifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public', 'site.webmanifest'), 'utf8'))
  it('é JSON válido com nome e idioma', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.lang).toBe('pt-BR')
  })
  it('tem ícones que existem em public/', () => {
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) expect(fs.existsSync(path.join(root, 'public', icon.src.replace(/^\//, '')))).toBe(true)
  })
})
