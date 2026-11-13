import fs from 'node:fs'
import path from 'node:path'
import { discoverInputs } from './inputs.mjs'
import { pagesFromInputs } from './pages.mjs'

const LD_SCRIPT = /(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi
const LD_URL_KEYS = new Set(['url', 'item', 'image', '@id'])

const cleanSite = siteUrl => String(siteUrl ?? '').trim().replace(/\/+$/, '')
const escapeAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** "/x" vira "https://site/x"; qualquer outra coisa (já absoluta, "//cdn", "#a") fica como está. */
const absolutize = (value, site) => (/^\/(?!\/)/.test(value) ? site + value : value)

function absolutizeJson(node, site) {
  if (Array.isArray(node)) return node.map(n => absolutizeJson(n, site))
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [
      k,
      typeof v === 'string' && LD_URL_KEYS.has(k) ? absolutize(v, site) : absolutizeJson(v, site),
    ]))
  }
  return node
}

function absolutizeLd(html, site) {
  return html.replace(LD_SCRIPT, (whole, open, body, close) => {
    let data
    try { data = JSON.parse(body) } catch { return whole }
    // `<` escapado, para o texto nunca fechar o script antes da hora.
    return open + JSON.stringify(absolutizeJson(data, site)).replace(/</g, '\\u003c') + close
  })
}

/**
 * Com `siteUrl`: acrescenta canonical e og:url, torna absolutos os og:image relativos e as URLs
 * relativas (url, item, image, @id) do JSON-LD. Sem `siteUrl`, devolve o HTML como veio.
 * @param {string} html
 * @param {{ siteUrl?: string, pagePath: string }} opts
 */
export function injectSeo(html, { siteUrl, pagePath }) {
  const site = cleanSite(siteUrl)
  if (!site) return html
  const pageUrl = escapeAttr(site + pagePath)
  let out = html.replace(
    /(<meta\s+property="og:image"\s+content=")([^"]*)(")/gi,
    (_, a, url, c) => a + absolutize(url, site) + c,
  )
  out = absolutizeLd(out, site)
  const tags = `  <link rel="canonical" href="${pageUrl}">\n  <meta property="og:url" content="${pageUrl}">\n`
  return out.replace(/<\/head>/i, `${tags}</head>`)
}

/** sitemap.xml com uma `<loc>` por página. */
export function buildSitemap(paths, siteUrl) {
  const site = cleanSite(siteUrl)
  const urls = paths.map(p => `  <url><loc>${site + p}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/** Caminho público da página ("/", "/eventos/") a partir do arquivo; null para a 404 e para o que não é página. */
export function pagePathOf(filename, root) {
  const rel = path.relative(root, filename).split(path.sep).join('/')
  if (!rel.endsWith('.html') || rel.startsWith('..') || rel === '404.html') return null
  return rel === 'index.html' ? '/' : '/' + rel.replace(/index.html$/, '')
}

/**
 * Plugin do Vite: sem `siteUrl` não faz nada. Com ele, injeta SEO nas páginas e, ao fim do build,
 * grava `dist/sitemap.xml` (sem a 404) e acrescenta a linha `Sitemap:` ao `dist/robots.txt`.
 * @param {{ siteUrl?: string }} [options]
 * @returns {import('vite').Plugin}
 */
export function seoPlugin({ siteUrl } = {}) {
  const site = cleanSite(siteUrl)
  let root = process.cwd()
  let outDir = 'dist'
  return {
    name: 'sh-seo',
    configResolved(config) {
      root = config.root
      outDir = path.resolve(root, config.build.outDir)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!site) return html
        const pagePath = ctx.filename ? pagePathOf(ctx.filename, root) : null
        return pagePath === null ? html : injectSeo(html, { siteUrl: site, pagePath })
      },
    },
    closeBundle() {
      if (!site) return
      const paths = pagesFromInputs(discoverInputs(root)).filter(p => p !== '/404.html')
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemap(paths, site))
      const robotsFile = path.join(outDir, 'robots.txt')
      const robots = fs.existsSync(robotsFile) ? fs.readFileSync(robotsFile, 'utf8') : 'User-agent: *\nAllow: /\n'
      const line = `Sitemap: ${site}/sitemap.xml`
      if (!robots.includes(line)) fs.writeFileSync(robotsFile, `${robots.replace(/\s*$/, '\n')}${line}\n`)
    },
  }
}

