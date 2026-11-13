import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { chromium } from 'playwright-core'
import { createServer, preview } from 'vite'
import { discoverInputs } from './lib/inputs.mjs'
import { normalizePage, pagesFromInputs } from './lib/pages.mjs'

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}
const SCROLL_STOPS = [0, 25, 50, 75, 100]

const { values: opts } = parseArgs({
  options: {
    pages: { type: 'string', default: '/' },
    all: { type: 'boolean', default: false },
    dev: { type: 'boolean', default: false },
    reduced: { type: 'boolean', default: false },
    'check-overflow': { type: 'boolean', default: false },
    viewports: { type: 'string', default: Object.keys(VIEWPORTS).join(',') },
    out: { type: 'string', default: '.shots' },
  },
})

const slugOf = pagePath => pagePath === '/' ? 'home' : pagePath.replace(/^\/|\/$/g, '').replace(/\//g, '-')

function pageList() {
  if (!opts.all) return opts.pages.split(",").filter(s => s.trim()).map(normalizePage)
  return pagesFromInputs(discoverInputs(path.resolve("dist")))
}

const wait = ms => new Promise(r => setTimeout(r, ms))

async function startServer() {
  if (opts.dev) {
    const server = await createServer({ server: { port: 0, strictPort: false } })
    await server.listen()
    return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => server.close() }
  }
  if (!fs.existsSync(path.resolve('dist'))) throw new Error('dist/ não existe: rode "npm run build" ou use --dev')
  const server = await preview({ preview: { port: 0, strictPort: false } })
  return { url: server.resolvedUrls.local[0].replace(/\/$/, ''), close: () => new Promise(r => server.httpServer.close(r)) }
}

const pages = pageList()
const viewports = opts.viewports.split(',').map(v => v.trim()).filter(Boolean)
for (const v of viewports) if (!VIEWPORTS[v]) throw new Error(`Viewport desconhecido: ${v}`)
fs.mkdirSync(opts.out, { recursive: true })

const server = await startServer()
const browser = await chromium.launch({ channel: 'chrome' })
const overflowing = []
try {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: VIEWPORTS[vp],
      reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
    })
    for (const pagePath of pages) {
      const page = await context.newPage()
      await page.goto(server.url + pagePath, { waitUntil: 'networkidle' })
      const name = `${slugOf(pagePath)}-${vp}`
      if (opts.reduced) {
        await page.screenshot({ path: path.join(opts.out, `${name}-reduced.png`), fullPage: true })
      } else {
        for (const pct of SCROLL_STOPS) {
          await page.evaluate(p => window.scrollTo(0, (document.documentElement.scrollHeight * p) / 100), pct)
          await wait(900)
          await page.screenshot({ path: path.join(opts.out, `${name}-s${pct}.png`) })
        }
      }
      if (opts['check-overflow']) {
        const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
        if (over) overflowing.push(`${pagePath} (${vp})`)
      }
      await page.close()
    }
    await context.close()
  }
} finally {
  await browser.close()
  await server.close()
}

if (opts['check-overflow']) {
  if (overflowing.length) {
    console.log('Rolagem horizontal em:')
    for (const o of overflowing) console.log(`  ${o}`)
    process.exit(1)
  }
  console.log('Sem rolagem horizontal.')
}
console.log(`Capturas em ${opts.out}/`)
