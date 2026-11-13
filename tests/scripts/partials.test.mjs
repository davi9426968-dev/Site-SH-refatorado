import { describe, it, expect } from 'vitest'
import { expandIncludes } from '../../scripts/lib/partials.mjs'

describe('expandIncludes', () => {
  it('troca o include pelo conteúdo do partial', () =>
    expect(expandIncludes('<b><!-- @include header --></b>', n => `[${n}]`)).toBe('<b>[header]</b>'))
  it('resolve include aninhado até 2 níveis', () => {
    const p = { a: '<!-- @include b -->', b: '<!-- @include c -->', c: 'ok' }
    expect(expandIncludes('<!-- @include a -->', n => p[n])).toBe('ok')
  })
  it('falha no 3º nível', () => {
    const p = { a: '<!-- @include b -->', b: '<!-- @include c -->', c: '<!-- @include d -->', d: 'x' }
    expect(() => expandIncludes('<!-- @include a -->', n => p[n])).toThrow(/aninhado demais/)
  })
  it('falha com partial inexistente', () =>
    expect(() => expandIncludes('<!-- @include nao-existe -->', () => { throw Object.assign(new Error(), { code: 'ENOENT' }) }))
      .toThrow('Partial "nao-existe" não encontrado'))
  it('mantém comentários comuns', () => expect(expandIncludes('<!-- oi -->', () => '')).toBe('<!-- oi -->'))
})
