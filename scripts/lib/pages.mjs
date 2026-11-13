/** "eventos/", "/eventos/" e "eventos" viram "/eventos/"; "home" e "/" viram "/"; "*.html" fica sem barra final. */
export function normalizePage(p) {
  const t = p.trim().replace(/^\/+|\/+$/g, '')
  if (t === '' || t === 'home') return '/'
  return t.endsWith('.html') ? `/${t}` : `/${t}/`
}

/** Converte as chaves de `discoverInputs` ("index", "404", "eventos/index") em URLs, ordenadas. */
export function pagesFromInputs(inputs) {
  return Object.keys(inputs)
    .map(key => normalizePage(/(^|\/)index$/.test(key) ? key.replace(/(^|\/)index$/, '') : `${key}.html`))
    .sort()
}
