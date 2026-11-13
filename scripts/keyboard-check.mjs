// Verificação de teclado em navegador real (Task 13, passo 5): skip-link, menu mobile e lightbox.
// Uso: npm run build && npm run keyboard   (sai com código 1 se algum item falhar)
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const GALERIA = '/pontos-turisticos/coreto/'
const TIMEOUT = 5000
const resultados = []
const registra = (nome, ok, detalhe = '') => {
  resultados.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nome}${ok ? '' : `  -> ${detalhe}`}`)
}
/** Espera o estado esperado no navegador; devolve true/false em vez de lançar. */
const espera = async (page, fn, arg) => {
  try { await page.waitForFunction(fn, arg, { timeout: TIMEOUT }); return true } catch { return false }
}

let server
let browser
try {
  server = await preview({ preview: { port: 0, strictPort: false } })
  const base = server.resolvedUrls.local[0].replace(/\/$/, '')
  try {
    browser = await chromium.launch({ channel: 'chrome' })
  } catch (err) {
    console.error(`Não foi possível abrir o Chrome do sistema (chromium.launch channel "chrome"): ${err.message}`)
    process.exitCode = 1
    throw err
  }

  // 1) Desktop 1440: skip-link
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${base}/`, { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    // O skip-link entra com transição de transform: espera estar dentro da viewport.
    const visivel = await espera(page, () => {
      const el = document.activeElement
      if (!el?.classList.contains('skip-link')) return false
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 1 && r.height > 1 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
        && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.9
    })
    registra('1440 / 1º Tab: .skip-link visível e focado', visivel, `activeElement.className="${await page.evaluate(() => document.activeElement?.className)}"`)
    await page.keyboard.press('Enter')
    const foco = await espera(page, () => document.activeElement?.id === 'conteudo')
    registra('1440 / Enter no skip-link: foco em #conteudo', foco, `activeElement#${await page.evaluate(() => document.activeElement?.id)}`)
    await page.close()
  }

  // 2 e 3) Mobile 390: menu
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await page.goto(`${base}/`, { waitUntil: 'networkidle' })
    let achou = false
    for (let i = 0; i < 40 && !achou; i++) {
      await page.keyboard.press('Tab')
      achou = await page.evaluate(() => document.activeElement?.hasAttribute('data-menu-toggle'))
    }
    const rotulo = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    registra('390 / Tab até o botão do menu', achou && rotulo === 'Abrir menu', `achou=${achou} label=${rotulo}`)
    await page.keyboard.press('Enter')
    const abriu = await espera(page, () => {
      const t = document.querySelector('[data-menu-toggle]')
      return t.getAttribute('aria-expanded') === 'true' && !document.querySelector('[data-menu]').hidden
        && document.activeElement === document.querySelector('[data-menu] a') && t.getAttribute('aria-label') === 'Fechar menu'
    })
    registra('390 / Enter: menu abre, foco no 1º link, rótulo "Fechar menu"', abriu,
      JSON.stringify(await page.evaluate(() => ({ expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), foco: document.activeElement?.className }))))
    await page.keyboard.press('Escape')
    const fechou = await espera(page, () => {
      const t = document.querySelector('[data-menu-toggle]')
      return t.getAttribute('aria-expanded') === 'false' && document.activeElement === t && t.getAttribute('aria-label') === 'Abrir menu'
    })
    registra('390 / Escape: menu fecha e foco volta ao botão', fechou,
      JSON.stringify(await page.evaluate(() => ({ expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), foco: document.activeElement?.className }))))
    await page.close()
  }

  // Trilho fixado da Home (carry da Task 11): com Tab pelos cards, cada card focado aparece inteiro na tela.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.addInitScript(() => { try { sessionStorage.setItem('sh-intro', '1') } catch {} })
    await page.goto(`${base}/`, { waitUntil: 'networkidle' })
    const fixou = await espera(page, () => document.querySelector('#pontos')?.classList.contains('is-pinned'))
    const cards = page.locator('#pontos .card-place')
    const total = await cards.count()
    await cards.first().focus()
    const fora = []
    for (let i = 1; i < total; i++) {
      await page.keyboard.press('Tab')
      const visivel = await espera(page, n => {
        const card = document.querySelectorAll('#pontos .card-place')[n]
        if (document.activeElement !== card) return false
        const r = card.getBoundingClientRect()
        return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
      }, i)
      if (!visivel) fora.push(i + 1)
    }
    registra(`1440 / trilho fixado: Tab pelos ${total} cards traz cada um inteiro para a tela`, fixou && fora.length === 0,
      `is-pinned=${fixou} cards fora da tela: ${fora.join(', ')}`)
    await page.close()
  }

  // 4, 5 e 6) Lightbox em /pontos-turisticos/coreto/
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${base}${GALERIA}`, { waitUntil: 'networkidle' })
    const total = await page.locator('[data-gallery-item]').count()
    await page.locator('[data-gallery-item]').first().focus()
    await page.keyboard.press('Enter')
    registra('Galeria / Enter no 1º item: dialog abre', await espera(page, () => document.querySelector('dialog.lightbox')?.open === true), 'dialog.lightbox não está open')
    await page.keyboard.press('ArrowRight')
    const esperado = `2 / ${total}`
    const contou = await espera(page, t => document.querySelector('.lightbox__counter')?.textContent.trim() === t, esperado)
    registra(`Galeria / ArrowRight: contador "${esperado}"`, contou, `contador="${await page.locator('.lightbox__counter').textContent()}"`)
    // Tab preso no dialog (carry da Task 5): do último controle, Tab volta ao primeiro; o foco nunca vai para a página.
    const foco = () => page.evaluate(() => {
      const a = document.activeElement
      return { dentro: !!document.querySelector('dialog.lightbox')?.contains(a), cls: a?.className || a?.tagName }
    })
    await page.locator('.lightbox__btn--close').focus()
    await page.keyboard.press('Tab')
    const volta = await espera(page, () => document.activeElement === document.querySelector('dialog.lightbox .lightbox__btn--prev'))
    registra('Galeria / Tab no último controle (fechar) volta ao primeiro (anterior)', volta, JSON.stringify(await foco()))
    const fora = []
    for (const tecla of ['Tab', 'Tab', 'Shift+Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(tecla)
      const f = await foco()
      if (!f.dentro) fora.push(`${tecla} -> ${f.cls}`)
    }
    registra('Galeria / 7× Tab e Shift+Tab: o foco nunca sai do dialog', fora.length === 0, fora.join('; '))
    await page.keyboard.press('Escape')
    const fechou = await espera(page, () => document.querySelector('dialog.lightbox')?.open === false
      && document.activeElement === document.querySelector('[data-gallery-item]'))
    registra('Galeria / Escape: dialog fecha e foco volta ao 1º item', fechou, 'dialog ainda aberto ou foco fora do 1º item')
    await page.close()
  }
} finally {
  await browser?.close()
  if (server) await new Promise(r => server.httpServer.close(r))
}

const falhas = resultados.filter(ok => !ok).length
console.log(falhas ? `${falhas} verificação(ões) falharam.` : `Teclado: ${resultados.length}/${resultados.length} verificações passaram.`)
process.exit(falhas ? 1 : 0)
