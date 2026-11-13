import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { discoverInputs } from '../../scripts/lib/inputs.mjs'

let tmp
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-inputs-'))
  for (const f of ['index.html', '404.html', 'eventos/index.html', 'eventos/forrozao/index.html',
    '_legado/x/index.html', 'partials/header.html', 'node_modules/a/index.html', 'styleguide/index.html']) {
    fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true })
    fs.writeFileSync(path.join(tmp, f), '<!doctype html>')
  }
})
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

describe('discoverInputs', () => {
  it('descobre só as páginas do site', () =>
    expect(Object.keys(discoverInputs(tmp)).sort()).toEqual(['404', 'eventos/forrozao/index', 'eventos/index', 'index']))
  it('aponta para o caminho absoluto de cada arquivo', () =>
    expect(discoverInputs(tmp)['eventos/index']).toBe(path.join(tmp, 'eventos', 'index.html')))
})

describe('discoverInputs: saídas de build locais', () => {
  it('ignora .vercel, _fotos e coverage', () => {
    const t = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-inputs2-'))
    for (const f of ['index.html', '.vercel/output/static/index.html', '_fotos/a/index.html', 'coverage/index.html']) {
      fs.mkdirSync(path.dirname(path.join(t, f)), { recursive: true })
      fs.writeFileSync(path.join(t, f), '<!doctype html>')
    }
    try { expect(Object.keys(discoverInputs(t))).toEqual(['index']) } finally { fs.rmSync(t, { recursive: true, force: true }) }
  })
})
