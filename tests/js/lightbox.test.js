// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLightbox, init } from '../../src/js/ui/lightbox.js'

const items = Array.from({ length: 5 }, (_, i) => ({
  src: `/img/${i + 1}-1600.jpg`,
  srcset: `/img/${i + 1}-800.jpg 800w, /img/${i + 1}-1600.jpg 1600w`,
  alt: `Foto ${i + 1}`
}))
const proto = HTMLDialogElement.prototype
const saved = { showModal: proto.showModal, close: proto.close }
let lb, opener

const key = (k, opts = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts })
  document.dispatchEvent(e)
  return e
}

beforeEach(() => {
  document.documentElement.removeAttribute('style')
  document.body.innerHTML = '<button id="op">abrir</button>'
  opener = document.getElementById('op')
  proto.showModal = function () { this.setAttribute('open', '') }
  proto.close = function () { this.removeAttribute('open') }
  lb = createLightbox(items)
})

afterEach(() => {
  lb.close()
  proto.showModal = saved.showModal
  proto.close = saved.close
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('style')
})

describe('createLightbox', () => {
  it('open(2) mostra o item 3, legenda = alt e contador "3 / 5"', () => {
    lb.open(2, opener)
    expect(lb.index()).toBe(2)
    expect(lb.el.hasAttribute('open')).toBe(true)
    expect(lb.el.querySelector('.lightbox__img').getAttribute('src')).toBe('/img/3-1600.jpg')
    expect(lb.el.querySelector('.lightbox__caption').textContent).toBe('Foto 3')
    // A legenda visível é o único anúncio: a foto fica com alt vazio para o leitor de tela não ler duas vezes.
    expect(lb.el.querySelector('.lightbox__img').getAttribute('alt')).toBe('')
    const counter = lb.el.querySelector('.lightbox__counter')
    expect(counter.textContent).toBe('3 / 5')
    expect(counter.getAttribute('aria-live')).toBe('polite')
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  it('next no último volta ao primeiro; prev no primeiro vai ao último', () => {
    lb.open(4, opener)
    lb.next()
    expect(lb.index()).toBe(0)
    lb.prev()
    expect(lb.index()).toBe(4)
  })

  it('ArrowRight avança, ArrowLeft volta e Escape fecha', () => {
    lb.open(1, opener)
    key('ArrowRight')
    expect(lb.index()).toBe(2)
    key('ArrowLeft')
    key('ArrowLeft')
    expect(lb.index()).toBe(0)
    key('Escape')
    expect(lb.el.hasAttribute('open')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('setas não fazem nada com o lightbox fechado', () => {
    key('ArrowRight')
    expect(lb.index()).toBe(0)
  })

  it('close devolve o foco ao elemento que abriu', () => {
    lb.open(0, opener)
    lb.close()
    expect(document.activeElement).toBe(opener)
  })

  it('o evento cancel (Escape nativo) fecha pelo close()', () => {
    lb.open(0, opener)
    const e = new Event('cancel', { cancelable: true })
    lb.el.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(lb.el.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('botões têm aria-label "Foto anterior", "Próxima foto" e "Fechar galeria"', () => {
    expect(lb.el.querySelector('.lightbox__btn--prev').getAttribute('aria-label')).toBe('Foto anterior')
    expect(lb.el.querySelector('.lightbox__btn--next').getAttribute('aria-label')).toBe('Próxima foto')
    expect(lb.el.querySelector('.lightbox__btn--close').getAttribute('aria-label')).toBe('Fechar galeria')
  })

  it('clicar nos botões navega e fecha', () => {
    lb.open(0, opener)
    lb.el.querySelector('.lightbox__btn--next').click()
    expect(lb.index()).toBe(1)
    lb.el.querySelector('.lightbox__btn--prev').click()
    expect(lb.index()).toBe(0)
    lb.el.querySelector('.lightbox__btn--close').click()
    expect(lb.el.hasAttribute('open')).toBe(false)
  })

  it('Tab prende o foco dentro do diálogo', () => {
    lb.open(0, opener)
    const btns = [...lb.el.querySelectorAll('button')]
    btns.at(-1).focus()
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    lb.el.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(btns[0])
    const s = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    lb.el.dispatchEvent(s)
    expect(document.activeElement).toBe(btns.at(-1))
  })

  it('swipe horizontal acima de 50 px troca de foto', () => {
    lb.open(1, opener)
    const touch = (type, x, y) => {
      const e = new Event(type, { bubbles: true })
      e.changedTouches = [{ clientX: x, clientY: y }]
      lb.el.dispatchEvent(e)
    }
    touch('touchstart', 200, 100)
    touch('touchend', 100, 105)
    expect(lb.index()).toBe(2)
    touch('touchstart', 100, 100)
    touch('touchend', 130, 100)
    expect(lb.index()).toBe(2)
    touch('touchstart', 100, 100)
    touch('touchend', 200, 100)
    expect(lb.index()).toBe(1)
  })

  it('usa o atributo open quando showModal não existe', () => {
    proto.showModal = undefined
    const other = createLightbox(items)
    other.open(0, opener)
    expect(other.el.hasAttribute('open')).toBe(true)
    other.close()
  })
})

describe('init', () => {
  it('não faz nada sem [data-gallery]', () => {
    document.body.innerHTML = ''
    expect(() => init()).not.toThrow()
    expect(document.querySelector('dialog.lightbox')).toBeNull()
  })

  it('clicar num a[data-gallery-item] abre no índice certo e impede a navegação', () => {
    document.body.innerHTML = `<div class="gallery" data-gallery>${items
      .map(i => `<a class="gallery__item" data-gallery-item href="${i.src}" data-srcset="${i.srcset}"><img src="/t.jpg" alt="${i.alt}"></a>`)
      .join('')}</div>`
    init()
    const links = [...document.querySelectorAll('[data-gallery-item]')]
    const e = new MouseEvent('click', { bubbles: true, cancelable: true })
    links[3].dispatchEvent(e)
    const dlg = document.querySelector('dialog.lightbox')
    expect(e.defaultPrevented).toBe(true)
    expect(dlg.hasAttribute('open')).toBe(true)
    expect(dlg.querySelector('.lightbox__counter').textContent).toBe('4 / 5')
    expect(dlg.querySelector('.lightbox__caption').textContent).toBe('Foto 4')
    expect(dlg.querySelector('.lightbox__img').getAttribute('srcset')).toBe(items[3].srcset)
    dlg.querySelector('.lightbox__btn--close').click()
    expect(document.activeElement).toBe(links[3])
  })
})
