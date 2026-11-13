import { $, $$ } from '../core/dom.js'

export async function sharePage({ title, url }, nav = globalThis.navigator) {
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, url })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'shared'
    }
  }
  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(url)
      return 'copied'
    } catch { /* cai em 'failed' */ }
  }
  return 'failed'
}

const MESSAGES = { copied: 'Link copiado', failed: 'Não foi possível copiar o link', shared: '' }

export function init() {
  const buttons = $$('[data-share]')
  if (!buttons.length) return
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await sharePage({ title: document.title, url: location.href })
      const status = $('[data-share-status]')
      if (status) status.textContent = MESSAGES[result]
    })
  })
}
