// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMenu } from '../../src/js/ui/menu.js'

const read = f => readFileSync(resolve(process.cwd(), 'partials', `${f}.html`), 'utf8')
let toggle, panel, menu, links, last

beforeEach(() => {
  document.documentElement.className = ''
  document.body.innerHTML = read('header')
  toggle = document.querySelector('[data-menu-toggle]')
  panel = document.querySelector('[data-menu]')
  links = [...panel.querySelectorAll('.menu-mobile__link')]
  last = [...panel.querySelectorAll('a')].at(-1)
  menu = createMenu({ toggle, panel })
})

const key = (name, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true })
  document.activeElement.dispatchEvent(e)
  return e
}

describe('menu', () => {
  it('open: aria-expanded=true, remove hidden, foca o 1º link e adiciona html.menu-open', () => {
    const onOpen = vi.fn()
    menu = createMenu({ toggle, panel, onOpen })
    menu.open()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu')
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(document.activeElement).toBe(links[0])
    expect(document.documentElement.classList.contains('menu-open')).toBe(true)
    expect(menu.isOpen()).toBe(true)
    expect(onOpen).toHaveBeenCalled()
  })

  it('o botão alterna abrir e fechar', () => {
    toggle.click()
    expect(menu.isOpen()).toBe(true)
    toggle.click()
    expect(menu.isOpen()).toBe(false)
    expect(toggle.getAttribute('aria-label')).toBe('Abrir menu')
  })

  it('Escape fecha e devolve o foco ao botão', () => {
    const onClose = vi.fn()
    menu = createMenu({ toggle, panel, onClose })
    menu.open()
    key('Escape')
    expect(menu.isOpen()).toBe(false)
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.documentElement.classList.contains('menu-open')).toBe(false)
    expect(document.activeElement).toBe(toggle)
    expect(onClose).toHaveBeenCalled()
  })

  it('Tab no último link volta para o primeiro (foco preso): volta ao botão, o início do ciclo', () => {
    menu.open()
    last.focus()
    const e = key('Tab')
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(toggle)
  })

  it('Shift+Tab no botão vai para o último foco do painel', () => {
    menu.open()
    toggle.focus()
    const e = key('Tab', true)
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it('clicar num link fecha o menu', () => {
    menu.open()
    links[1].addEventListener('click', e => e.preventDefault())
    links[1].click()
    expect(menu.isOpen()).toBe(false)
  })
})

describe('menu init', () => {
  const setup = async reduce => {
    vi.resetModules()
    window.matchMedia = vi.fn(q => ({ matches: reduce && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    document.documentElement.removeAttribute('style')
    document.documentElement.className = ''
    document.body.innerHTML = read('header')
    const { init } = await import('../../src/js/ui/menu.js')
    init()
    return document.querySelector('[data-menu-toggle]')
  }

  it('abrir trava a rolagem e fechar libera', async () => {
    const t = await setup(true)
    t.click()
    expect(document.documentElement.style.overflow).toBe('hidden')
    t.click()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('com movimento reduzido não anima os links', async () => {
    const t = await setup(true)
    t.click()
    const { gsap } = await import('../../src/js/core/gsap.js')
    expect(gsap.getTweensOf(document.querySelector('.menu-mobile__link')).length).toBe(0)
  })

  it('com movimento permitido os links partem escondidos para entrar em sequência', async () => {
    const t = await setup(false)
    t.click()
    const { gsap } = await import('../../src/js/core/gsap.js')
    expect(gsap.getTweensOf(document.querySelector('.menu-mobile__link')).length).toBeGreaterThan(0)
  })

  it('é no-op sem o markup', async () => {
    vi.resetModules()
    document.body.innerHTML = ''
    const { init } = await import('../../src/js/ui/menu.js')
    expect(() => init()).not.toThrow()
  })
})
