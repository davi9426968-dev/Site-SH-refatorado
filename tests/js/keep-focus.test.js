// @vitest-environment happy-dom
// core/keep-focus (fix round 1 da Task 13b): o refresh do ScrollTrigger tira as seções fixadas do pin-spacer e
// as devolve; mover no DOM o elemento focado derruba o foco para o <body>. Quem navega pelo teclado dentro do
// trilho fixado perdia o lugar a cada refresh (por exemplo, o das divisões tardias de títulos).
import { beforeEach, describe, expect, it } from 'vitest'
import { keepFocusOnRefresh } from '../../src/js/core/keep-focus.js'

const fakeST = () => {
  const handlers = {}
  return {
    handlers,
    addEventListener: (type, fn) => { (handlers[type] ||= []).push(fn) },
    fire: type => (handlers[type] || []).forEach(fn => fn()),
  }
}

beforeEach(() => {
  document.body.innerHTML = '<section id="pin"><a id="card" href="/x/">x</a></section><button id="outro">y</button>'
})

describe('keepFocusOnRefresh', () => {
  it('devolve o foco ao elemento que o refresh derrubou (pin trocado de lugar no DOM)', () => {
    const st = fakeST()
    keepFocusOnRefresh(st)
    const card = document.getElementById('card')
    card.focus()
    st.fire('refreshInit')
    const section = document.getElementById('pin')
    document.body.append(section) // o "swap" do pin: remove e reinsere, e o foco cai no body
    card.blur()
    expect(document.activeElement).toBe(document.body)
    st.fire('refresh')
    expect(document.activeElement).toBe(card)
  })

  it('não mexe no foco se ele não caiu (ou se foi para outro elemento de propósito)', () => {
    const st = fakeST()
    keepFocusOnRefresh(st)
    const card = document.getElementById('card')
    const outro = document.getElementById('outro')
    card.focus()
    st.fire('refreshInit')
    outro.focus()
    st.fire('refresh')
    expect(document.activeElement).toBe(outro)
  })

  it('sem foco antes do refresh, não foca nada', () => {
    const st = fakeST()
    keepFocusOnRefresh(st)
    st.fire('refreshInit')
    st.fire('refresh')
    expect(document.activeElement).toBe(document.body)
  })
})
