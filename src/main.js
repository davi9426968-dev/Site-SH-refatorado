import { ScrollTrigger } from './js/core/gsap.js'
import { initSmoothScroll } from './js/core/smooth-scroll.js'
import { whenPainted } from './js/core/paint.js'
import { keepFocusOnRefresh } from './js/core/keep-focus.js'

import * as header from './js/ui/header.js'
import * as menu from './js/ui/menu.js'
import * as cursor from './js/ui/cursor.js'
import * as spark from './js/ui/spark.js'
import * as magnet from './js/ui/magnet.js'
import * as backToTop from './js/ui/back-to-top.js'
import * as share from './js/ui/share.js'
import * as fitText from './js/fx/fit-text.js'
import * as reveal from './js/fx/reveal.js'
import * as split from './js/fx/split.js'
import * as counters from './js/fx/counters.js'
import * as parallax from './js/fx/parallax.js'
import * as marquee from './js/fx/marquee.js'
import * as bento from './js/fx/bento.js'
import * as hoverPreview from './js/fx/hover-preview.js'

// Módulos pesados ou de uma página só: carregados só se o seletor existir.
const lazy = {
  '[data-intro]': () => import('./js/ui/intro.js'),
  '[data-hero-themes]': () => import('./js/fx/hero-themes.js'),
  '[data-gallery]': () => import('./js/ui/lightbox.js'),
  '[data-video]': () => import('./js/ui/video.js'),
  '[data-video-expand]': () => import('./js/fx/video-expand.js'),
  '[data-horizontal]': () => import('./js/fx/horizontal.js'),
  '[data-timeline]': () => import('./js/fx/timeline.js'),
  '[data-pillars]': () => import('./js/fx/pillars.js'),
}

const CRITICAL = new Set(['[data-intro]'])

const eager = [header, menu, cursor, spark, magnet, backToTop, share, fitText, reveal, split, counters, parallax, marquee, bento, hoverPreview]

const fail = (what, err) => console.error(`[sh] falha em ${what}:`, err)

async function boot() {
  try { initSmoothScroll() } catch (err) { fail('initSmoothScroll', err) }
  for (const [i, mod] of eager.entries()) {
    try { mod.init() } catch (err) { fail(`módulo eager #${i}`, err) }
  }
  // Ruling 4: o reveal (eager) é quem mostra o conteúdo; não esperar os chunks lazy.
  window.__fxReady = true

  // Registrados antes de esperar os chunks lazy, para não depender deles.
  keepFocusOnRefresh(ScrollTrigger)
  document.fonts?.ready.then(() => {
    ScrollTrigger.refresh()
    // Fontes que chegam depois (o itálico de destaque da Home só baixa quando a intro termina) mudam alturas.
    document.fonts.addEventListener?.('loadingdone', () => ScrollTrigger.refresh(true))
  })
  window.addEventListener('pageshow', event => {
    if (event.persisted) ScrollTrigger.refresh()
  })

  // Ruling 29: a intro é o único chunk lazy crítico (Ruling 28: nunca atrasá-la); os outros esperam o
  // primeiro quadro pintado (ou o tempo-limite, numa aba oculta), fora da janela do LCP.
  const painted = whenPainted()
  const selectors = Object.keys(lazy).filter(selector => document.querySelector(selector))
  const results = await Promise.allSettled(selectors.map(async selector => {
    if (!CRITICAL.has(selector)) await painted
    return (await lazy[selector]()).init()
  }))
  results.forEach((r, i) => { if (r.status === 'rejected') fail(selectors[i], r.reason) })
}

boot()
