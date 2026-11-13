import { $, $$ } from '../core/dom.js'
import { gsap } from '../core/gsap.js'
import { finePointer, onMotionChange, reducedMotion } from '../core/motion.js'
import { fitFontSize } from './fit-text.js'

export const AUTOPLAY_MS = 6000
/** Quanto a foto de fundo desce (em % da própria altura) enquanto o hero sai da tela: 50 = metade da rolagem. */
export const BACKDROP_DRIFT = 50
const FIT_WIDTH = 0.92
const HIDDEN_CLIP = 'inset(100% 0% 0% 0%)'
const FULL_CLIP = 'inset(0% 0% 0% 0%)'

/** Os temas declarados nos botões do hero (spec §7.1), na ordem do HTML. */
export function readThemes(root) {
  return $$('[data-theme]', root).map(b => ({
    word: b.dataset.themeWord,
    color: b.dataset.themeColor,
    image: b.dataset.themeImage,
    imageSmall: b.dataset.themeImageSmall,
    alt: b.dataset.themeAlt,
    orbits: (b.dataset.themeOrbits || '').split(',').map(s => s.trim()).filter(Boolean),
  }))
}

/** Índice seguinte (ou anterior, com dir = -1), dando a volta. */
export const nextIndex = (i, n, dir = 1) => (((i + dir) % n) + n) % n

function makeLine(word) {
  const line = document.createElement('span')
  line.className = 'hero-themes__line'
  for (const ch of word) {
    const c = document.createElement('span')
    c.className = ch === ' ' ? 'hero-themes__char hero-themes__char--space' : 'hero-themes__char'
    c.textContent = ch
    line.append(c)
  }
  return line
}

/** fitFontSize por tema: o CSS dá o teto; a palavra só encolhe até ocupar 92% da largura. */
function fitLine(line, width) {
  line.style.fontSize = ''
  line.classList.remove('hero-themes__line--flank')
  const base = parseFloat(getComputedStyle(line).fontSize)
  const measured = line.scrollWidth
  if (!base || !measured || width <= 0) return
  line.style.fontSize = `${fitFontSize(measured, base, width * FIT_WIDTH, { min: 16, max: base })}px`
  flankLine(line)
}

const FLANK_MIN_FONT = 48

/**
 * Decisão do "Fé" (Task 13b): no desktop a palavra fica atrás do arco, e uma palavra curta some quase toda
 * (do "Fé" só apareciam a haste do F e a ponta do é). Quando não sobra nem uma letra inteira de cada lado do
 * arco, as letras se abrem para as faixas livres de fora das órbitas, no tamanho que cabe na menor delas.
 * @returns {number | null} font-size em px, ou null se a palavra já se lê (ou se a faixa é estreita demais)
 */
export function flankFontSize({ word, obstacles, charRatio, font, archWidth, lineWidth }) {
  if (!archWidth || !charRatio || lineWidth >= archWidth + 2 * charRatio * font) return null
  const band = Math.min(obstacles.left - word.left, word.right - obstacles.right)
  const size = Math.min(font, (band * 0.9) / charRatio)
  return size >= FLANK_MIN_FONT ? size : null
}

function flankLine(line) {
  const wordEl = line.parentElement
  const root = wordEl?.closest('[data-hero-themes]')
  const arch = root && $('.hero-themes__arch', root)
  // Abaixo de 900 px a palavra fica acima do arco (home.css) e sempre se lê.
  if (!arch || !window.matchMedia?.('(min-width: 900px)').matches) return
  const font = parseFloat(line.style.fontSize)
  const charRatio = Math.max(0, ...$$('.hero-themes__char', line).map(c => c.offsetWidth)) / font
  const a = arch.getBoundingClientRect()
  const boxes = [a, ...$$('.hero-themes__orbit', root).map(o => o.getBoundingClientRect()).filter(r => r.width > 0)]
  const size = flankFontSize({
    word: wordEl.getBoundingClientRect(),
    obstacles: { left: Math.min(...boxes.map(b => b.left)), right: Math.max(...boxes.map(b => b.right)) },
    charRatio,
    font,
    archWidth: a.width,
    lineWidth: line.scrollWidth,
  })
  if (!size) return
  line.style.fontSize = `${size}px`
  line.classList.add('hero-themes__line--flank')
}

const fitWord = wordEl => $$('.hero-themes__line', wordEl).forEach(line => fitLine(line, wordEl.clientWidth))

/** As duas camadas da foto do arco: a da frente (com alt) e a de trás, criada aqui, para a troca por clip-path. */
function photos(root) {
  const arch = $('.hero-themes__arch', root)
  const list = $$('.hero-themes__photo', root)
  if (arch && list.length === 1) {
    const back = document.createElement('img')
    back.className = 'hero-themes__photo'
    back.alt = ''
    back.setAttribute('aria-hidden', 'true')
    back.decoding = 'async'
    back.style.clipPath = HIDDEN_CLIP
    arch.append(back)
    list.push(back)
  }
  const front = list.find(img => !img.hasAttribute('aria-hidden')) ?? list[0]
  return { front, back: list.find(img => img !== front) }
}

/**
 * As fotos de tema já vêm recortadas em 3:4, a proporção do arco (aspect no images.config.json): a largura
 * exibida é a do arco. A versão de 800 basta quando ela cabe em 800 px reais; senão, a maior (a largura
 * nativa do recorte, às vezes menor que 800).
 */
function photoUrl(theme, img) {
  const need = (img?.clientWidth || 0) * (window.devicePixelRatio || 1)
  return need > 0 && need <= 800 ? theme.imageSmall : theme.image
}

function setPhoto(img, url, alt) {
  if (!img) return
  img.removeAttribute('srcset')
  img.removeAttribute('sizes')
  img.setAttribute('src', url)
  img.setAttribute('alt', alt)
}

const running = new WeakMap()

/** Foco que veio do teclado (:focus-visible). Sem suporte ao seletor, conta como teclado (pausa, o seguro). */
function keyboardFocus(el) {
  try { return el.matches(':focus-visible') } catch { return true }
}

/**
 * Aplica um tema ao hero: aria-pressed, cor (--hero-color), palavra, foto do arco e órbitas.
 * Animado: onda de cor, letras saindo e entrando, arco por clip-path e órbitas girando.
 */
export function applyTheme(root, theme, { instant = false } = {}) {
  running.get(root)?.progress(1)
  running.delete(root)

  for (const tab of $$('[data-theme]', root)) tab.setAttribute('aria-pressed', String(tab.dataset.themeWord === theme.word))
  const wordEl = $('.hero-themes__word', root)
  const wave = $('.hero-themes__wave', root)
  const orbits = $$('.hero-themes__orbit', root)
  const { front, back } = photos(root)
  const url = photoUrl(theme, front)
  const paint = () => root.style.setProperty('--hero-color', theme.color)

  if (instant) {
    paint()
    if (wordEl) {
      wordEl.replaceChildren(makeLine(theme.word))
      fitWord(wordEl)
    }
    setPhoto(front, url, theme.alt)
    orbits.forEach((orbit, i) => {
      const img = $('img', orbit)
      if (img && theme.orbits[i]) img.setAttribute('src', theme.orbits[i])
    })
    return
  }

  const tl = gsap.timeline({ onComplete: () => running.delete(root) })
  running.set(root, tl)

  // Onda de cor: a nova cor entra da esquerda e, coberto o hero, vira o fundo.
  if (wave) {
    wave.style.setProperty('--wave-color', theme.color)
    gsap.set(wave, { scaleX: 0, transformOrigin: '0% 50%' })
    tl.to(wave, { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, 0)
      .add(() => { paint(); gsap.set(wave, { scaleX: 0 }) }, 0.7)
  } else {
    tl.add(paint, 0)
  }

  // Letras: as antigas saem para cima e as novas (já no tamanho do tema) entram de baixo.
  if (wordEl) {
    const oldLines = $$('.hero-themes__line', wordEl)
    const line = makeLine(theme.word)
    wordEl.append(line)
    fitLine(line, wordEl.clientWidth)
    const chars = $$('.hero-themes__char', line)
    gsap.set(chars, { y: 46, opacity: 0 })
    tl.to(oldLines.flatMap(l => $$('.hero-themes__char', l)), { y: -46, opacity: 0, duration: 0.35, stagger: 0.02, ease: 'power2.in' }, 0)
      .to(chars, { y: 0, opacity: 1, duration: 0.6, stagger: 0.03, ease: 'back.out(1.6)' }, 0.25)
      .add(() => oldLines.forEach(l => l.remove()))
  }

  // Arco: a camada de trás recebe a foto nova, sobe por clip-path e passa a ser a da frente.
  if (front && back) {
    setPhoto(back, url, '')
    gsap.set(back, { clipPath: HIDDEN_CLIP, zIndex: 2 })
    gsap.set(front, { zIndex: 1 })
    tl.to(back, { clipPath: FULL_CLIP, duration: 0.9, ease: 'expo.out' }, 0)
      .add(() => {
        back.setAttribute('alt', theme.alt)
        back.removeAttribute('aria-hidden')
        front.setAttribute('alt', '')
        front.setAttribute('aria-hidden', 'true')
        gsap.set(front, { clipPath: HIDDEN_CLIP })
      }, 0.9)
  }

  // Órbitas: trocam a foto e giram para um ângulo novo.
  orbits.forEach((orbit, i) => {
    const img = $('img', orbit)
    const src = theme.orbits[i]
    if (!img || !src) return
    const at = 0.05 * i
    tl.to(orbit, { rotation: gsap.utils.random(-14, 14), duration: 0.9, ease: 'expo.out' }, at)
      .to(img, { opacity: 0, scale: 0.8, duration: 0.3, ease: 'power2.in' }, at)
      .add(() => img.setAttribute('src', src), at + 0.3)
      .to(img, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, at + 0.32)
  })
}

/**
 * Entrada do hero: a foto de fundo aparece afastando o zoom, as letras sobem, o arco cresce de .9, as órbitas
 * chegam pelas laterais; header e barra por último.
 */
function buildEntrance({ backdrop, wordEl, arch, orbits, last }) {
  const tl = gsap.timeline({ paused: true })
  if (backdrop) {
    tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
    const img = $('img', backdrop)
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0)
  }
  const chars = wordEl ? $$('.hero-themes__char', wordEl) : []
  if (chars.length) {
    tl.fromTo(chars, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.03, ease: 'back.out(1.6)' }, 0)
  }
  if (arch) {
    // Sem opacidade: a foto do arco é o LCP e já está pintada desde o primeiro quadro, nesta mesma pose (home.css).
    tl.fromTo(arch, { scale: 0.9, y: 80 }, { scale: 1, y: 0, duration: 1.1, ease: 'expo.out' }, 0.1)
  }
  if (orbits.length) {
    // Órbitas ímpares (1 e 3) ficam à esquerda do arco; as pares, à direita.
    tl.fromTo(orbits, { x: i => (i % 2 ? 160 : -160), opacity: 0 }, { x: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, 0.25)
  }
  if (last.length) {
    tl.fromTo(last, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.1, clearProps: 'opacity' }, 0.8)
  }
  return tl
}

export function bindHeroThemes(root) {
  const themes = readThemes(root)
  const tabs = $$('[data-theme]', root)
  const backdrop = $('.hero-themes__backdrop', root)
  const wordEl = $('.hero-themes__word', root)
  const stage = $('.hero-themes__stage', root)
  const arch = $('.hero-themes__arch', root)
  const orbits = $$('.hero-themes__orbit', root)
  const last = [$('[data-header]'), $('.hero-themes__bar', root)].filter(Boolean)
  const cleanups = []
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    cleanups.push(() => target.removeEventListener(type, fn, opts))
  }

  let index = Math.max(0, tabs.findIndex(t => t.getAttribute('aria-pressed') === 'true'))
  let entrance = null

  if (wordEl) {
    wordEl.replaceChildren(makeLine(wordEl.textContent.trim()))
    fitWord(wordEl)
  }
  photos(root)

  // ───── Troca automática: 6000 ms por tema, com pausas que guardam o tempo restante ─────
  const pausedBy = new Set(['entrance'])
  if (reducedMotion()) pausedBy.add('reduced')
  let timer = null
  let startedAt = 0
  let remaining = AUTOPLAY_MS
  let progress = null
  const preloaded = new Set()

  function preload(i) {
    const t = themes[i]
    if (!t) return
    for (const url of [photoUrl(t, photos(root).front), ...t.orbits]) {
      if (preloaded.has(url)) continue
      preloaded.add(url)
      const img = new Image()
      img.decoding = 'async'
      img.src = url
    }
  }

  function run() {
    if (pausedBy.size || timer || themes.length < 2) return
    startedAt = Date.now()
    timer = setTimeout(() => {
      timer = null
      select(nextIndex(index, themes.length))
    }, remaining)
    progress?.resume()
    preload(nextIndex(index, themes.length))
  }

  function hold() {
    if (!timer) return
    clearTimeout(timer)
    timer = null
    remaining = Math.max(0, remaining - (Date.now() - startedAt))
    progress?.pause()
  }

  const pause = reason => { pausedBy.add(reason); hold() }
  const resume = reason => { pausedBy.delete(reason); run() }

  function restart() {
    if (timer) clearTimeout(timer)
    timer = null
    remaining = AUTOPLAY_MS
    progress?.kill()
    progress = null
    for (const bar of $$('.hero-themes__progress', root)) gsap.set(bar, { clearProps: 'transform' })
    // Sem troca automática (movimento reduzido) a barra do tema ativo fica cheia pelo CSS.
    const bar = tabs[index] && $('.hero-themes__progress', tabs[index])
    if (bar && !pausedBy.has('reduced') && themes.length > 1) {
      progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: AUTOPLAY_MS / 1000, ease: 'none', paused: true })
    }
    run()
  }

  // Pausa do usuário (WCAG 2.2.2): vence hover, foco e visibilidade; só o próprio botão a desfaz.
  const PAUSE_ICON = '<svg class="hero-themes__pause-icon" aria-hidden="true" viewBox="0 0 24 24"><path class="is-pause" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/><path class="is-play" d="M8 5l11 7-11 7z"/></svg>'
  let pauseBtn = null
  if (themes.length > 1 && !pausedBy.has('reduced')) {
    pauseBtn = document.createElement('button')
    pauseBtn.type = 'button'
    pauseBtn.className = 'hero-themes__pause'
    pauseBtn.innerHTML = PAUSE_ICON
    const label = () => {
      const paused = pausedBy.has('user')
      pauseBtn.setAttribute('aria-pressed', String(paused))
      pauseBtn.setAttribute('aria-label', paused ? 'Retomar troca de temas' : 'Pausar troca de temas')
    }
    label()
    pauseBtn.addEventListener('click', () => {
      if (pausedBy.has('user')) resume('user')
      else pause('user')
      label()
    })
    ;($('.hero-themes__cta', root) ?? $('.hero-themes__bar', root) ?? root).append(pauseBtn)
    cleanups.push(() => pauseBtn.remove())
  }

  function select(i) {
    if (i === index || !themes[i]) return
    entrance?.progress(1)
    index = i
    applyTheme(root, themes[i], { instant: reducedMotion() })
    restart()
  }

  tabs.forEach((tab, i) => {
    on(tab, 'click', () => select(i))
    on(tab, 'pointerenter', () => preload(i))
    on(tab, 'focus', () => preload(i))
  })
  on(root, 'pointerenter', e => { if (e.pointerType !== 'touch') pause('hover') })
  on(root, 'pointerleave', e => { if (e.pointerType !== 'touch') resume('hover') })
  // Só o foco de teclado pausa: o clique do mouse também foca o botão, e esse foco (sem :focus-visible)
  // deixava a troca automática parada depois que o mouse saía do hero.
  on(root, 'focusin', e => { if (keyboardFocus(e.target)) pause('focus') })
  on(root, 'focusout', e => { if (!root.contains(e.relatedTarget)) resume('focus') })
  on(document, 'visibilitychange', () => (document.visibilityState === 'hidden' ? pause('hidden') : resume('hidden')))
  cleanups.push(onMotionChange(reduce => {
    if (pauseBtn) pauseBtn.hidden = reduce
    if (reduce) pause('reduced')
    else resume('reduced')
  }))

  // ───── Parallax do mouse: palco ±12 px, palavra ∓6 px ─────
  if (finePointer() && !reducedMotion() && stage && wordEl) {
    const opts = { duration: 0.8, ease: 'power3.out' }
    const to = [gsap.quickTo(stage, 'x', opts), gsap.quickTo(stage, 'y', opts), gsap.quickTo(wordEl, 'x', opts), gsap.quickTo(wordEl, 'y', opts)]
    const move = (nx, ny) => { to[0](nx * 12); to[1](ny * 12); to[2](-nx * 6); to[3](-ny * 6) }
    on(root, 'pointermove', e => {
      const r = root.getBoundingClientRect()
      if (!r.width || !r.height) return
      move(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1)
    })
    on(root, 'pointerleave', () => move(0, 0))
  }

  // ───── Foto de fundo quase fixa: enquanto o hero sai da tela, ela desce metade do caminho ─────
  if (backdrop) {
    let drift = null
    const setDrift = reduce => {
      drift?.scrollTrigger?.kill()
      drift?.kill()
      drift = null
      gsap.set(backdrop, { clearProps: 'transform' })
      if (reduce) return
      drift = gsap.to(backdrop, {
        yPercent: BACKDROP_DRIFT,
        ease: 'none',
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom top', scrub: true },
      })
    }
    setDrift(reducedMotion())
    cleanups.push(onMotionChange(setDrift), () => setDrift(true))
  }

  // ───── Tamanho da palavra: refeito ao redimensionar e quando as fontes chegam (também com movimento reduzido) ─────
  let resizeTimer
  if (wordEl) {
    on(window, 'resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => fitWord(wordEl), 150)
    }, { passive: true })
    document.fonts?.ready.then(() => { if (wordEl.isConnected) fitWord(wordEl) })
  }

  // ───── Entrada: em sh:intro-done, ou logo de cara se não houver intro ─────
  // .is-ready desliga o estado oculto do CSS; daqui em diante quem esconde é o estado inicial da GSAP.
  root.classList.add('is-ready')
  if (!reducedMotion()) entrance = buildEntrance({ backdrop, wordEl, arch, orbits, last })
  restart()
  const start = () => {
    entrance?.play()
    resume('entrance')
  }
  if (document.documentElement.classList.contains('intro-on')) on(window, 'sh:intro-done', start, { once: true })
  else start()

  return {
    select,
    index: () => index,
    destroy() {
      if (timer) clearTimeout(timer)
      clearTimeout(resizeTimer)
      progress?.kill()
      entrance?.kill()
      running.get(root)?.kill()
      cleanups.forEach(fn => fn())
    },
  }
}

export function init() {
  $$('[data-hero-themes]').forEach(bindHeroThemes)
}
