import { describe, it, expect } from 'vitest'
import { checkHtml } from '../../scripts/lib/check.mjs'

const exists = p => ['/eventos/', '/img/a.webp'].includes(p)
const title = 'Título de vinte chars'.slice(0, 20)
const desc = 'D'.repeat(80)
const page = body => `<!doctype html><html lang="pt-BR"><head><title>${title}</title><meta name="description" content="${desc}"></head><body><main><h1>Olá</h1>${body}</main></body></html>`
const ok = page('')
const run = (body, file = 'index.html') => checkHtml({ file, html: page(body), exists })
const withHtml = html => checkHtml({ file: 'index.html', html, exists })

describe('checkHtml', () => {
  it('aceita página válida', () => expect(withHtml(ok)).toEqual([]))
  it('acusa href interno quebrado', () => expect(run('<a href="/nada/">x</a>')).toContainEqual(expect.stringMatching(/\/nada\//)))
  it('aceita href interno existente, com fragmento', () => expect(run('<a href="/eventos/#x">x</a>')).toEqual([]))
  it('acusa candidato de srcset inexistente', () => expect(run('<img src="/img/a.webp" srcset="/img/b.webp 800w" alt="" width="1" height="1">')).toContainEqual(expect.stringMatching(/b\.webp/)))
  it('acusa textos proibidos', () => expect(run('<a href="https://wa.me/5500000000000">x</a>').length).toBe(1))
  it('acusa 0 h1', () => expect(withHtml(ok.replace(/<h1>.*<\/h1>/, ''))).toContainEqual(expect.stringMatching(/h1/)))
  it('acusa 2 h1', () => expect(run('<h1>outro</h1>')).toContainEqual(expect.stringMatching(/h1/)))
  it('acusa img sem alt, width ou height', () => {
    expect(run('<img src="/img/a.webp" width="1" height="1">')).toContainEqual(expect.stringMatching(/alt/))
    expect(run('<img src="/img/a.webp" alt="" height="1">')).toContainEqual(expect.stringMatching(/width/))
    expect(run('<img src="/img/a.webp" alt="" width="1">')).toContainEqual(expect.stringMatching(/height/))
  })
  it('acusa target _blank sem rel noopener', () => expect(run('<a href="https://x.com" target="_blank">x</a>')).toContainEqual(expect.stringMatching(/noopener/)))
  it('aceita target _blank com rel noopener noreferrer', () => expect(run('<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>')).toEqual([]))
  it('acusa emoji', () => expect(run('<p>Força 💪</p>')).toContainEqual(expect.stringMatching(/emoji/i)))
  it('aceita © 2026 Santo Hipólito', () => expect(run('<p>© 2026 Santo Hipólito</p>')).toEqual([]))
  it('acusa âncora local sem id correspondente', () => expect(run('<a href="#zzz">x</a>')).toContainEqual(expect.stringMatching(/#zzz/)))
  it('aceita âncora local com id', () => expect(run('<a href="#zzz">x</a><p id="zzz"></p>')).toEqual([]))
  it('acusa title com mais de 60', () => expect(withHtml(ok.replace(title, 'T'.repeat(61)))).toContainEqual(expect.stringMatching(/title/i)))
  it('acusa description fora de 50–155', () => {
    expect(withHtml(ok.replace(desc, 'D'.repeat(49)))).toContainEqual(expect.stringMatching(/description/i))
    expect(withHtml(ok.replace(desc, 'D'.repeat(156)))).toContainEqual(expect.stringMatching(/description/i))
  })
  it('acusa lang diferente de pt-BR', () => expect(withHtml(ok.replace('pt-BR', 'en'))).toContainEqual(expect.stringMatching(/lang/)))
  it('ignora http(s), mailto, tel e data:', () =>
    expect(run('<a href="https://a.com">a</a><a href="mailto:a@b.c">m</a><a href="tel:+5538">t</a><img src="data:image/png;base64,AAAA" alt="" width="1" height="1">')).toEqual([]))
})
