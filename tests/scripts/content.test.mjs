import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))

// Lido dentro de cada teste: sem o arquivo, cada teste falha por conta própria.
const load = () => readJson('content/lugares.json')
const inventario = readJson('content/inventario.json')

const CATEGORIAS = ['pontos-turisticos', 'eventos', 'comunidades', 'comercios']
const POR_CATEGORIA = { 'pontos-turisticos': 6, eventos: 7, comunidades: 5, comercios: 6 }

// Spec §7.2 — entram exatamente como estão
const INTROS = {
  'pontos-turisticos': 'Pontes, praças e igrejas que guardam a memória da cidade.',
  eventos: 'Música, fé, esporte e tradição ao longo de todo o ano.',
  comunidades: 'Distritos e comunidades rurais que também são Santo Hipólito.',
  comercios: 'Negócios locais que movimentam a cidade.',
}
const CONTAGENS = {
  'pontos-turisticos': '06 lugares',
  eventos: '07 eventos',
  comunidades: '05 comunidades',
  comercios: '06 negócios',
}
const TIPOS = [
  'Igreja', 'Praça', 'Rio das Velhas', 'Música', 'Cívico', 'Tradição', 'Festa junina', 'Esporte',
  'Confraternização', 'Distrito', 'Comunidade rural', 'Moda', 'Moda fitness', 'Materiais de construção',
  'Bar', 'Varejão', 'Padaria e lanchonete',
]

// Emoji pelo Ruling 3, com o seletor de variação escrito como escape (Ruling 21: sem caractere invisível no fonte) ("©" é Extended_Pictographic e não pode reprovar); os demais, como no brief.
const PROIBIDOS = [
  /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u,
  /parabéns/i,
  /possivelmente/i,
  /embora não tenha encontrado/i,
  /desfile \d/i,
  /matrix/i,
  /hulmilde/i,
  /disfile/i,
  /àgua/i,
  /caquente/i,
]

// Todas as strings de um valor (objeto, array ou string), em ordem.
const strings = (v) =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []
const texto = (lugar) => strings(lugar).join('\n')
const seoTitle = (titulo) => `${titulo} · Santo Hipólito-MG`
const frases = (s) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean)
const lugarDe = (slug) => {
  const lugar = load().lugares.find((l) => l.slug === slug)
  expect(lugar, `lugar ${slug} ausente`).toBeTruthy()
  return lugar
}

// Os únicos números permitidos em cada lugar (fatos da spec §8.2). Lugares fora da lista: nenhum número.
const NUMEROS = {
  'capela-nossa-senhora-das-dores': ['8', '1910'],
  'igreja-matriz': ['19'],
  'desfile-civico': ['7'],
  'encontro-dos-cachaceiros': ['10', '2018'],
  salobro: ['200'],
  'agua-boa': ['200'],
  'valo-fundo': ['136', '60,43', '13,96', '2.764', '30', '12', '1962'],
  'senhora-da-gloria': ['1943'],
  'deposito-pereira': ['80', '39210', '000'],
}

describe('content/lugares.json', () => {
  it('24 lugares com os slugs e a ordem do inventário; 6/7/5/6 por categoria', () => {
    const { lugares } = load()
    expect(lugares.map(({ slug, categoria, titulo }) => ({ slug, categoria, titulo }))).toEqual(inventario)
    const contagem = {}
    for (const l of lugares) contagem[l.categoria] = (contagem[l.categoria] ?? 0) + 1
    expect(contagem).toEqual(POR_CATEGORIA)
  })

  it('categorias: as intros são exatamente as da spec §7.2', () => {
    const c = load().categorias
    expect(c['eventos'].intro).toBe('Música, fé, esporte e tradição ao longo de todo o ano.')
    expect(Object.keys(c)).toEqual(CATEGORIAS)
    for (const cat of CATEGORIAS) {
      expect([cat, c[cat].intro]).toEqual([cat, INTROS[cat]])
      expect([cat, c[cat].contagem]).toEqual([cat, CONTAGENS[cat]])
      expect(c[cat].nome.trim().length).toBeGreaterThan(0)
      expect(c[cat].singular.trim().length).toBeGreaterThan(0)
      const d = c[cat].descricao
      expect([cat, d.length >= 50 && d.length <= 155, d.length]).toEqual([cat, true, d.length])
      expect([cat, /[.!]$/.test(d)]).toEqual([cat, true])
    }
  })

  it('campos obrigatórios e limites: resumo ≤ 140, descrição de 50 a 155, ≥ 2 parágrafos, ≤ 3 chips', () => {
    const { lugares } = load()
    for (const l of lugares) {
      const s = l.slug
      expect([s, TIPOS.includes(l.tipo), l.tipo]).toEqual([s, true, l.tipo])
      expect([s, 'resumo', l.resumo.length >= 40 && l.resumo.length <= 140, l.resumo.length]).toEqual([s, 'resumo', true, l.resumo.length])
      expect([s, 'descricao', l.descricao.length >= 50 && l.descricao.length <= 155, l.descricao.length]).toEqual([s, 'descricao', true, l.descricao.length])
      expect([s, 'descricao termina em ponto', /[.!]$/.test(l.descricao)]).toEqual([s, 'descricao termina em ponto', true])
      const nLead = frases(l.lead).length
      expect([s, 'lead com 2 ou 3 frases', nLead >= 2 && nLead <= 3, nLead]).toEqual([s, 'lead com 2 ou 3 frases', true, nLead])
      expect([s, 'lead termina em ponto', /[.!?]$/.test(l.lead)]).toEqual([s, 'lead termina em ponto', true])
      expect([s, 'paragrafos 2 ou 3', l.paragrafos.length >= 2 && l.paragrafos.length <= 3]).toEqual([s, 'paragrafos 2 ou 3', true])
      for (const p of l.paragrafos) {
        expect([s, 'parágrafo curto', p.trim().length > 0 && p.length <= 300, p.length]).toEqual([s, 'parágrafo curto', true, p.length])
        expect([s, 'parágrafo termina em ponto', /[.!?]$/.test(p)]).toEqual([s, 'parágrafo termina em ponto', true])
      }
      expect([s, 'chips ≤ 3', Array.isArray(l.chips) && l.chips.length <= 3]).toEqual([s, 'chips ≤ 3', true])
      for (const chip of l.chips) expect([s, chip, chip.trim().length > 0 && chip.length <= 32]).toEqual([s, chip, true])
      expect([s, 'info é array', Array.isArray(l.info)]).toEqual([s, 'info é array', true])
      for (const row of l.info) {
        expect([s, Object.keys(row).sort()]).toEqual([s, ['icone', 'rotulo', 'valor']])
        expect([s, row.rotulo.trim().length > 0 && row.valor.trim().length > 0]).toEqual([s, true])
      }
      if ('endereco' in l) {
        expect([s, Object.keys(l.endereco).sort()]).toEqual([s, ['bairro', 'cep', 'logradouro']])
        expect([s, /^\d{5}-\d{3}$/.test(l.endereco.cep)]).toEqual([s, true])
      }
    }
  })

  it('descrições e resumos são únicos por lugar', () => {
    const { lugares } = load()
    expect(new Set(lugares.map((l) => l.descricao)).size).toBe(lugares.length)
    expect(new Set(lugares.map((l) => l.resumo)).size).toBe(lugares.length)
    expect(new Set(lugares.map((l) => l.lead)).size).toBe(lugares.length)
  })

  it('título SEO "<titulo> · Santo Hipólito-MG" ≤ 60', () => {
    for (const l of load().lugares) {
      const t = seoTitle(l.titulo)
      expect([t, t.length <= 60, t.length]).toEqual([t, true, t.length])
    }
  })

  it('nenhum emoji nem termo proibido', () => {
    const data = load()
    const tudo = [...strings(data.categorias), ...strings(data.lugares)]
    for (const s of tudo) {
      for (const re of PROIBIDOS) expect([s, String(re), re.test(s)]).toEqual([s, String(re), false])
    }
  })

  it('higiene do texto: sem espaço duplo, sem espaço antes de pontuação, aspas tipográficas', () => {
    const data = load()
    for (const s of [...strings(data.categorias), ...strings(data.lugares)]) {
      expect([s, /\s{2,}|\s[.,;:!?]|"/.test(s), s !== s.trim()]).toEqual([s, false, false])
    }
  })

  it.each([
    ['capela-nossa-senhora-das-dores', ['8h', '1910', 'irmãos Moreira']],
    ['igreja-matriz', ['19h', 'Rua Thieres Moreira']],
    ['deposito-pereira', ['Raimundo da Glória Caldeira, 80', 'Santa Rita', '39210-000']],
    ['valo-fundo', ['136', '60,43 km²', '13,96%', '2.764', 'Guimarães Rosa']],
    ['senhora-da-gloria', ['Piçarrão', '1943', 'Corinto']],
    ['salobro', ['200', 'estrada de ferro']],
    ['agua-boa', ['200', 'Cerrado']],
    ['forrozao', ['entrada franca']],
    ['corrida-de-argolinhas', ['Claro dos Poções', 'Frei Gaspar']],
    ['desfile-civico', ['7 de setembro']],
    ['encontro-dos-cachaceiros', ['2018']],
  ])('%s preserva os fatos %j', (slug, fatos) => {
    const t = texto(lugarDe(slug)).toLowerCase()
    for (const f of fatos) expect([slug, f, t.includes(f.toLowerCase())]).toEqual([slug, f, true])
  })

  it.each([
    ['igreja-matriz', 'Matriz'],
    ['desfile-civico', 'Desfile'],
    ['caquende', 'humilde'],
    ['agua-boa', 'Água Boa'],
    ['caquende', 'Caquende'],
    ['senhora-da-gloria', 'Nossa Senhora da Glória'],
    ['ponte-rio-das-velhas', 'Rio das Velhas'],
  ])('%s usa a grafia obrigatória da §8.1: %s', (slug, grafia) => {
    const corpo = [lugarDe(slug).lead, ...lugarDe(slug).paragrafos].join('\n')
    expect([slug, grafia, corpo.includes(grafia)]).toEqual([slug, grafia, true])
  })

  it('nenhum número além dos fatos da §8.2 (sem datas, horários ou quantidades novas)', () => {
    for (const l of load().lugares) {
      const permitidos = NUMEROS[l.slug] ?? []
      const achados = texto(l).match(/\d+(?:[.,]\d+)*/g) ?? []
      const extras = achados.filter((n) => !permitidos.includes(n))
      expect([l.slug, extras]).toEqual([l.slug, []])
    }
  })

  it('não repete os contatos das fachadas (Ruling 21: a Task 9 os mescla de contatos-comercios.json)', () => {
    const contatos = readJson('content/contatos-comercios.json')
    for (const [slug, c] of Object.entries(contatos)) {
      const t = texto(lugarDe(slug))
      for (const tel of c.telefones ?? []) expect([slug, tel, t.includes(tel)]).toEqual([slug, tel, false])
      if (c.instagram) expect([slug, c.instagram, t.toLowerCase().includes(c.instagram)]).toEqual([slug, c.instagram, false])
      if (c.numero) expect([slug, c.numero, new RegExp(`\\b${c.numero}\\b`).test(t)]).toEqual([slug, c.numero, false])
    }
  })

  it('info[].icone existe no sprite', () => {
    const svg = fs.readFileSync(path.join(root, 'public', 'icons.svg'), 'utf8')
    const simbolos = new Set([...svg.matchAll(/<symbol\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]))
    expect(simbolos.size).toBeGreaterThan(0)
    const usados = load().lugares.flatMap((l) => l.info.map((row) => [l.slug, row.icone]))
    expect(usados.length).toBeGreaterThan(0)
    for (const [slug, icone] of usados) expect([slug, icone, simbolos.has(icone)]).toEqual([slug, icone, true])
  })
})
