import path from 'node:path'

export const FORBIDDEN = [
  'seu_perfil', 'seuemail', '5500000000000', 'Desfile 1', 'upload.wikimedia',
  'lorem', 'TODO', 'flaticon', 'remixicon', 'font-awesome',
]

// Ruling 3: © (U+00A9) é Extended_Pictographic, então só vale com VS16 ou apresentação de emoji.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u
const TAG = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

function parseAttrs(src) {
  const attrs = new Map()
  for (const m of src.matchAll(ATTR)) attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '')
  return attrs
}

const isExternal = u => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(u)

/** URLs de um atributo srcset, sem os descritores. */
const srcsetUrls = v => v.split(',').map(c => c.trim().split(/\s+/)[0]).filter(Boolean)

/**
 * Examina uma página já construída e devolve a lista de problemas.
 * @param {{ file: string, html: string, exists: (urlPath: string) => boolean }} input
 *   `file` é relativo ao dist (ex.: "eventos/forrozao/index.html").
 * @returns {string[]}
 */
export function checkHtml({ file, html, exists }) {
  const problems = []
  const add = msg => problems.push(msg)

  for (const word of FORBIDDEN) {
    // "lorem" ignora caixa; "TODO" e os demais, não ("todos" é português).
    const found = word === "lorem" ? html.toLowerCase().includes(word) : html.includes(word)
    if (found) add(`texto proibido "${word}"`)
  }

  const noComments = html.replace(/<!--[\s\S]*?-->/g, '')
  const text = noComments
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
  if (EMOJI.test(text)) add('emoji no texto')

  const htmlTag = noComments.match(/<html\b([^>]*)>/i)
  if (parseAttrs(htmlTag?.[1] ?? '').get('lang') !== 'pt-BR') add('<html lang> deve ser "pt-BR"')

  const title = noComments.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim()
  if (!title) add('falta <title>')
  else if (title.length > 60) add(`title com ${title.length} caracteres (máx. 60)`)

  let description = null
  const ids = new Set()
  const anchors = []
  let h1 = 0
  const dir = path.posix.dirname('/' + file)

  const checkUrl = (raw, where) => {
    const url = raw.trim()
    if (!url || isExternal(url)) return
    if (url.startsWith('#')) { anchors.push(url.slice(1)); return }
    const clean = url.split('#')[0].split('?')[0]
    if (!clean) return
    const abs = clean.startsWith('/') ? clean : path.posix.join(dir, clean) + (clean.endsWith('/') ? '/' : '')
    if (!exists(abs)) add(`${where} quebrado: ${url}`)
  }

  for (const m of noComments.matchAll(TAG)) {
    const tag = m[1].toLowerCase()
    const attrs = parseAttrs(m[2])
    if (attrs.has('id')) ids.add(attrs.get('id'))
    if (tag === 'h1') h1++
    if (tag === 'meta' && attrs.get('name') === 'description') description = attrs.get('content') ?? ''
    if (tag === 'img') {
      for (const a of ['alt', 'width', 'height']) if (!attrs.has(a)) add(`<img> sem ${a}: ${attrs.get('src') ?? '?'}`)
    }
    if (attrs.get('target') === '_blank' && !/\bnoopener\b/.test(attrs.get('rel') ?? '')) {
      add(`target="_blank" sem rel="noopener noreferrer": ${attrs.get('href') ?? '?'}`)
    }
    if (['a', 'link', 'use', 'script', 'img', 'source', 'video'].includes(tag)) {
      for (const a of ['href', 'xlink:href', 'src', 'poster']) if (attrs.has(a)) checkUrl(attrs.get(a), `${tag}[${a}]`)
      if ((tag === 'img' || tag === 'source') && attrs.has('srcset')) {
        for (const u of srcsetUrls(attrs.get('srcset'))) checkUrl(u, `${tag}[srcset]`)
      }
    }
  }

  if (h1 !== 1) add(`deve haver exatamente um <h1> (achei ${h1})`)
  if (description === null) add('falta meta description')
  else if (description.length < 50 || description.length > 155) add(`meta description com ${description.length} caracteres (50–155)`)
  for (const id of anchors) if (!ids.has(id)) add(`âncora local sem id correspondente: #${id}`)

  return problems
}
