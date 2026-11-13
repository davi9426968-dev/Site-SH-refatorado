# Redesign do site de Santo Hipólito — Design

- **Data:** 2026-11-10
- **Status:** design aprovado em conversa; spec aguardando revisão
- **Referência visual:** https://carmed-bay.vercel.app/ (HTML + GSAP)

## 1. Contexto

O site atual tem 26 páginas HTML estáticas. Os problemas encontrados:

- CSS e JS copiados em cada página; o mesmo carrossel aparece em 20 arquivos.
- Links que nunca foram preenchidos: `seu_perfil`, `seuemail@gmail.com`, `wa.me/5500000000000`.
- Fotos erradas ou inexistentes. Padaria e Varejão usam fotos do Salobro e da Wikipedia; `agua boa/gloglo.png` não existe; a Festa dos Cachaceiros tem `src=""`.
- Capas com texto gravado dentro da imagem e colagens.
- 289 MB de mídia sem otimização (PNGs de até 4,4 MB, vídeo de 22 MB).
- Erros de digitação ("DISFILE", "MATRIX", "hulmilde", "Àgua boa", "m resumo").
- Emojis no meio do texto, tom informal ("Parabéns ao...") e frases especulativas ("possivelmente", "embora não tenha encontrado").
- Botão "ESCOLA" apontando para uma âncora que não existe, arquivo vazio (`nega.html`), página de rascunho (`cont.html`), pasta de teste (`teste mobile/`) e `<script src="novas.css">`.

O que a referência Carmed traz e vamos adaptar:

- Tipografia gigante em Poppins 800, sobre fundos creme, com uma única cor de marca.
- Menu transparente que vira vidro fosco ao rolar.
- Cursor de ponto e anel, faíscas no clique, textura de grão e botões magnéticos.
- Botão pílula com preenchimento que desliza.
- Cards "bento" com borda luminosa que segue o mouse e holofote global.
- Títulos que entram letra por letra (ScrollFloat).
- Contadores animados, esferas de cor desfocadas e hero com palavra gigante que troca com uma onda de cor.

## 2. Objetivo e critérios de sucesso

Site turístico e institucional de Santo Hipólito (MG), para turistas e moradores, com acabamento de agência.

O site está pronto quando:

1. `npm run build` gera `dist/` sem erros e as 30 páginas abrem por URL limpa.
2. `npm run check` não acusa nenhum link interno quebrado, nenhuma imagem faltando e nenhum texto proibido (ver §11).
3. Não sobra nenhum placeholder, e nenhuma página usa foto de outro lugar.
4. O Lighthouse em modo mobile, na Home e numa página de lugar, atinge a meta de 90 ou mais em Desempenho, Acessibilidade, Boas práticas e SEO.
5. O layout fica correto em 390, 768 e 1440 px de largura, conferido por screenshots.
6. Com `prefers-reduced-motion: reduce`, todo o conteúdo aparece sem animação, sem rolagem suave e sem rotação automática.
7. A mídia publicada pesa 40 MB ou menos (meta de cerca de 20 MB), e a primeira carga da Home fica em até 2,5 MB, sem contar o vídeo.

## 3. Decisões

| Tema | Decisão |
| --- | --- |
| Stack | Vite 8 em modo multi-página, com HTML, CSS e JS puros (ES modules). Sem framework. |
| Animação | GSAP 3.15 (core, ScrollTrigger, SplitText) e Lenis 1.3 para a rolagem suave |
| Fontes | `@fontsource/poppins` (400, 500, 600, 700, 800) e `@fontsource-variable/fraunces` itálico, hospedadas no próprio site |
| Mídia | `sharp` no pipeline de imagens; `ffmpeg-static` para recomprimir o vídeo uma única vez |
| Visual | Verde Cerrado e Ouro, tirados do brasão |
| Versionamento | Git local com commit ao fim de cada etapa, na branch `redesign/site-moderno` |
| Site antigo | Movido para `_legado/`, que fica fora do git e do build. Nada é apagado. |

## 4. Arquitetura

### 4.1 Estrutura de pastas

```
/
├── index.html                         Home
├── 404.html
├── pontos-turisticos/index.html       hub + 6 páginas <slug>/index.html
├── eventos/index.html                 hub + 7 páginas <slug>/index.html
├── comunidades/index.html             hub + 5 páginas <slug>/index.html
├── comercios/index.html               hub + 6 páginas <slug>/index.html
├── partials/                          head.html, header.html, footer.html, cta-fotos.html
├── src/
│   ├── main.js                        entrada única (inicializa módulos sob demanda)
│   ├── styles/                        main.css (@layer) + tokens, base, layout, components, sections
│   └── js/
│       ├── core/                      motion (reduced-motion, pointer), smooth-scroll, dom
│       ├── ui/                        header, menu, cursor, spark, magnet, back-to-top,
│       │                              lightbox, video, intro, share
│       └── fx/                        reveal, split, counters, bento, parallax, marquee,
│                                      hero-themes, horizontal, timeline, hover-preview,
│                                      video-expand, pillars
├── public/
│   ├── img/<categoria>/<slug>/NN-{800,1600}.webp, img/home/…, img/brand/…
│   ├── video/                         santo-hipolito.mp4 + poster
│   ├── icons.svg                      sprite de ícones SVG
│   ├── favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png
│   └── site.webmanifest, robots.txt
├── scripts/
│   ├── images.config.json             mapa explícito: origem → destino + alt + papel
│   ├── optimize-images.mjs            npm run images
│   ├── images.manifest.json           gerado: width/height de cada imagem
│   ├── check-site.mjs                 npm run check
│   └── screenshots.mjs                npm run shots
├── vite.config.js, package.json, README.md, .gitignore
├── docs/superpowers/{specs,plans}/
└── _legado/                           site antigo (ignorado por git e build)
```

### 4.2 Vite

- `appType: 'mpa'`.
- **Entradas do build:** todos os `**/index.html` mais o `404.html`, encontrados por glob. Ficam de fora `node_modules`, `dist`, `_legado`, `partials` e `docs`.
- **Plugin `partials`**, embutido no `vite.config.js` (`transformIndexHtml`, ordem `pre`):
  - Troca `<!-- @include nome -->` pelo conteúdo de `partials/nome.html`. Aceita includes aninhados até 2 níveis e acusa erro se o partial não existir.
  - No dev, editar um partial recarrega a página inteira.
- **Página ativa:** cada página declara `<body data-page="eventos">` e `header.js` marca o link correspondente com `aria-current="page"`.
- **CSS:** entra por `<link rel="stylesheet" href="/src/styles/main.css">` no partial `head.html`, o que evita tela sem estilo no dev.
- **JS:** entra por `<script type="module" src="/src/main.js">`. Os recursos pesados (lightbox, hero, rolagem horizontal, expansão do vídeo) carregam por `import()` só quando o seletor deles existe na página.
- **Variável `VITE_SITE_URL`** (opcional, em `.env`): quando definida, ativa URLs absolutas no Open Graph e no canonical e gera o `sitemap.xml` no build.
- **Comandos:**
  - `dev`, `build` e `preview`.
  - `images`: pipeline de fotos.
  - `check`: links, imagens e textos proibidos.
  - `shots`: screenshots de conferência.

### 4.3 URLs

Todas com barra final: `/`, `/pontos-turisticos/`, `/pontos-turisticos/coreto/` e assim por diante. Os links internos usam caminho absoluto a partir da raiz. O `404.html` funciona em hospedagem estática (Vercel, Netlify, GitHub Pages).

## 5. Sistema visual

### 5.1 Tokens (`tokens.css`)

**Cores**

| Token | Valor | Uso |
| --- | --- | --- |
| `--green-950` | `#0A2219` | rodapé, intro |
| `--green-900` | `#0E3024` | menu mobile, seções escuras |
| `--green-800` | `#123F2E` | **cor da marca** |
| `--green-700` | `#1B5640` | hover |
| `--green-100` | `#E3EDE6` | fundos suaves |
| `--gold-500` | `#E3A72F` | **destaque**: botões, faíscas, foco, texto sobre verde |
| `--gold-300` | `#F2CF7E` | brilhos |
| `--gold-700` | `#8A6210` | ouro como **texto sobre creme** (contraste 5,1:1) |
| `--cream-50` | `#FFFDF8` | cards |
| `--cream-100` | `#FBF7EE` | superfície principal |
| `--cream-200` | `#F4ECDA` | superfície quente |
| `--ink-900` | `#14201A` | texto |
| `--ink-600` | `rgb(20 32 26 / .68)` | texto secundário |
| `--line` | `rgb(18 63 46 / .14)` | bordas e divisórias |

**Cores dos 4 temas do hero**, tiradas do brasão:

- Natureza: `#123F2E`
- Rio das Velhas: `#0F4C5C`
- Tradição: `#8C3B21`
- Fé: `#8A5D0E` (escurecido em relação ao `#9A6A12` original, que dava só 4,39:1 com o creme)

**Regras de contraste**

- Ouro 500 sobre verde 800 dá 5,5:1 e pode ser usado em texto.
- Creme sobre verde 800 dá 10,9:1.
- Ouro 500 sobre creme dá só 2:1. **Nunca use como texto**; para texto em ouro sobre creme, use `--gold-700`.

**Tipografia**

- Fontes:
  - `--font-sans`: "Poppins", system-ui, sans-serif.
  - `--font-serif`: "Fraunces Variable", Georgia, serif. Só no itálico e só nas palavras de destaque, como em "alma *mineira*".
- Tamanhos:

  | Token | Valor |
  | --- | --- |
  | `--fs-hero` | `clamp(4.5rem, 21vw, 20rem)` |
  | `--fs-display` | `clamp(2.75rem, 7vw, 6.5rem)` |
  | `--fs-h2` | `clamp(2.25rem, 5vw, 4.5rem)` |
  | `--fs-h3` | `clamp(1.25rem, 1.6vw, 1.625rem)` |
  | `--fs-lead` | `clamp(1.125rem, 1.4vw, 1.375rem)` |
  | `--fs-body` | `1.0625rem` |
  | `--fs-small` | `.875rem` |
  | `--fs-eyebrow` | `.6875rem` |

- Títulos: peso 800, letter-spacing −0,045em, line-height 0,95 a 1,05.
- Corpo de texto: peso 400, line-height 1,7.
- Rótulos e menu: peso 600, caixa-alta, letter-spacing 0,14em a 0,28em.

**Layout**

- `--layout-max: 1440px`.
- `--gutter: clamp(20px, 4.2vw, 60px)`.
- `--edge: max(var(--gutter), calc((100vw - var(--layout-max)) / 2 + var(--gutter)))`.
- `--section-y: clamp(88px, 12vw, 160px)`.

**Forma, sombra e movimento**

- Raios: `--r-sm` 12px, `--r-md` 20px, `--r-lg` 28px e `--r-pill` 999px.
- **Arco colonial:** `border-radius: 999px 999px var(--r-md) var(--r-md)`.
- Sombras: `--shadow-card: 0 16px 40px rgb(18 63 46 / .10)` e `--glow-gold: 0 0 48px rgb(227 167 47 / .25)`.
- Movimento: `--ease-out: cubic-bezier(.16, 1, .3, 1)` e durações de .2s, .5s e .9s.

### 5.2 Componentes (`components.css`)

| Componente | Descrição |
| --- | --- |
| Etiqueta (eyebrow) | Ponto e texto em caixa-alta, acima dos títulos |
| Botões | `btn` em quatro variantes: `--primary` (pílula creme cujo verde desliza no hover), `--gold`, `--ghost` (seta que desliza) e `--icon` (círculo) |
| `magnet` | Elemento que puxa em direção ao cursor |
| `card-bento` | Foto com zoom, rótulo ◆, título, descrição e seta |
| `card-place` | Foto 4/5, índice, título e resumo |
| `card-type` | Card **sem foto**: fundo verde, inicial grande em Fraunces itálico e o convite "envie sua foto" |
| `stat` | Contador |
| `pillar` | Ícone, título e texto |
| `info-card` | Lista de dados (`dl`) com ícones |
| `breadcrumb`, `chip`, `marquee` | Trilha de navegação, etiqueta pequena e faixa de texto rolando |
| `gallery` | Grade em mosaico |
| `lightbox` | Galeria em tela cheia sobre `<dialog>` |
| `video-player` | Vídeo com controles próprios |
| `timeline` | Linha do tempo |
| `section-header` | Cabeçalho padrão de seção |
| `footer-wordmark` | Nome da cidade gigante no rodapé |

Os ícones vêm de um sprite SVG próprio (`public/icons.svg`, com `<use href="/icons.svg#nome">`). Remixicon, Font Awesome e flaticon saem; o site não depende de nenhuma CDN em runtime.

## 6. Efeitos globais

Cada módulo exporta `init()`, verifica se os seletores dele existem e não faz nada quando não existem. O `core/motion.js` expõe três coisas:

- `prefersReducedMotion`;
- `hasFinePointer` (`(hover: hover) and (pointer: fine)`);
- `onChange` (reage quando a preferência muda).

| Efeito | Comportamento | Com movimento reduzido ou toque |
| --- | --- | --- |
| Rolagem suave | Lenis (`lerp` .1) ligado ao `gsap.ticker` e ao `ScrollTrigger.update`. Âncoras usam `lenis.scrollTo`, descontando a altura do header. | Rolagem nativa |
| Header | Transparente sobre o hero. A partir de 40px ganha `is-scrolled` (vidro creme, `blur(16px)`, texto verde). Esconde ao descer depois de 400px e volta ao subir. | Sem esconder |
| Menu mobile (≤ 900px) | Tela cheia em `--green-900`, links grandes numerados entrando em sequência, redes sociais e marca d'água do brasão. `aria-expanded`, foco preso no menu, Esc fecha e a rolagem trava (`lenis.stop`). | Abre sem animação |
| Cursor | Ponto instantâneo e anel com atraso (lerp .18). Em links e botões o anel cresce. Com `[data-cursor="Ver"]`, o anel vira um círculo de 84px com o rótulo. O cursor nativo só some com `html.has-cursor`, nunca em campos de texto. | Cursor nativo |
| Faíscas | Canvas fixo; no clique, 8 raios dourados (400ms), ajustados à densidade de pixels da tela | Desligado |
| Grão | `body::after` com ruído SVG em data-URI, opacidade .06 e sem animação | Mantido (é estático) |
| Magnet | `[data-magnetic]` com força .35 e raio de 60px, via `gsap.quickTo`, voltando ao lugar ao sair | Desligado |
| Reveal | `[data-reveal]`: sobe 40px e aparece em .9s. `[data-reveal-stagger]`: os filhos entram com intervalo de .08s. `[data-reveal="clip"]`: imagem revelada de baixo para cima. Dispara uma vez, em `top 85%`. | Visível direto |
| Título letra a letra | `[data-split]`: SplitText por letra com `aria` automático. Cada letra entra de `yPercent:120`, `scaleY:2.3`, `scaleX:.7` e opacidade 0, com intervalo de .03s, ao entrar na tela. `data-split-scrub` liga a ao scroll. | Texto normal |
| Linhas | `[data-split-lines]`: linhas mascaradas subindo de `yPercent:100`, com intervalo de .08s | Texto normal |
| Contadores | `[data-count-to]` (opções `-decimals` e `-suffix`), formatados em pt-BR por `Intl.NumberFormat`. O HTML já traz o valor final (vale para quem está sem JS e para o SEO); o JS zera o número só no momento de animar. | Valor final |
| Bento | Variáveis `--glow-x`, `--glow-y` e `--glow-intensity` por proximidade do mouse, holofote dourado global e inclinação de ±6° | Sem brilho nem inclinação |
| Parallax | `[data-parallax="0.15"]` aplica `yPercent` ligado ao scroll; a imagem fica com escala 1,15 dentro de um wrapper com `overflow: hidden` | Desligado |
| Marquee | `[data-marquee]` com o clone marcado `aria-hidden`. Loop horizontal que acelera com a velocidade do scroll e inverte com a direção; pausa no hover. | Estático |
| Prévia no hover | `[data-hover-preview]`: uma foto segue o cursor e troca entre as linhas da lista | Miniaturas fixas na linha |
| Transição de páginas | CSS `@view-transition { navigation: auto; }` com fade e leve deslocamento; `ScrollTrigger.refresh()` depois de `document.fonts.ready` | Sem transição |
| Voltar ao topo | Botão fixo com anel SVG de progresso da rolagem; aparece depois de 600px | Rolagem nativa |

## 7. Páginas

### 7.1 Home (`/`)

0. **Intro**, só na primeira visita da sessão (`sessionStorage` dentro de try/catch):
   - Overlay `--green-950` com o brasão, "Santo Hipólito" e uma contagem de 0 a 100 em cerca de 1,2s; depois uma cortina sobe por `clip-path` em .8s e o hero começa.
   - Clique, toque ou Esc pulam a intro. Ela não aparece sem JS nem com movimento reduzido.
1. **`#inicio` — Hero de temas:**
   - **Conteúdo:**
     - Quatro temas declarados no próprio HTML (botões com `data-theme-word`, `data-theme-color` e as imagens): Natureza, Rio das Velhas, Tradição e Fé.
     - Palavra gigante creme atrás (`aria-hidden`).
     - Foto central em moldura de arco (`min(78vw, 420px)`, proporção 3/4).
     - Quatro "chips" de foto em órbita, dois deles com `blur(2px)`, flutuando.
     - Parallax do mouse: o palco move ±12px e a palavra ∓6px.
     - Um `h1` visualmente oculto: "Santo Hipólito — turismo, história e tradição em Minas Gerais".
   - **Controles:**
     - Embaixo à esquerda, o seletor "01 Natureza · 02 Rio das Velhas · 03 Tradição · 04 Fé", com barra de progresso da troca automática de 6s.
     - No centro, o botão magnético "Explorar a cidade", que leva a `#a-cidade`.
     - À direita, a indicação "Role".
   - **Entrada:** as letras sobem; o arco sobe a partir de `scale .9`; as órbitas chegam pelas laterais; o header e o botão aparecem por último.
   - **Troca de tema:**
     - A nova cor entra numa onda (`scaleX` 0→1 a partir da esquerda).
     - As letras saem para cima e as novas entram de baixo.
     - A foto do arco troca por `clip-path`.
     - As órbitas trocam de imagem com rotação aleatória.
   - **Pausas da troca automática:** com hover ou foco no hero, com a aba oculta e com movimento reduzido (nesse caso não há troca automática e a troca manual é instantânea).
2. **Faixa do brasão:** brasão de 56px e o texto "Município da região Central de Minas Gerais, às margens do Rio das Velhas — **emancipado em 1962**."
3. **`#a-cidade`:**
   - Etiqueta "A cidade" e título letra a letra: "Natureza tranquila, *alma mineira*".
   - Texto de abertura vindo do antigo "Sobre".
   - 3 pilares que se empilham no scroll no desktop: "Gente acolhedora", "Às margens do Rio das Velhas" e "Cultura e tradição" (festas e culinária: feijão tropeiro, frango com quiabo, doce de leite artesanal).
   - Botão "Explorar pontos turísticos".
   - **Visual:** anéis tracejados girando, brilho passando, brasão flutuando e foto da Igreja Matriz em arco com parallax. Esferas de cor desfocadas ao fundo.
4. **`#video`:** título "Santo Hipólito em movimento".
   - O vídeo começa ocupando 72% da largura com raio de 28px e, com a seção fixada no scroll, cresce até 100% com raio 0.
   - Botão de play/pausa (`aria-pressed`). O botão de som só aparece se o vídeo tiver áudio.
   - Toca quando 40% dele está visível e pausa fora disso.
   - Atributos: `preload="none"`, `muted`, `loop`, `playsinline` e pôster.
5. **`#explore`:** etiqueta "Explore" e título "Tudo o que a cidade *tem de melhor*".
   - Bento com 4 categorias, cada uma com contagem real: 06 lugares, 07 eventos, 05 comunidades e 06 negócios.
   - Grade desktop de 4 colunas: o card 1 ocupa 2×2, o card 2 ocupa 2 colunas, e os cards 3 e 4 ocupam uma cada.
   - Todos com `data-cursor="Ver"`.
6. **`#pontos`:** título "Pontos turísticos".
   - Uma fileira de 6 `card-place` e um card final "Ver todos".
   - A partir de 1024px, a seção fixa e a fileira anda na horizontal conforme o scroll. Abaixo disso (ou com movimento reduzido), vira uma fileira nativa com `scroll-snap`.
7. **`#numeros`:** etiqueta "Em números" e título "Pequena no tamanho, *gigante no coração*". Quatro números, com divisórias:

   | Número | Rótulo | Legenda |
   | --- | --- | --- |
   | 2.717 | Habitantes | População estimada |
   | 430 km² | Território | No bioma Cerrado |
   | 63 | Anos de emancipação | Lei Estadual nº 2.764, de 1962 |
   | 270 km | De Belo Horizonte | Microrregião de Curvelo |

   O 63 é calculado no navegador a partir de 1º/03/1963; o HTML traz 63.
8. **`#historia`:** título "De fazenda com capela *a município*". A linha do tempo desenha o progresso conforme o scroll, e o ponto de cada marco fica dourado:

   | Marco | Texto |
   | --- | --- |
   | Origens | A cidade nasce em torno de uma fazenda com uma capela |
   | 1910 | Chega a estação de trem, o povoado se forma ao redor e os irmãos Moreira constroem uma nova capela em terreno doado |
   | 1943 | Um decreto-lei estadual dá o nome de Nossa Senhora da Glória ao antigo Piçarrão |
   | 30/12/1962 | A Lei Estadual nº 2.764 cria o município de Santo Hipólito; distritos como Nossa Senhora da Glória, antes ligados a Corinto, passam a fazer parte dele |
   | 1º/03/1963 | Instalação do município, data registrada no brasão |

9. **`#eventos`:** etiqueta "Agenda cultural" e título "Festas que *contam quem somos*".
   - Lista com prévia no hover dos 7 eventos, cada um com nome, tipo e seta.
   - Faixa rolando: "Forrozão ✦ Desfile Cívico ✦ Corrida de Argolinhas ✦ Quadrilha dos Amigos ✦ Campeonatos ✦".
10. **CTA de fotos** (partial): "Envie suas fotos e *faça parte* deste site."
    - Botão principal "Enviar fotos por e-mail" (`mailto:roberto133ro@gmail.com`, com assunto já preenchido).
    - Botão secundário "Seguir @visite_santohipolito".
11. **Rodapé** (partial):
    - Brasão e a frase "Natureza tranquila, alma mineira e calor humano."
    - Colunas: Explore (as 4 categorias), A cidade (história, números, vídeo) e Contato (Instagram, Facebook, WhatsApp e e-mail).
    - "Santo Hipólito" gigante, "© 2026 Santo Hipólito — Minas Gerais" e voltar ao topo.

### 7.2 Páginas de categoria (4)

- **Hero creme (cerca de 80vh):**
  - Trilha de navegação e a etiqueta "Santo Hipólito · {Categoria}".
  - O nome da categoria gigante atrás de uma foto em arco flutuante.
  - O texto de introdução e um chip com a contagem.
- **Grade** de `card-place`, ou `card-type` para os itens sem foto, com `data-cursor="Ver"`.
- Faixa rolando com os nomes dos itens, depois o CTA de fotos e o rodapé.
- **Textos de introdução:**

  | Categoria | Introdução |
  | --- | --- |
  | Pontos turísticos | "Pontes, praças e igrejas que guardam a memória da cidade." |
  | Eventos | "Música, fé, esporte e tradição ao longo de todo o ano." |
  | Comunidades | "Distritos e comunidades rurais que também são Santo Hipólito." |
  | Comércios | "Negócios locais que movimentam a cidade." |

### 7.3 Páginas de lugar (24)

- **Hero** em tela quase cheia (88vh):
  - Foto de capa com parallax e gradiente na base.
  - Trilha de navegação e etiqueta com a categoria.
  - `h1` letra a letra e chips de fatos (por exemplo "Missas aos domingos, 8h" ou "Entrada franca").
- **Conteúdo** em grade de 12 colunas:
  - **Coluna de texto (7):** texto de abertura revelado por linhas e os parágrafos com reveal.
  - **Coluna lateral (4):** `info-card` fixo com os dados conhecidos (categoria, endereço ou localização, horários, entrada).
  - **Botões da lateral:**
    - "Como chegar", que abre `https://www.google.com/maps/search/?api=1&query=<nome>+Santo+Hipólito+MG`;
    - "Compartilhar", via Web Share API ou, sem ela, copiando o link.
- **Galeria** em mosaico com todas as fotos do lugar, revelação por `clip-path` e lightbox.
- **Lightbox:**
  - Abre sobre `<dialog>`.
  - Navega por setas, ←/→ ou deslizando.
  - Esc fecha.
  - Mostra a contagem "3 / 8" (`aria-live`).
  - Usa a legenda do texto alternativo.
  - Já carrega a foto vizinha.
- **"Continue explorando":** 3 cards da mesma categoria, mais "anterior" e "próximo".
- O CTA de fotos e o rodapé fecham a página.
- **Itens sem foto** (Encontro dos Cachaceiros e Caquende): o hero vira tipográfico (fundo verde, palavra gigante e marca d'água do brasão), e a galeria dá lugar ao CTA "Ainda não temos fotos — envie a sua".

### 7.4 Página 404

"404" gigante letra a letra, o texto "Esta página se perdeu pelo caminho." e os botões "Voltar ao início" e "Explorar a cidade".

## 8. Conteúdo

### 8.1 Diretrizes de texto

- **Tom:** profissional e acolhedor, em frases curtas.
- **Proibido:**
  - emojis;
  - "Parabéns ao…";
  - especulação ("possivelmente", "embora não tenha encontrado");
  - fatos novos que não estavam no site antigo.
- **Correções obrigatórias:** Matriz, Desfile, humilde, Água Boa, Caquende, Nossa Senhora da Glória, Rio das Velhas.

### 8.2 Inventário

**Pontos turísticos** (`/pontos-turisticos/`)

| Slug | Título | Origem | Fatos a preservar |
| --- | --- | --- | --- |
| `ponte-rio-das-velhas` | Ponte sobre o Rio das Velhas | pontedo.html | Antiga ponte de estrutura metálica; liga comunidades e margens; ponto de contemplação do rio |
| `praca-joao-xxiii` | Praça João XXIII | praçajj.html | Um dos principais cartões-postais; revitalização recente; espaço moderno e multifuncional; fonte |
| `capela-nossa-senhora-das-dores` | Capela Nossa Senhora das Dores | capela.html | Origem da cidade (fazenda com capela); missas aos domingos às 8h; em 1910 os irmãos Moreira construíram uma nova capela em terreno doado |
| `igreja-matriz` | Igreja Matriz de Santo Hipólito | MATRIX.html | Principal templo católico; Rua Thieres Moreira, Centro; elementos tradicionais das igrejas mineiras; missas aos domingos às 19h |
| `praca-joao-velho` | Praça João Velho | velhoj.html | No núcleo urbano; ponto de encontro; atividades públicas municipais |
| `coreto` | Coreto | coreto.html | Joia da praça; tradição de música e encontros; cartão-postal |

**Eventos** (`/eventos/`)

| Slug | Título | Origem | Fatos a preservar |
| --- | --- | --- | --- |
| `forrozao` | Forrozão | forró.html | Anual; realizado pela prefeitura; entrada franca; atrações musicais; movimenta a economia local |
| `desfile-civico` | Desfile Cívico de 7 de Setembro | desfile.html | Independência; escolas, bandas e fanfarras, entidades e comunidade; consta no calendário de eventos turísticos de Minas Gerais |
| `corrida-de-argolinhas` | Corrida de Argolinhas | corrida.html | Tradição de origem medieval; cavaleiros com lança tentam tirar a argola; vence quem tira mais argolas; também é praticada em Claro dos Poções e Frei Gaspar |
| `quadrilha-dos-amigos` | Quadrilha dos Amigos | quadrilha.html | Arraiá dos Amigos; quadrilha tradicional na praça; canjica e quentão |
| `campeonato-regional` | Campeonato Regional de Futebol | camp.html | Reúne cidades da região; união e espírito esportivo |
| `campeonato-de-bairros` | Campeonato de Bairros | campB.html | Orgulho de cada bairro; incentivo à juventude |
| `encontro-dos-cachaceiros` | Encontro dos Cachaceiros | cachaça.html | Confraternização de moradores; 10ª edição em dezembro de 2018, divulgada pela página "SH City". **Sem fotos.** |

**Comunidades** (`/comunidades/`)

| Slug | Título | Origem | Fatos a preservar |
| --- | --- | --- | --- |
| `salobro` | Salobro | salobro.html | Zona rural; agricultura e pecuária; história ligada à estrada de ferro; cerca de 200 habitantes |
| `agua-boa` | Água Boa | aguaboa.html | Cerca de 200 habitantes; bioma Cerrado; diversidade cultural e presença indígena histórica; organização comunitária ativa |
| `valo-fundo` | Valo Fundo | valo.html | Distrito rural; Circuito Guimarães Rosa; Área de Proteção Ambiental (APA) com o seu nome; 136 habitantes; 60,43 km² (13,96% do território); Lei Estadual nº 2.764, de 30/12/1962 |
| `senhora-da-gloria` | Nossa Senhora da Glória | senhora.html | Distrito rural; antes chamado "Piçarrão" ou "Bom Jesus do Piçarrão"; nome dado por decreto-lei estadual de 1943; antes pertencia a Corinto |
| `caquende` | Caquende | caquente.html | Pequena comunidade; população humilde e cooperativa; cultura, fé e companheirismo. **Sem fotos.** |

**Comércios** (`/comercios/`)

| Slug | Título | Origem | Fatos a preservar |
| --- | --- | --- | --- |
| `ma-fitness` | MA Fitness | comer2.html | Loja de moda fitness; qualidade e atendimento |
| `imperio-store` | Império Store | comerce4.html | Moda; tendências; atendimento atencioso |
| `deposito-pereira` | Depósito Pereira | depósito.html | Rua Raimundo da Glória Caldeira, 80, Bairro Santa Rita, CEP 39210-000; cimento, areia, brita, blocos, tintas e ferramentas; entrega rápida |
| `bar-da-nega` | Bar da Nega | COMERCIO5.HTML | Comida, bebida gelada, clima de amizade; ponto de encontro |
| `varejao-mg` | Varejão MG | COMER3.HTML | Produtos frescos; comércio de proximidade |
| `padaria-jr` | Padaria e Lanchonete JR | padaria.html | Pães frescos; café da manhã e lanche da tarde; atendimento acolhedor |

Varejão MG e Padaria JR só usam fotos próprias, se existirem em `_legado`. Se não existirem, viram `card-type`.

**Contatos dos comércios** (decisão de 2026-11-10): a página de cada comércio mostra o telefone, o Instagram e o número do imóvel **quando dá para ler na foto da fachada**.

- O `info-card` ganha os botões "Ligar" (`tel:`) e "Instagram".
- Nada é adivinhado: o que estiver ilegível ou incerto fica de fora.
- Essa é a única exceção à regra de não acrescentar fatos novos (§8.1).

### 8.3 Contatos oficiais

Esses são os contatos que já estavam no site antigo:

- Instagram: `https://www.instagram.com/visite_santohipolito/`
- Facebook: `https://www.facebook.com/profile.php?id=100082786503942`
- WhatsApp: `https://wa.me/553899163019`, com mensagem padrão
- E-mail para fotos: `roberto133ro@gmail.com`

## 9. Mídia

### 9.1 Curadoria

- **`scripts/images.config.json`** é uma lista explícita de entradas `{ src, dest, alt, role }`. O `role` pode ser `cover`, `gallery`, `hero`, `orbit` ou `brand`.
- **Regras:**
  - só fotos reais do próprio lugar;
  - sem capas com texto gravado, colagens, posters do Canva ou duplicatas;
  - capas de preferência em paisagem;
  - corrigir tarjas pretas com `trim`.
- **Revisão:** os agentes revisam as cerca de 250 imagens por meio de folhas de miniaturas numeradas (contact sheets geradas com sharp).
- **Imagens fora do site:** as do `img/` que o site antigo não usava (posters e templates) ficam no `_legado`.

### 9.2 Pipeline (`npm run images`)

- **Tratamento:**
  - `sharp`: `.rotate()` (corrige a orientação EXIF) e `trim` opcional por entrada.
  - Redimensiona para 1600 e 800 px de largura, sem ampliar fotos menores.
  - Converte para WebP com qualidade 78 e esforço 5, sem metadados.
- **Arquivos gerados:**
  - `NN-1600.webp` e `NN-800.webp`;
  - `scripts/images.manifest.json` com `width` e `height` de cada saída, para preencher os atributos `width` e `height` no HTML.
- Pode rodar quantas vezes quiser: só refaz um arquivo quando a origem é mais nova que o destino.

### 9.3 Vídeo

- `ffmpeg-static`: H.264 em 720p, CRF 26, `+faststart`, ficando entre 3 e 6 MB. Se a origem tiver áudio, ele é mantido em AAC 96 kbps; se não tiver, o vídeo sai mudo (`-an`).
- Pôster: um frame em WebP.

### 9.4 Marca

O brasão já existe em PNG transparente. A partir dele saem:

- `img/brand/brasao-{96,192,512}.png`;
- os favicons (32, 180, 192 e 512);
- a imagem padrão de compartilhamento (Open Graph, 1200×630), uma foto recortada sem texto.

## 10. Acessibilidade, SEO e desempenho

**Acessibilidade**

- **Estrutura:**
  - Landmarks (`header`, `nav`, `main`, `footer`) e link "Pular para o conteúdo".
  - Um `h1` por página, com hierarquia de títulos correta.
- **Imagens:** `alt` descritivo em pt-BR; as decorativas recebem `alt=""`.
- **Contraste e toque:**
  - Foco visível: contorno de 2px em `--gold-500`, com 3px de afastamento.
  - Contraste AA, seguindo as regras do §5.1.
  - Áreas de toque de pelo menos 44px.
- **Interação e movimento:**
  - Menu e lightbox operáveis pelo teclado, com o foco preso dentro deles.
  - Vídeo sem som e com controles.
  - Todos os efeitos respeitam `prefers-reduced-motion`.

**SEO**

- **Títulos:** `<title>` no formato "Item · Santo Hipólito-MG", com até 60 caracteres. A categoria fica de fora do título porque o estouraria (ela aparece na trilha de navegação e no JSON-LD).
- **Metadados:**
  - Meta description única, com até 155 caracteres.
  - `lang="pt-BR"`, Open Graph e Twitter Card.
- **JSON-LD:**
  - Home: `City` e `TouristDestination`.
  - Pontos turísticos: `TouristAttraction`.
  - Comércios: `LocalBusiness`, com endereço só quando ele é conhecido.
  - Páginas internas: `BreadcrumbList`.
- **Indexação:** `robots.txt` sempre; `sitemap.xml` e canonical só quando `VITE_SITE_URL` estiver definido.

**Desempenho**

- **Fontes:** carregadas com `font-display: swap`, com preload da Poppins 800 (latin).
- **Imagens:**
  - Sempre com `width` e `height`.
  - `loading="lazy"`, exceto a do hero, que recebe `fetchpriority="high"`.
  - `decoding="async"`, `srcset` 800/1600 e `sizes`.
- **Vídeo:** `preload="none"`.
- **JS:**
  - Dividido por recurso, com `import()` sob demanda.
  - Animações só com `transform` e `opacity`, mais `will-change` só durante a animação.
  - Holofote e cursor só em dispositivos com mouse.

## 11. Verificação

1. `npm run build` termina sem erros.
2. `npm run check` (`scripts/check-site.mjs`) varre o `dist/**/*.html`:
   - todo `href`, `src` e `srcset` interno precisa existir;
   - nenhuma página pode ter os textos proibidos: `seu_perfil`, `seuemail`, `5500000000000`, `Desfile 1`, `upload.wikimedia`, `lorem`, `TODO`, `flaticon`, `remixicon`, `font-awesome`.
3. `html-validate` passa no `dist/`.
4. `npm run shots` (playwright-core usando o Chrome instalado) tira screenshots em 1440×900 e 390×844 da Home, de uma página de categoria, de uma de lugar e da 404. Elas são revisadas visualmente.
5. Lighthouse mobile, sobre o `vite preview`, na Home e em uma página de lugar.
6. Teste de teclado: link de pular conteúdo, menu, lightbox e seletor de temas do hero.

## 12. Fora do escopo

- CMS ou painel administrativo.
- Formulário com backend (o envio de fotos continua por e-mail).
- Modo escuro e outros idiomas.
- Mapa com coordenadas de cada ponto (fica só o link "Como chegar").
- Publicação e deploy (posso fazer depois, se você pedir).
- Horários de funcionamento dos comércios (não temos essa informação).

## 13. Itens em aberto

- **Domínio final:** necessário para o sitemap e para as URLs absolutas de compartilhamento. Basta preencher `VITE_SITE_URL`.
