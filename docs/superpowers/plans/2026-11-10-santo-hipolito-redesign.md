# Santo Hipólito — Redesign: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir o site de Santo Hipólito como site estático multi-página em Vite com HTML, CSS e JS puros, usando o sistema visual Verde Cerrado + Ouro e os efeitos GSAP inspirados na referência Carmed.

**Architecture:**
- Cada página é um `.html` real. As URLs são limpas, uma pasta por página.
- Cabeçalho, rodapé e blocos comuns entram por partials, via um plugin Vite próprio.
- Um CSS em camadas e um único `main.js`. Os módulos de efeito só inicializam quando o seletor deles existe na página; os pesados carregam por `import()`.
- A mídia sai do site antigo (`_legado/`) por scripts Node (sharp e ffmpeg-static).
- As 28 páginas de categoria e de lugar são geradas uma única vez por um scaffold, a partir de um copy deck em JSON. Depois disso, o HTML gerado passa a ser a fonte de verdade.

**Tech Stack:**
- Vite 8
- GSAP 3.15 (ScrollTrigger e SplitText)
- Lenis 1.3
- @fontsource: Poppins e Fraunces
- sharp 0.35 e ffmpeg-static 5
- Vitest com happy-dom
- html-validate
- playwright-core, usando o Chrome instalado na máquina

**Spec:** `docs/superpowers/specs/2026-11-10-santo-hipolito-redesign-design.md`

## Global Constraints

**Ambiente e dependências**
- Ambiente: Node 24, npm 11 e Windows com Git Bash.
- Os caminhos dentro de `_legado/` têm espaços e acentos. Scripts usam `path.join` ou `path.resolve` e nunca montam comando de shell com caminho sem aspas.
- Dependências do site: `vite@^8.3`, `gsap@^3.15`, `lenis@^1.3`, `@fontsource/poppins@^5.3` e `@fontsource-variable/fraunces@^5.3`.
- Dependências de desenvolvimento:
  - `vitest`, na versão compatível com o Vite 8 instalado;
  - `happy-dom`;
  - `sharp@^0.35`;
  - `html-validate`;
  - `playwright-core@^1.65`;
  - `ffmpeg-static@^5.3`.
- Qualquer dependência fora dessa lista precisa de justificativa na mensagem de commit.
- Nada de CDN em runtime: nada de Google Fonts, remixicon, font-awesome, flaticon ou esm.sh.

**Idioma e URLs**
- Todo o texto é em pt-BR, e toda página usa `<html lang="pt-BR">`.
- URLs internas são absolutas a partir da raiz e terminam em barra: `/eventos/forrozao/`.

**Cores** (`tokens.css`)

| Token | Valor |
| --- | --- |
| `--green-950` | `#0A2219` |
| `--green-900` | `#0E3024` |
| `--green-800` | `#123F2E` |
| `--green-700` | `#1B5640` |
| `--green-100` | `#E3EDE6` |
| `--gold-500` | `#E3A72F` |
| `--gold-300` | `#F2CF7E` |
| `--gold-700` | `#8A6210` |
| `--cream-50` | `#FFFDF8` |
| `--cream-100` | `#FBF7EE` |
| `--cream-200` | `#F4ECDA` |
| `--ink-900` | `#14201A` |
| `--ink-600` | `rgb(20 32 26 / .68)` |
| `--line` | `rgb(18 63 46 / .14)` |
| `--theme-natureza` | `#123F2E` |
| `--theme-rio` | `#0F4C5C` |
| `--theme-tradicao` | `#8C3B21` |
| `--theme-fe` | `#8A5D0E` |

- `--gold-500` nunca é usado como cor de texto sobre fundo creme; nesse caso use `--gold-700`.
- Sobre os fundos de tema, o texto é sempre creme.

**Fontes**
- Poppins nos pesos 400, 500, 600, 700 e 800, só no subset latin.
- Fraunces Variable itálico, usada apenas em `em.accent`.

**Movimento e mouse**
- Estados iniciais escondidos por animação só podem existir sob `html.motion-ok`.
- Se `window.__fxReady` ainda não existir 4000 ms depois do carregamento, o script inline de boot remove `motion-ok`. Isso garante que a página aparece mesmo se o JS falhar.
- Com `prefers-reduced-motion: reduce` não há Lenis, troca automática, scrub nem pin.
- Cursor, magnet, brilho do bento e prévia no hover só funcionam com `(hover: hover) and (pointer: fine)`.

**Imagens**
- WebP com qualidade 78 e esforço 5, nas larguras 1600 e 800, sem nunca ampliar.
- `.rotate()` para corrigir a orientação EXIF, sem metadados.
- Todo `<img>` tem `alt`, `width`, `height` e `decoding="async"`.
- Todo `<img>` usa `loading="lazy"`, menos a imagem do hero, que usa `fetchpriority="high"`.

**SEO**
- `<title>` no formato `"<Item> · Santo Hipólito-MG"`, com até 60 caracteres.
- Meta description com 50 a 155 caracteres.
- Exatamente um `h1` por página.

**Textos proibidos e regras de copy**
- Textos proibidos no `dist/`:
  - `seu_perfil`, `seuemail`, `5500000000000`;
  - `Desfile 1`, `upload.wikimedia`, `lorem`, `TODO`;
  - `flaticon`, `remixicon`, `font-awesome`.
- Nenhum caractere `\p{Extended_Pictographic}`. Separadores e ícones são SVG ou CSS.
- Copy sem emojis, sem "Parabéns ao…" e sem especulação.
- Nenhum fato novo além dos contatos legíveis nas fachadas dos comércios (spec §8.2).

**Contatos oficiais**
- Instagram: `https://www.instagram.com/visite_santohipolito/`
- Facebook: `https://www.facebook.com/profile.php?id=100082786503942`
- WhatsApp: `https://wa.me/553899163019`
- E-mail para fotos: `roberto133ro@gmail.com`

**Links e git**
- Todo `target="_blank"` leva `rel="noopener noreferrer"`.
- O trabalho fica na branch `redesign/site-moderno`.
- Pelo menos um commit por tarefa. A mensagem é em pt-BR e termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Celular estreito (390 px) com títulos e palavras gigantes.** Casos críticos: "Capela Nossa Senhora das Dores", "Rio das Velhas", marquees e as fotos em órbita. Nenhuma página pode ter rolagem horizontal.
   - **Onde é testado:** `fitFontSize` (Task 4), `screenshots.mjs --check-overflow` (Task 1) e a rodada completa da Task 13.
2. **Sem JS ou com movimento reduzido.** Todo o conteúdo fica visível e os contadores mostram o valor final.
   - **Onde é testado:** teste de escopo do `motion-ok` (Task 2), teste do boot com o mecanismo de segurança dos 4 s (Task 3), contadores em modo reduzido (Task 4) e screenshots reduzidos (Task 13).
3. **Toque, sem hover.** Os cards, o bento e a lista de eventos são `<a href>` reais e funcionam no primeiro toque.
   - **Onde é testado:** testes com `finePointer()` falso para o cursor (Task 3) e para a prévia no hover (Task 4), mais as verificações de href (Tasks 9 e 11).
4. **Fotos de celular.** Fotos em retrato com EXIF, originais com menos de 800 px e tarjas pretas de miniatura do YouTube precisam sair com orientação correta, sem ampliação e com `width`/`height` reais.
   - **Onde é testado:** testes do pipeline (Task 6).
5. **Teclado.** O link "Pular para o conteúdo", o menu mobile e o lightbox prendem o foco e devolvem o foco ao fechar.
   - **Onde é testado:** testes do menu (Task 3) e do lightbox (Task 5), mais o `keyboard-check.mjs` (Task 13).

## Contratos compartilhados

Cada tarefa vê só a si mesma. Os nomes desta seção são a fonte de verdade para todas.

### Páginas

Todas as páginas seguem esta estrutura:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <!-- @include head -->
  <title>…</title>
  <meta name="description" content="…">
  <meta property="og:title" content="…">
  <meta property="og:description" content="…">
  <meta property="og:image" content="/og/….jpg">
  <script type="application/ld+json">…</script>
</head>
<body data-page="home|pontos-turisticos|eventos|comunidades|comercios|erro" data-header-theme="over-dark|light">
  <!-- @include header -->
  <main id="conteudo" tabindex="-1"> … <!-- @include cta-fotos --> </main>
  <!-- @include footer -->
</body>
</html>
```

**Partials** (`partials/<nome>.html`)

| Partial | Dono | Conteúdo |
| --- | --- | --- |
| `head` | Task 2 | meta charset e viewport, `<!-- @include boot -->`, favicons, manifest, `theme-color #123F2E`, `og:site_name`, `og:locale pt_BR`, `twitter:card summary_large_image`, `<link rel="stylesheet" href="/src/styles/main.css">`, `<script type="module" src="/src/main.js">` |
| `boot` | Task 3 | Script inline com as classes `js`/`motion-ok` e o mecanismo de segurança |
| `header` | Task 2 | Header e menu mobile |
| `footer` | Task 2 | Rodapé |
| `cta-fotos` | Task 2 | Bloco "envie suas fotos" |

**Classes no `<html>`:** `js`, `motion-ok`, `intro-on`, `has-cursor` e `menu-open`.

**Partial `header`:**

- `a.skip-link[href="#conteudo"]` com o texto "Pular para o conteúdo".
- `header.site-header[data-header]` > `.site-header__inner.container`, contendo:
  - `a.site-header__brand[href="/"]`, com `img.site-header__crest` (`/img/brand/brasao-96.png`, 96×96, `alt=""`) e `span.site-header__name`, que contém "Santo Hipólito" e `small.site-header__sub` ("Minas Gerais");
  - `nav.site-nav[aria-label="Principal"]`, com `a.site-nav__link[data-nav=<page>]` para as 4 categorias;
  - `button.site-header__toggle[data-menu-toggle][aria-controls="menu-mobile"][aria-expanded="false"][aria-label="Abrir menu"]`.
- `div.menu-mobile#menu-mobile[data-menu][hidden]`, contendo:
  - `nav`, com `a.menu-mobile__link[data-nav]` > `span.menu-mobile__index` ("01"…"05"). A ordem é Início, Pontos turísticos, Eventos, Comunidades e Comércios;
  - `.menu-mobile__social`.

**Partial `footer`:**

- `footer.site-footer`, contendo:
  - `.site-footer__top`: brand e `p.site-footer__tagline` ("Natureza tranquila, alma mineira e calor humano.");
  - `.site-footer__cols`: três `.site-footer__col` com `h2` e `ul`:
    - Explore: as 4 categorias;
    - A cidade: `/#historia`, `/#numeros` e `/#video`;
    - Contato: Instagram, Facebook, WhatsApp e e-mail;
  - `p.site-footer__wordmark[data-fit-text][aria-hidden="true"]` ("Santo Hipólito");
  - `.site-footer__bottom`: "© 2026 Santo Hipólito — Minas Gerais" e `button.to-top[data-to-top][aria-label="Voltar ao topo"]` > `svg.to-top__ring` > `circle.to-top__progress` (r=22).

**Partial `cta-fotos`:**

- `section.cta-fotos.section.section--warm[aria-labelledby="cta-fotos-titulo"]`, contendo:
  - `.eyebrow` ("Participe");
  - `h2#cta-fotos-titulo.cta-fotos__title[data-split]`: "Envie suas fotos e `<em class="accent">`faça parte`</em>` deste site.";
  - `.cta-fotos__actions`:
    - `a.btn.btn--primary[data-magnetic]`, que abre `mailto:roberto133ro@gmail.com?subject=Fotos%20para%20o%20site%20de%20Santo%20Hip%C3%B3lito`;
    - `a.btn.btn--ghost`, que abre o Instagram oficial.

### Classes de componentes (CSS: Task 2)

| Grupo | Classes |
| --- | --- |
| Layout | `.container` (usa `--edge`), `.section`, `.section--dark`, `.section--warm`, `.section-header`, `.section-header--center`, `.section-title`, `.lead`, `.grid-12`, `.visually-hidden` |
| Texto | `.eyebrow` (o ponto é `::before`), `em.accent` |
| Botões | `.btn`, `.btn--primary`, `.btn--gold`, `.btn--ghost`, `.btn--icon`, `.btn__label`, `.btn__icon` |
| Pequenos | `.chip`, `.arch` (moldura de arco: `border-radius: 999px 999px var(--r-md) var(--r-md)`) |
| Bento | `.bento[data-bento]` > `a.card-bento` > `.card-bento__media` (img), `.card-bento__body`, `.card-bento__label`, `.card-bento__title`, `.card-bento__text`, `.card-bento__arrow`; `.spotlight`, criado por JS |
| Cards | `.places-grid` > `a.card-place` > `.card-place__media`, `.card-place__index`, `.card-place__label`, `.card-place__title`, `.card-place__text`; `.card-place--more`; `a.card-type` > `.card-type__initial`, `.card-type__label`, `.card-type__title`, `.card-type__note` |
| Números | `.stats` > `.stat` > `.stat__number[data-count-to]` (`span.stat__value` e `span.stat__suffix`), `.stat__label` (`strong` e texto) |
| Pilares | `.pillars[data-pillars]` > `.pillar` > `.pillar__icon`, `.pillar__title`, `.pillar__text` |
| Informações | `.info-card` > `dl.info-card__list` > `div.info-card__row` (dt com svg, dd), `.info-card__actions` |
| Navegação | `nav.breadcrumb[aria-label="Você está em"]` > `ol` > `li` > `a` ou `span[aria-current="page"]` |
| Marquee | `.marquee[data-marquee]` > `.marquee__track` > `.marquee__item` e o separador `svg.marquee__sep` (`#star`) |
| Galeria | `.gallery[data-gallery]` > `a.gallery__item[data-gallery-item][href=<1600>][data-srcset]` > `img` |
| Lightbox | `dialog.lightbox`, criado por JS: `.lightbox__figure`, `.lightbox__img`, `.lightbox__caption`, `.lightbox__counter[aria-live="polite"]`, `.lightbox__btn--prev`, `--next`, `--close` |
| Vídeo | `.video-player[data-video]` > `video`, `.video-player__controls` > `button[data-video-toggle]` e `button[data-video-mute]` (opcional) |
| Linha do tempo | `.timeline[data-timeline]` > `.timeline__line` > `.timeline__progress`; `ol.timeline__list` > `li.timeline__item` > `.timeline__date`, `.timeline__title`, `.timeline__text` |
| Lista com prévia | `.hover-list[data-hover-preview]` > `a.hover-list__row[data-preview-src]` > `.hover-list__index`, `.hover-list__name`, `.hover-list__tag`, `.hover-list__arrow`; `.hover-preview`, criado por JS |
| Cursor e faíscas | Criados por JS: `.cursor-dot`, `.cursor-ring` > `.cursor-ring__label` (estados `is-link`, `is-label`, `is-hidden` e `is-down`) e `canvas.spark-canvas` |
| Decoração | `.orbs` > `.orb` |
| Seções | Os prefixos `.hero-themes`, `.brand-bar`, `.city`, `.video-section`, `.places-rail`, `.numbers`, `.history` e `.events` (Home), `.hub-hero` (categorias), `.page-hero` e `.page-hero--type` (lugares), `.detail-layout` e `.related` são de cada tarefa de página |

### Atributos de dados

| Atributo | Para que serve |
| --- | --- |
| `data-reveal` (`""` ou `"clip"`), `data-reveal-stagger` | Revelação ao rolar |
| `data-split`, `data-split-scrub`, `data-split-lines` | Títulos e linhas animados |
| `data-count-to`, `data-count-decimals`, `data-count-suffix`, `data-count-years-since="1963-03-01"` | Contadores |
| `data-parallax="0.15"` | Parallax |
| `data-marquee`, `data-marquee-speed` (px/s, padrão 80) | Faixa rolando |
| `data-bento` | Grade bento |
| `data-hover-preview`, `data-preview-src` | Lista com prévia no hover |
| `data-magnetic`, `data-magnetic-strength` (padrão 0.35) | Botão magnético |
| `data-cursor="Ver"` | Rótulo no cursor |
| `data-fit-text`, `data-fit-width` (padrão 0.92) | Texto que se ajusta à largura |
| `data-to-top`, `data-share`, `data-share-status` | Voltar ao topo e compartilhar |
| `data-menu-toggle`, `data-menu`, `data-header`, `data-nav` | Header e menu |
| `data-gallery`, `data-gallery-item` | Galeria |
| `data-video`, `data-video-toggle`, `data-video-mute` | Vídeo |
| `data-intro` | Intro da Home |
| `data-hero-themes`, com `button.hero-themes__tab[data-theme]` | Hero de temas. Atributos de cada botão: `data-theme-word`, `data-theme-color`, `data-theme-image` (1600), `data-theme-image-small` (800), `data-theme-alt` e `data-theme-orbits` (4 URLs de 800 separadas por vírgula). O botão ativo fica com `aria-pressed="true"`. |
| `data-horizontal`, `data-timeline`, `data-pillars`, `data-video-expand` | Coreografias da Home |

### Módulos JS (`src/js/`)

- **Núcleo:**
  - `core/gsap.js`: `export { gsap, ScrollTrigger, SplitText }`, com os plugins registrados uma única vez.
  - `core/motion.js`: `reducedMotion(): boolean`, `finePointer(): boolean` e `onMotionChange(cb): () => void`.
  - `core/smooth-scroll.js`: `initSmoothScroll(): Lenis | null`, `getLenis(): Lenis | null`, `scrollToTarget(target: string | Element | number, opts?: { offset?: number, immediate?: boolean }): void`, `lockScroll(): void` e `unlockScroll(): void`.
  - `core/dom.js`: `$(sel, root = document)` e `$$(sel, root = document): Element[]`.
- **Contrato dos módulos:** cada arquivo `ui/*.js` e `fx/*.js` exporta `init(): void` e não faz nada quando o seletor dele não existe na página.
- **Carregamento** (`src/main.js`, que a Task 1 escreve completo):

  | Modo | Módulos |
  | --- | --- |
  | Eager | `ui/header`, `ui/menu`, `ui/cursor`, `ui/spark`, `ui/magnet`, `ui/back-to-top`, `ui/share`, `fx/fit-text`, `fx/reveal`, `fx/split`, `fx/counters`, `fx/parallax`, `fx/marquee`, `fx/bento`, `fx/hover-preview` |
  | Lazy, por seletor | `[data-intro]` → `ui/intro`, `[data-hero-themes]` → `fx/hero-themes`, `[data-gallery]` → `ui/lightbox`, `[data-video]` → `ui/video`, `[data-video-expand]` → `fx/video-expand`, `[data-horizontal]` → `fx/horizontal`, `[data-timeline]` → `fx/timeline`, `[data-pillars]` → `fx/pillars` |

- **Ordem do boot:**
  1. `initSmoothScroll()`.
  2. Os módulos eager.
  3. Os módulos lazy, com `Promise.all`.
  4. `document.fonts.ready.then(() => ScrollTrigger.refresh())`.
  5. `window.__fxReady = true`.
  6. Em `pageshow`, se `event.persisted`, chamar `ScrollTrigger.refresh()`.
- **Evento:** `window.dispatchEvent(new CustomEvent('sh:intro-done'))` quando a intro termina ou é pulada.

### Dados de mídia e conteúdo

**`scripts/images.config.json`**

```json
{
  "semFotos": ["<slug>"],
  "entries": [{ "src": "", "dest": "", "alt": "", "role": "", "trim": false, "og": false }]
}
```

- `src` é relativo à raiz do projeto, por exemplo `_legado/coreto/coreto 23.jpg`.
- `role` pode ser `cover`, `gallery`, `hero`, `orbit` ou `brand`. `trim` e `og` são opcionais.

**Formatos de `dest`**

- Lugares: `<categoria>/<slug>/<NN>`, em que `NN` tem dois dígitos e `01` é sempre a capa (`cover`).
- Home: `home/<nome>`.

**`scripts/images.manifest.json`** (gerado)

```json
{ "<dest>": { "dest": "", "alt": "", "role": "",
  "large": { "url": "/img/<dest>-1600.webp", "width": 0, "height": 0 },
  "small": { "url": "/img/<dest>-800.webp", "width": 0, "height": 0 },
  "og": "/og/<dest com / trocada por ->.jpg" } }
```

O campo `og` só aparece quando a entrada tem `og: true`.

**`public/video/video.json`:** `{ "width", "height", "duration", "hasAudio", "sizeMB" }`.

**`content/inventario.json`** (Task 1): os 24 itens da spec §8.2, na ordem da spec, no formato `{ slug, categoria, titulo }`.

**`content/lugares.json`** (Task 8)

```json
{
  "categorias": { "<categoria>": { "nome": "", "singular": "", "intro": "", "descricao": "", "contagem": "" } },
  "lugares": [{
    "slug": "", "categoria": "", "titulo": "", "tipo": "", "resumo": "", "descricao": "",
    "lead": "", "paragrafos": [], "chips": [], "info": [{ "icone": "", "rotulo": "", "valor": "" }],
    "endereco": { "logradouro": "", "bairro": "", "cep": "" }
  }]
}
```

- `endereco` é opcional.
- `icone` é sempre um símbolo do `public/icons.svg`.

**`content/contatos-comercios.json`** (Task 7): `{ "<slug>": { "telefones"?: string[], "instagram"?: string, "numero"?: string } }`.

## Ordem e paralelismo

| Onda | Tarefas | Depende de |
| --- | --- | --- |
| 0 | Task 1 | — |
| 1 (em paralelo) | Tasks 2, 3, 6 e 8 | Task 1 |
| 2 (em paralelo) | Tasks 4 e 5 | Task 3 (e Task 2 concluída) |
| 2 | Task 7 | Task 6 |
| 3 | Task 9 | — |
| 4 | Task 10, depois Task 11 | — |
| 5 | Task 12 | — |
| 6 | Task 13 | — |

Tarefas da mesma onda não editam os mesmos arquivos.

---

### Task 1: Fundação — legado, Vite MPA, partials, marca, harness de testes e verificação

**Files:**
- **Mover:** todo o conteúdo atual da raiz vai para `_legado/`, exceto `.git`, `.gitignore` e `docs`.
- **Criar:**
  - Configuração: `package.json`, `vite.config.js` e `.htmlvalidate.json` (que estende `html-validate:recommended`).
  - Scripts: `scripts/lib/partials.mjs`, `scripts/lib/inputs.mjs`, `scripts/lib/check.mjs`, `scripts/lib/brand.mjs`, `scripts/check-site.mjs` e `scripts/screenshots.mjs`.
  - Conteúdo e página provisória: `content/inventario.json` e `index.html` (Home provisória que já passa no `check`).
  - Partials: `head.html`, `boot.html`, `header.html`, `footer.html` e `cta-fotos.html` em `partials/`, todos mínimos e sem referência a assets que ainda não existem.
  - `src/main.js` completo.
  - `src/styles/main.css` importando, nesta ordem: `reset`, `tokens`, `fonts`, `base`, `layout`, `components`, `utilities`, `sections/hub`, `sections/detail`, `sections/home`, `sections/error`, mais `lenis/dist/lenis.css`. Os arquivos importados são criados vazios, cada um com o seu bloco `@layer`.
  - Stubs de todos os módulos do contrato, cada um exportando `export function init() {}`.
  - Os assets de marca em `public/`.
  - `public/robots.txt` (`User-agent: *` / `Allow: /`).
  - `public/site.webmanifest`: `name` "Santo Hipólito — Minas Gerais", `short_name` "Santo Hipólito", `lang` "pt-BR", `theme_color` `#123F2E`, `background_color` `#FBF7EE` e os ícones `/icon-192.png` e `/icon-512.png`. Ele nasce aqui porque o `head` aponta para ele desde a Task 2.
- **Modificar:** `.gitignore`, acrescentando `.shots/`.
- **Testes:** `tests/scripts/partials.test.mjs`, `inputs.test.mjs`, `check.test.mjs` e `brand.test.mjs`.

**Interfaces:**

- **Produces:**
  - `expandIncludes(html: string, readPartial: (name: string) => string, depth = 0): string`. Faz casar `<!--\s*@include\s+([a-z0-9-]+)\s*-->`. Erros: `Partial "<nome>" não encontrado` e `Include aninhado demais (máx. 2)`.
  - `partialsPlugin(options?: { dir?: string }): import('vite').Plugin`. Usa `transformIndexHtml` com ordem `pre` e dá full-reload no dev quando um arquivo de `partials/` muda.
  - `discoverInputs(root: string): Record<string, string>`.
    - As chaves são POSIX sem `.html`: `"index"`, `"404"`, `"eventos/index"`, `"eventos/forrozao/index"`.
    - Diretórios ignorados: `node_modules`, `dist`, `_legado`, `partials`, `docs`, `public`, `scripts`, `src`, `tests`, `styleguide`, `content`, `.git` e `.shots`.
  - `checkHtml({ file, html, exists }): string[]`. `file` é relativo ao `dist`, por exemplo `eventos/forrozao/index.html`. `exists(urlPath)` recebe caminhos como `/img/a.webp` ou `/eventos/`.
  - `generateBrandAssets(srcPng: string, publicDir: string): Promise<string[]>`. Gera:

    | Arquivo | Tamanho |
    | --- | --- |
    | `favicon-32.png` | 32 |
    | `apple-touch-icon.png` | 180, sobre fundo `#FBF7EE` |
    | `icon-192.png` | 192 |
    | `icon-512.png` | 512 |
    | `img/brand/brasao-96.png` | 96 |
    | `img/brand/brasao-192.png` | 192 |
    | `img/brand/brasao-512.png` | 512 |

    Todos ficam com o fundo transparente, exceto o `apple-touch-icon`.
  - **CLIs:**
    - `node scripts/check-site.mjs [dist]` imprime `<arquivo>: <problema>` para cada problema, sai com código 1 se houver algum e, se não houver, imprime `0 problemas em N páginas`.
    - `node scripts/screenshots.mjs --pages "/,/eventos/" [--all] [--dev] [--reduced] [--check-overflow] [--out .shots]`.
  - **Scripts npm:**

    | Script | Comando |
    | --- | --- |
    | `dev` | `vite` |
    | `build` | `vite build` |
    | `preview` | `vite preview` |
    | `test` | `vitest run` |
    | `check` | `node scripts/check-site.mjs dist` |
    | `shots` | `node scripts/screenshots.mjs` |
    | `images` | `node scripts/optimize-images.mjs` |
    | `video` | `node scripts/compress-video.mjs` |
    | `sheets` | `node scripts/contact-sheets.mjs` |
    | `scaffold` | `node scripts/scaffold-pages.mjs` |

- [ ] **Step 1: Mover o legado**
  1. Criar `_legado/` e mover para lá cada entrada da raiz, exceto `.git`, `.gitignore` e `docs`.
  2. Conferir: `ls -A` na raiz mostra só `.git`, `.gitignore`, `_legado` e `docs`.
  3. Conferir que `git status` continua limpo, já que o legado é ignorado.

- [ ] **Step 2: Instalar as dependências**
  1. Rodar `npm view vitest peerDependencies` e escolher a versão do Vitest que aceita `vite@8`.
  2. Rodar `npm init -y` e instalar as dependências da lista de Global Constraints.
  3. No `package.json`, definir `"type": "module"` e `"private": true`.

- [ ] **Step 3: Escrever os testes que devem falhar**

```js
// tests/scripts/partials.test.mjs
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

// tests/scripts/inputs.test.mjs — árvore temporária criada em os.tmpdir():
// index.html, 404.html, eventos/index.html, eventos/forrozao/index.html,
// _legado/x/index.html, partials/header.html, node_modules/a/index.html, styleguide/index.html
it('descobre só as páginas do site', () =>
  expect(Object.keys(discoverInputs(tmp)).sort()).toEqual(['404', 'eventos/forrozao/index', 'eventos/index', 'index']))

// tests/scripts/check.test.mjs — base: HTML válido com lang pt-BR, title de 20 caracteres,
// description de 80 caracteres e um h1; exists = p => ['/eventos/', '/img/a.webp'].includes(p)
it('aceita página válida', () => expect(checkHtml({ file: 'index.html', html: ok, exists })).toEqual([]))
it('acusa href interno quebrado', () => expect(run('<a href="/nada/">x</a>')).toContainEqual(expect.stringMatching(/\/nada\//)))
it('acusa candidato de srcset inexistente', () => expect(run('<img src="/img/a.webp" srcset="/img/b.webp 800w" alt="" width="1" height="1">')).toContainEqual(expect.stringMatching(/b\.webp/)))
it('acusa textos proibidos', () => expect(run('<a href="https://wa.me/5500000000000">x</a>').length).toBe(1))
it('acusa 0 ou 2 h1', ...)                                   // h1 removido; h1 duplicado
it('acusa img sem alt, width ou height', ...)
it('acusa target _blank sem rel noopener', ...)
it('acusa emoji', () => expect(run('<p>Força 💪</p>')).toContainEqual(expect.stringMatching(/emoji/i)))
it('acusa âncora local sem id correspondente', () => expect(run('<a href="#zzz">x</a>')).toContainEqual(expect.stringMatching(/#zzz/)))
it('acusa title com mais de 60 ou description fora de 50–155', ...)
it('acusa lang diferente de pt-BR', ...)
it('ignora http(s), mailto, tel e data:', ...)

// tests/scripts/brand.test.mjs — PNG transparente 500×500 gerado com sharp em tmp
it('gera os 7 arquivos com os tamanhos certos', async () => { /* metadata de cada saída: favicon-32 → 32×32, brasao-96 → 96×96… */ })
```

- [ ] **Step 4: Rodar `npm test`.** Esperado: FAIL, porque os módulos ainda não existem.

- [ ] **Step 5: Implementar `partials.mjs`, `inputs.mjs`, `check.mjs` e `brand.mjs`**
  - O `check.mjs` examina `href` e `src` de `a`, `link`, `script`, `img`, `source`, `video` (incluindo `poster`) e `use`. O fragmento é removido antes de checar se o arquivo existe; um caminho que termina em `/` é testado como `<caminho>index.html`.
  - Textos proibidos e o limite de title e description seguem as Global Constraints.
  - Emojis são detectados com `/\p{Extended_Pictographic}/u`, aplicado ao texto sem as tags.

- [ ] **Step 6: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 7: Escrever o `vite.config.js`**
  - `appType: 'mpa'` e `plugins: [partialsPlugin()]`.
  - Entradas de `discoverInputs(root)`, em `build.rolldownOptions.input` se esse campo existir nos tipos do Vite instalado; senão, em `build.rollupOptions.input`.
  - `server.watch.ignored: ['**/_legado/**', '**/.shots/**', '**/dist/**']`.
  - `optimizeDeps.entries: ['index.html', '404.html', '*/index.html', '*/*/index.html', '!_legado/**', '!node_modules/**', '!dist/**']`, para que o Vite não varra os HTML do `_legado`. Conferir com `npm run dev` que nenhum aviso cita `_legado`.
  - `test: { include: ['tests/**/*.test.{js,mjs}'] }`.

- [ ] **Step 8: Criar o esqueleto**
  - Stubs dos módulos e o `main.js` completo, seguindo o contrato.
  - O `main.css` com os imports e os partials mínimos:
    - `head.html` contém `<!-- @include boot -->`;
    - `boot.html` só faz `document.documentElement.classList.add('js')`.
  - O `inventario.json` e o `index.html` provisório.
  - Rodar `generateBrandAssets('_legado/capa/sh_caodsdd__1_-removebg-preview.png', 'public')` por meio de um `node -e` que importa `brand.mjs`.

- [ ] **Step 9: Escrever os dois CLIs**
  - **`check-site.mjs`:** varre `dist/**/*.html` com `checkHtml`, sendo que `exists` consulta o próprio `dist`.
  - **`screenshots.mjs`:**
    - **Navegador e servidor:** usa `chromium.launch({ channel: 'chrome' })` do playwright-core. O servidor é o `preview()` da API do Vite, ou `createServer()` com `--dev`, numa porta livre.
    - **Viewports:** `desktop` 1440×900, `tablet` 768×1024 e `mobile` 390×844 (os três exigidos pela spec §2). `--viewports desktop,mobile` limita a lista.
    - **Com `--reduced`:** contexto `reducedMotion: 'reduce'` e screenshot `fullPage` salva como `<nome>-<vp>-reduced.png`.
    - **Sem `--reduced`:** para cada posição 0, 25, 50, 75 e 100% de `scrollHeight`, rola com `window.scrollTo`, espera 900 ms e salva `<nome>-<vp>-s<N>.png`.
    - **Com `--check-overflow`:** em cada página e viewport, avalia `document.documentElement.scrollWidth > innerWidth + 1`; no fim, lista as páginas com problema e sai com código 1 se houver alguma.
    - **Com `--all`:** as páginas vêm de `discoverInputs` sobre o `dist`.
    - **Nomes:** o caminho vira um slug com `-`, e `/` vira `home`.

- [ ] **Step 10: Verificar**
  1. `npm test`: PASS.
  2. `npm run build`: o `dist/index.html` não contém `@include` e já traz o markup do header.
  3. `npm run check`: `0 problemas em 1 páginas`.
  4. `npm run shots -- --pages / --check-overflow`: grava os PNGs em `.shots/` e sai com código 0.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "chore: fundação Vite MPA, partials, verificação e marca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Sistema visual — tokens, fontes, base, layout, componentes, ícones e partials

**Files:**
- **Modificar:**
  - `src/styles/reset.css`, `tokens.css`, `fonts.css`, `base.css`, `layout.css`, `components.css` e `utilities.css`;
  - os partials `head.html`, `header.html`, `footer.html` e `cta-fotos.html`.
- **Criar:**
  - `public/icons.svg`;
  - `scripts/lib/color.mjs`;
  - `styleguide/index.html`, uma página só de dev, fora do build, que mostra todos os componentes do contrato.
- **Testes:** `tests/scripts/contrast.test.mjs` e `tests/scripts/css-motion.test.mjs`.

**Interfaces:**
- **Consumes:** os contratos de página, de classes e de partials.
- **Produces:**
  - `contrastRatio(hexA: string, hexB: string): number` (WCAG 2.x) e `readTokens(css: string): Record<string, string>`. O `readTokens` lê `--nome: valor;`.
  - O sprite `icons.svg`, com os símbolos: `arrow-right`, `arrow-up-right`, `arrow-left`, `chevron-left`, `chevron-right`, `close`, `menu`, `instagram`, `facebook`, `whatsapp`, `mail`, `phone`, `map-pin`, `clock`, `calendar`, `ticket`, `share`, `play`, `pause`, `volume`, `volume-off`, `star`, `leaf`, `waves`, `church`, `users`, `sun` e `camera`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
// contrast.test.mjs — lê src/styles/tokens.css com readTokens
it.each([
  ['--gold-500', '--green-800', 4.5], ['--cream-100', '--green-800', 4.5],
  ['--gold-700', '--cream-100', 4.5], ['--ink-900', '--cream-100', 7],
  ['--cream-100', '--theme-natureza', 4.5], ['--cream-100', '--theme-rio', 4.5],
  ['--cream-100', '--theme-tradicao', 4.5], ['--cream-100', '--theme-fe', 4.5],
])('%s sobre %s ≥ %s', (a, b, min) => expect(contrastRatio(t[a], t[b])).toBeGreaterThanOrEqual(min))
it('calcula contraste conhecido', () => expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1))

// css-motion.test.mjs — varre src/styles/**/*.css
it('estado inicial oculto só sob .motion-ok', () => {
  // todo bloco cujo seletor contém [data-reveal, [data-split ou [data-split-lines
  // e declara opacity: 0 ou visibility: hidden precisa ter todos os seletores iniciando por `.motion-ok`
})
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar `color.mjs` e os tokens**
  - Valores das Global Constraints.
  - Tipografia, layout, forma e movimento conforme a spec §5.1.

- [ ] **Step 4: Escrever `fonts.css`**
  1. Importar `@fontsource/poppins/latin-{400,500,600,700,800}.css` e o CSS de itálico da Fraunces Variable. Conferir o nome exato do arquivo em `node_modules/@fontsource-variable/fraunces/` (por exemplo `wght-italic.css`).
  2. No `head.html`, fazer o preload de `/node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2`.
  3. Rodar o build e conferir que o `href` do preload é igual à URL do `@font-face` 800. Se não for, remover o preload.

- [ ] **Step 5: Escrever `base.css`, `layout.css`, `components.css` e `utilities.css`**
  - **`base.css`:**
    - Fundo creme e texto `--ink-900`; títulos com peso 800 e letter-spacing −0,045em.
    - `em.accent` em Fraunces itálico, peso 500, sem herdar o tracking negativo.
    - `::selection` em `--gold-300`.
    - `:focus-visible` com contorno de 2px em `--gold-500` e 3px de afastamento.
    - `.skip-link`, que aparece no foco.
    - Barra de rolagem fina, verde e dourada.
    - Grão em `body::after` com ruído SVG, opacidade .06 e `pointer-events: none`.
    - `@view-transition { navigation: auto; }` dentro de `@media (prefers-reduced-motion: no-preference)`.
    - `html.has-cursor *` com `cursor: none`, exceto em `input`, `textarea` e `select`.
  - **`components.css`:**
    - Todas as classes do contrato.
    - `.btn--primary` com `::after` em `--green-800`, de `translateX(-101%)` para `0` no hover, em .5s com `--ease-out`.
    - O brilho do bento em `::after`, com `radial-gradient` posicionado por `--glow-x`/`--glow-y` e opacidade por `--glow-intensity`, recortado só na borda (máscara `content-box` exclude).
    - Os estados iniciais `.motion-ok [data-reveal]`, ocultos.

- [ ] **Step 6: Escrever o markup final dos partials**
  - Seguir o contrato.
  - Ícones por `<svg aria-hidden="true"><use href="/icons.svg#nome"/></svg>`.
  - Header claro ou escuro conforme `body[data-header-theme]`; com `.site-header.is-scrolled`, fica com o vidro creme.
  - Header e cards em mobile, a partir de 390 px.

- [ ] **Step 7: Montar o styleguide**
  - Uma seção para cada componente, cobrindo os dois modos de header.
  - Usa o `cta-fotos` e o footer reais.

- [ ] **Step 8: Verificar**
  1. `npm test`: PASS.
  2. `npm run build && npm run check`: 0 problemas.
  3. `npm run shots -- --dev --pages /styleguide/ --check-overflow`, depois abrir os PNGs e conferir:
     - a escala de títulos;
     - o hover simulado do botão (há uma classe `.is-hover` de demonstração);
     - o contraste;
     - a ausência de overflow em 390 px.

- [ ] **Step 9: Commit**: `feat(ui): sistema visual Verde Cerrado + Ouro, ícones e partials`

---

### Task 3: JS núcleo e UI global

**Files:**
- **Modificar:**
  - `src/js/core/gsap.js`, `motion.js`, `smooth-scroll.js` e `dom.js`;
  - `src/js/ui/header.js`, `menu.js`, `cursor.js`, `spark.js`, `magnet.js` e `back-to-top.js`;
  - `partials/boot.html`.
- **Testes:** `tests/js/motion.test.js`, `header.test.js`, `menu.test.js`, `back-to-top.test.js`, `cursor.test.js` e `boot.test.js`. Todos começam com `// @vitest-environment happy-dom`.

**Interfaces:**
- **Consumes:** o markup do contrato para `header`, `menu-mobile` e `to-top`.
- **Produces:**
  - Todas as funções `core/*` do contrato;
  - `headerState({ y, lastY, scrolledAfter = 40, hiddenAfter = 400 }): { scrolled: boolean, hidden: boolean }`;
  - `markCurrent(root: ParentNode, page: string): void`, que marca `aria-current="page"` em `a[data-nav=<page>]`;
  - `createMenu({ toggle, panel, onOpen?, onClose? }): { open(): void, close(): void, isOpen(): boolean }`;
  - `ringOffset(progress: number, circumference: number): number`, com `progress` limitado entre 0 e 1;
  - `lerp(a: number, b: number, t: number): number`, em `ui/cursor.js`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
// motion.test.js — window.matchMedia mockado
it('reducedMotion lê prefers-reduced-motion', ...)
it('finePointer exige (hover: hover) and (pointer: fine)', ...)

// header.test.js
it.each([
  [{ y: 0, lastY: 0 }, { scrolled: false, hidden: false }],
  [{ y: 41, lastY: 0 }, { scrolled: true, hidden: false }],
  [{ y: 500, lastY: 450 }, { scrolled: true, hidden: true }],
  [{ y: 480, lastY: 500 }, { scrolled: true, hidden: false }],
  [{ y: 300, lastY: 200 }, { scrolled: true, hidden: false }],
])('headerState(%o)', (input, out) => expect(headerState(input)).toEqual(out))
it('markCurrent marca só o link da página', ...)            // data-nav="eventos" → aria-current="page"; os outros sem o atributo

// menu.test.js — markup do contrato
it('open: aria-expanded=true, remove hidden, foca o 1º link e adiciona html.menu-open', ...)
it('Escape fecha e devolve o foco ao botão', ...)
it('Tab no último link volta para o primeiro (foco preso)', ...)
it('clicar num link fecha o menu', ...)

// back-to-top.test.js
it.each([[0, 100], [1, 0], [1.5, 0], [-1, 100], [0.25, 75]])('ringOffset(%s, 100) = %s', (p, o) => expect(ringOffset(p, 100)).toBe(o))

// cursor.test.js
it('não cria cursor quando finePointer() é falso', ...)    // nenhum .cursor-dot no body e html sem has-cursor
it('cria .cursor-dot e .cursor-ring e adiciona html.has-cursor com mouse e sem reduced', ...)

// boot.test.js — avalia o <script> extraído de partials/boot.html
it('adiciona js e motion-ok sem preferência de movimento reduzido', ...)
it('não adiciona motion-ok com reduce', ...)
it('remove motion-ok após 4000 ms se window.__fxReady não existir', ...)   // vi.useFakeTimers()
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL nos 6 arquivos.

- [ ] **Step 3: Implementar `core/*`**
  - `smooth-scroll`:
    - Lenis com `{ lerp: 0.1 }`, ligado por `lenis.on('scroll', ScrollTrigger.update)` e `gsap.ticker.add(t => lenis.raf(t * 1000))`, com `gsap.ticker.lagSmoothing(0)`.
    - Não cria nada quando `reducedMotion()` é verdadeiro.
    - Delegação de clique em `a[href^="#"]` e `a[href^="/#"]` da mesma página, chamando `scrollToTarget` com `offset` igual a menos a altura do header.
    - `lockScroll` e `unlockScroll` chamam `lenis.stop()`/`start()` e alternam `overflow: hidden` no `html`.

- [ ] **Step 4: Implementar `ui/*`**

  | Módulo | Comportamento |
  | --- | --- |
  | header | Classes `is-scrolled`/`is-hidden` via `headerState`, num listener de scroll limitado por rAF. `markCurrent` no `document`. |
  | menu | Usa `createMenu`. Com movimento permitido, os links entram com `stagger` de .06. Chama `lockScroll` e `unlockScroll`. Fecha ao passar de 900 px de largura. |
  | cursor | O anel segue o mouse com `lerp` .18 por rAF. O alvo é `closest('a,button,[data-cursor]')`; `[data-cursor]` ativa `is-label` e mostra o texto. |
  | spark | No `pointerdown`, 8 raios `#E3A72F` de 14 a 22 px, raio de 0 a 28 px em 400 ms, ajustados à densidade de pixels. Desligado com movimento reduzido. |
  | magnet | `gsap.quickTo` em x/y (.6s, `power3.out`), área com 60 px de folga. Força vem de `data-magnetic-strength`, com padrão .35. Volta ao lugar ao sair. |
  | back-to-top | Ganha `is-visible` a partir de 600 px. O anel com r=22 recebe `stroke-dashoffset` de `ringOffset(progresso, 2πr)`. O clique chama `scrollToTarget(0)`. |

- [ ] **Step 5: Escrever o `boot.html`**
  - É um IIFE inline que roda só se `document.documentElement` existir. Faz três coisas:
    1. adiciona a classe `js`;
    2. adiciona `motion-ok`, se não houver preferência por movimento reduzido;
    3. agenda `setTimeout(4000)`, que remove `motion-ok` se `window.__fxReady` não existir.
  - Tudo dentro de um try/catch.

- [ ] **Step 6: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 7: Verificar no navegador**
  1. `npm run build && npm run check`: 0 problemas.
  2. Screenshots do styleguide em s0 e s2: o header fica `is-scrolled` em s2.

- [ ] **Step 8: Commit**: `feat(js): núcleo (Lenis, GSAP, motion) e UI global (header, menu, cursor, faíscas, magnet, topo)`

---

### Task 4: Efeitos reutilizáveis

**Files:**
- **Modificar:**
  - `src/js/fx/fit-text.js`, `reveal.js`, `split.js`, `counters.js`, `parallax.js`, `marquee.js`, `bento.js` e `hover-preview.js`;
  - `styleguide/index.html`, acrescentando uma seção de demonstração para cada efeito.
- **Testes:** `tests/js/fit-text.test.js`, `counters.test.js`, `marquee.test.js`, `bento.test.js`, `hover-preview.test.js` e `reveal.test.js`.

**Interfaces:**
- **Consumes:** `core/gsap`, `core/motion` e `core/smooth-scroll` (Task 3); as classes da Task 2.
- **Produces:**
  - `fitFontSize(measured: number, base: number, target: number, { min = 16, max = 400 } = {}): number`, que devolve `clamp(base * target / measured, min, max)`;
  - `fitText(el: HTMLElement): void`;
  - `formatCount(value: number, { decimals = 0 } = {}): string`, em pt-BR;
  - `yearsSince(iso: string, now = new Date()): number`;
  - `setupMarquee(el: Element): { track: Element, clone: Element }`;
  - `glowIntensity(rect: { left, top, width, height }, x: number, y: number, radius: number): number`;
  - `previewSource(row: Element): string | null`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('fitFontSize escala para caber e respeita limites', () => {
  expect(fitFontSize(2000, 200, 1000)).toBe(100)
  expect(fitFontSize(100, 200, 1000, { max: 400 })).toBe(400)
  expect(fitFontSize(10000, 20, 100, { min: 16 })).toBe(16)
})
it('formatCount em pt-BR', () => {
  expect(formatCount(2717)).toBe('2.717')
  expect(formatCount(60.43, { decimals: 2 })).toBe('60,43')
})
it.each([['2026-11-10', 63], ['2027-02-28', 63], ['2027-03-01', 64]])
  ('yearsSince(1963-03-01, %s) = %s', (d, n) => expect(yearsSince('1963-03-01', new Date(`${d}T12:00:00`))).toBe(n))
it('com reduced motion o contador mantém o valor final do HTML', ...)        // .stat__value continua "2.717"
it('data-count-years-since escreve o valor calculado', ...)
it('setupMarquee duplica os itens, marca o clone com aria-hidden e tira os links do clone do Tab', ...)
it.each([[50, 50, 1], [400, 50, 0], [200, 50, 0.5]])
  ('glowIntensity em (%s,%s) = %s', (x, y, v) => expect(glowIntensity({ left: 0, top: 0, width: 100, height: 100 }, x, y, 200)).toBeCloseTo(v))
it('previewSource lê data-preview-src ou devolve null', ...)
it('hover-preview não cria .hover-preview sem finePointer e as linhas continuam <a href>', ...)
it('reveal com reduced motion não aplica estilo inline nos [data-reveal]', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar os 8 módulos**
  - Toda animação fica dentro de `gsap.matchMedia()`, na condição `(prefers-reduced-motion: no-preference)`.

  | Módulo | Comportamento |
  | --- | --- |
  | reveal | `ScrollTrigger.batch('[data-reveal]', start 'top 85%', once)`: y de 40 para 0 e opacidade de 0 para 1 em .9s, `expo.out`. Os filhos de `[data-reveal-stagger]` usam stagger .08. A variante `clip` vai de `inset(100% 0 0 0)` até `inset(0)`. |
  | split | SplitText `{ type: 'chars,words', aria: 'auto' }`. Entrada de `{ yPercent: 120, scaleY: 2.3, scaleX: .7, opacity: 0, transformOrigin: '50% 0%' }`, stagger .03, duração 1, `back.inOut(2)`, start `top 85%`. Com `data-split-scrub`: scrub entre `top bottom` e `bottom 60%`. `[data-split-lines]`: `{ type: 'lines', mask: 'lines', autoSplit: true }`, yPercent de 100 para 0, stagger .08, duração .9, `expo.out`. |
  | counters | Dispara uma vez em `top 85%`. Anima de 0 até o alvo em 2s, `power3.out`, escrevendo `formatCount` no `.stat__value`. |
  | parallax | `fromTo yPercent ±speed*100` com scrub, tendo o elemento pai como gatilho. |
  | marquee | O track recebe o clone e faz loop em x até −50%, com duração = largura / `data-marquee-speed`. `timeScale` = 1 + abs(velocidade do ScrollTrigger)/400, limitado a 4, com o sinal da direção do scroll e decaimento de .6s. Pausa no hover quando há mouse. |
  | bento | O `pointermove` no documento atualiza `--glow-x`, `--glow-y` e `--glow-intensity` com `glowIntensity(r, x, y, 300)`. O `.spotlight` (800 px, dourado, `mix-blend-mode: soft-light`) segue o mouse. Inclinação de ±6° com `transformPerspective` 900, que volta ao sair. Só com mouse. |
  | hover-preview | Duas `img` em crossfade, com pré-carregamento. A prévia segue o mouse com `quickTo` .5s e entra com escala de .9 para 1. Só com mouse. |
  | fit-text | `fitFontSize(scrollWidth, fontSize, parentWidth * data-fit-width)`. Roda em `resize` (debounce de 150 ms) e em `document.fonts.ready`. |

- [ ] **Step 4: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 5: Verificar**
  1. Demos no styleguide.
  2. `npm run shots -- --dev --pages /styleguide/` em s0 a s4: as revelações acontecem e os contadores chegam ao valor final.
  3. Com `--reduced`: tudo visível.
  4. `--check-overflow`: 0.

- [ ] **Step 6: Commit**: `feat(fx): reveal, split, contadores, parallax, marquee, bento, prévia no hover e fit-text`

---

### Task 5: Lightbox, vídeo e compartilhar

**Files:**
- **Modificar:** `src/js/ui/lightbox.js`, `video.js` e `share.js`.
- **Testes:** `tests/js/lightbox.test.js`, `video.test.js` e `share.test.js`.

**Interfaces:**
- **Consumes:** `lockScroll`/`unlockScroll`, `reducedMotion` e as classes de lightbox e de vídeo do contrato.
- **Produces:**
  - `createLightbox(items: Array<{ src: string, srcset?: string, alt: string }>): { el: HTMLDialogElement, open(i: number, opener?: HTMLElement): void, close(): void, next(): void, prev(): void, index(): number }`;
  - `init()` em `lightbox.js` lê `[data-gallery] a[data-gallery-item]`, usando o `href` como foto de 1600, o `data-srcset` e o `alt` da `img`;
  - `bindVideo(root: HTMLElement): void`;
  - `sharePage({ title, url }, nav = navigator): Promise<'shared' | 'copied' | 'failed'>`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('open(2) mostra o item 3, legenda = alt e contador "3 / 5"', ...)
it('next no último volta ao primeiro; prev no primeiro vai ao último', ...)
it('ArrowRight avança, ArrowLeft volta e Escape fecha', ...)
it('close devolve o foco ao elemento que abriu', ...)
it('clicar num a[data-gallery-item] abre no índice certo e impede a navegação', ...)
it('botões têm aria-label "Foto anterior", "Próxima foto" e "Fechar galeria"', ...)
it('toggle alterna aria-pressed e o rótulo "Pausar vídeo"/"Reproduzir vídeo"', ...)
it('mute alterna video.muted e aria-pressed; sem [data-video-mute] nada quebra', ...)
it('sharePage usa navigator.share quando existe → "shared"', ...)
it('sem share, copia com clipboard.writeText → "copied"', ...)
it('sem os dois, ou com erro → "failed"', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar**

  | Módulo | Comportamento |
  | --- | --- |
  | Lightbox | Usa `showModal()`, ou o atributo `open` como alternativa. Chama `lockScroll`. Swipe horizontal com limite de 50 px. Pré-carrega as fotos de i±1. Ao fechar, chama `unlockScroll` e devolve o foco. |
  | Vídeo | Um `IntersectionObserver` com limite .4 dá play quando o vídeo aparece, desde que o usuário não tenha pausado e não haja movimento reduzido, e pausa quando ele sai da tela. |
  | Compartilhar | `[data-share]` chama `sharePage({ title: document.title, url: location.href })` e escreve "Link copiado" em `[data-share-status]` (`aria-live`). |

- [ ] **Step 4: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 5: Commit**: `feat(ui): lightbox acessível, player de vídeo e compartilhar`

---

### Task 6: Pipeline de mídia

**Files:**
- **Criar:**
  - `scripts/lib/images.mjs`, `scripts/optimize-images.mjs`, `scripts/contact-sheets.mjs` e `scripts/compress-video.mjs`;
  - `scripts/images.config.json`, com o conteúdo inicial `{ "semFotos": [], "entries": [] }`.
- **Testes:** `tests/scripts/images.test.mjs` e `tests/scripts/contact-sheets.test.mjs`. As fixtures são geradas com sharp numa pasta temporária.

**Interfaces:**
- **Consumes:** o formato de config e de manifest do contrato.
- **Produces:**
  - `outputPaths(dest): { large: string, small: string }` (POSIX: `public/img/<dest>-1600.webp` e `public/img/<dest>-800.webp`);
  - `publicUrl(p): string` (`public/img/x.webp` → `/img/x.webp`);
  - `needsUpdate(srcMtimeMs: number, destMtimeMs: number | null): boolean`;
  - `processImage(entry, { root, force = false }): Promise<ManifestRecord>`. Com `og: true`, também grava `public/og/<dest com / trocada por ->.jpg`: 1200×630, recorte `cover` com `attention`, mozjpeg q80;
  - **CLIs:**
    - `npm run images [-- --force]`: concorrência 4; grava o manifest com as chaves ordenadas e imprime o total de arquivos e de MB;
    - `npm run sheets -- <dirs...> --out <dir>`;
    - `npm run video`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('outputPaths', () => expect(outputPaths('eventos/forrozao/01')).toEqual({
  large: 'public/img/eventos/forrozao/01-1600.webp', small: 'public/img/eventos/forrozao/01-800.webp' }))
it.each([[2000, null, true], [2000, 3000, false], [3000, 2000, true]])('needsUpdate(%s,%s)=%s', ...)
it('3000×2000 gera 1600×1067 e 800×533 com URLs /img/', ...)
it('600×400 não amplia: large 600×400 e small 600×400', ...)
it('EXIF orientation 6 (400×300) sai 300×400', ...)
it('trim remove tarjas pretas: 200×200 de conteúdo dentro de 400×200 preto sai 1:1', ...)
it('og: true grava /og/eventos-forrozao-01.jpg com 1200×630', ...)
it('não reprocessa quando o destino é mais novo, a não ser com force', ...)
it('contact-sheets: 13 imagens geram 2 folhas e um sheets.json numerado de 1 a 13', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar `images.mjs` e `optimize-images.mjs`**
  - Pipeline: `sharp(src).rotate()`, depois `.trim({ threshold: 20 })` se a entrada pedir, depois `resize({ width, withoutEnlargement: true })` e por fim `.webp({ quality: 78, effort: 5 })`. Metadados são removidos por padrão.
  - Uma entrada com `role: 'brand'` é ignorada pelo pipeline, porque a marca já vem da Task 1.

- [ ] **Step 4: Implementar `contact-sheets.mjs`**
  - Grade de 4×3, com miniaturas de 360×270 em recorte `cover`.
  - Cada miniatura leva uma faixa escura com o texto SVG `NN · <nome do arquivo>`.
  - Saída: `sheet-01.png`, `sheet-02.png` e assim por diante, mais `sheets.json` no formato `{ "1": "<caminho relativo à raiz>" }`.
  - Varre `.jpg`, `.jpeg`, `.png`, `.webp` e `.jfif` em todos os subdiretórios.

- [ ] **Step 5: Implementar `compress-video.mjs`**
  - Usa `ffmpeg-static` com `execFile`, nunca com uma string de shell.
  - Entrada: `_legado/video da city/Download.mp4`.
  - Lê largura, altura, duração e presença de áudio na saída de erro de `ffmpeg -i`.
  - Gera `public/video/santo-hipolito.mp4`:

    | Parâmetro | Valor |
    | --- | --- |
    | Escala | `-vf scale=-2:720`, ou `scale=720:-2` se o vídeo for vertical |
    | Vídeo | `-c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart` |
    | Áudio | `-c:a aac -b:a 96k` se houver áudio; senão `-an` |

  - Pôster: um frame aos 2 s, convertido para WebP de 1600 de largura com sharp, salvo em `public/video/santo-hipolito-poster.webp`.
  - Grava `public/video/video.json`.

- [ ] **Step 6: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 7: Rodar `npm run video`**
  - O arquivo de saída precisa ter entre 1 e 6 MB, e o `video.json` precisa ter `duration` maior que 0.
  - Se passar de 6 MB, subir o CRF para 28 e rodar de novo.

- [ ] **Step 8: Commit**: `feat(media): pipeline de imagens WebP, contact sheets e compressão de vídeo`. O commit inclui `public/video/*`.

---

### Task 7: Curadoria de fotos, contatos dos comércios e geração da mídia

**Files:**
- **Modificar:** `scripts/images.config.json`.
- **Criar:** `content/contatos-comercios.json`.
- **Gerar:** `public/img/**`, `public/og/**` e `scripts/images.manifest.json`.
- **Testes:** `tests/scripts/images-config.test.mjs` e `tests/scripts/contatos.test.mjs`.

**Interfaces:**
- **Consumes:** os CLIs da Task 6 e o `content/inventario.json`.
- **Produces:**
  - **No manifest:** as chaves de lugar e as chaves da Home abaixo.
  - **Lugares:** `<categoria>/<slug>/NN`.
  - **Chaves da Home:**

    | Chave | Papel | `og` |
    | --- | --- | --- |
    | `home/tema-natureza`, `home/tema-rio`, `home/tema-tradicao`, `home/tema-fe` | `hero` | — |
    | `home/orbita-<tema>-<1..4>` (16 chaves) | `orbit` | — |
    | `home/cat-pontos-turisticos`, `home/cat-eventos`, `home/cat-comunidades`, `home/cat-comercios` | `hero` | sim |
    | `home/cidade-matriz` | `hero` | — |
    | `home/numeros-fundo` | `hero` | — |
    | `home/og-default` | `hero` | sim |

  - **`semFotos`:** contém pelo menos `encontro-dos-cachaceiros` e `caquende`.
  - **`content/contatos-comercios.json`:** só com o que for legível.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('todo src existe no disco', ...)
it('dest segue <categoria>/<slug>/NN ou home/<nome>', ...)   // /^(pontos-turisticos|eventos|comunidades|comercios)\/[a-z0-9-]+\/\d{2}$|^home\/[a-z0-9-]+$/
it('cada slug do inventário tem exatamente uma capa NN=01 com og:true, ou está em semFotos', ...)
it('nenhuma foto é usada por dois lugares diferentes', ...) // vale só para os dests de categoria
it('alt tem de 10 a 125 caracteres e não começa com "Imagem", "Foto" ou "Desfile"', ...)
it('as chaves obrigatórias da Home existem, incluindo as 16 órbitas', ...)
it('no máximo 12 fotos por lugar', ...)
it('contatos: as chaves são slugs de comércio, os telefones casam com /^\\(\\d{2}\\) 9 \\d{4}-\\d{4}$/ e o instagram com /^[a-z0-9._]+$/', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL, porque a config ainda está vazia.

- [ ] **Step 3: Gerar as folhas de miniaturas e revisar todas**
  - Rodar `npm run sheets -- _legado --out .shots/sheets` e abrir cada folha com a ferramenta Read.
  - **Excluir colagens, capas com texto gravado e posters.** Candidatos prováveis, a confirmar vendo cada um:
    - todos os arquivos `capa/CAPA DOS *`;
    - `capa/capudoeee.png`, `capa/comercio capa de.png`, `capa/capa comercios 30ffff.png` e `capa/capa de  COMÉRCIOS.png`;
    - `capa/FDGFGFGHGFHJGHJGHJFGJH CAPA SDDS.png`, `capa/ponto turiticos capa.png` e `capa/santo hipolito.png`;
    - as capas de `eventos/` e `comunidades/`;
    - `img/COMU.png`, `img/PONTOS.png`, `img/COMÉRCIOS.png`, `img/Yellow Blue*` e `img/Design sem nome*`.
  - Excluir também quase-duplicatas.

- [ ] **Step 4: Preencher a config**
  - **Fotos de cada lugar:**
    - escolher a capa, de preferência em paisagem, nítida e representativa;
    - montar a galeria com até 12 fotos, a capa sempre como 01;
    - Corrida de Argolinhas: escolher as 12 melhores das 21;
    - usar `trim: true` nas fotos com tarja preta, como `PONTOS TURISTICOS/ppp2.jpg`;
    - Varejão MG e Padaria JR só usam fotos que sejam deles; se não houver nenhuma, entram em `semFotos`.
  - **Fotos da Home:**
    - temas:
      - natureza: paisagem verde ou cachoeira;
      - rio: o rio ou a ponte;
      - tradição: argolinhas, Forrozão ou quadrilha;
      - fé: a Matriz ou a capela;
    - 4 fotos de órbita do mesmo universo de cada tema;
    - uma capa por categoria;
    - a Matriz, para a seção A cidade;
    - uma paisagem larga para o fundo dos números;
    - uma paisagem larga para o `og-default`.
  - **Textos alternativos:** descritivos, em pt-BR, por exemplo "Fachada amarela da Igreja Matriz com a torre central".

- [ ] **Step 5: Ler os contatos nas fachadas**
  - Abrir em tamanho cheio as fotos de fachada de cada comércio.
  - Registrar só os telefones, o Instagram e o número do imóvel que estiverem legíveis. O que não for certeza fica de fora.

- [ ] **Step 6: Gerar e verificar**
  1. `npm run images`.
  2. `npm test`: PASS.
  3. `du -sh public`: 40 MB ou menos.
  4. Abrir 3 saídas aleatórias e conferir a orientação e o recorte.

- [ ] **Step 7: Commit**: `feat(media): curadoria das fotos, contatos dos comércios e mídia otimizada`

---

### Task 8: Copy deck (conteúdo)

**Files:**
- **Criar:** `content/lugares.json`.
- **Testes:** `tests/scripts/content.test.mjs`.

**Interfaces:**
- **Consumes:**
  - `content/inventario.json`;
  - os textos de `_legado/*.html`;
  - a spec, nos trechos §7.2 (as introduções, que entram exatamente como estão) e §8.
- **Produces:** o `content/lugares.json` no formato do contrato, com estas especificações:

  | Campo | Regra |
  | --- | --- |
  | `contagem` | "06 lugares", "07 eventos", "05 comunidades" ou "06 negócios" |
  | `tipo` | Rótulo curto, por exemplo "Igreja", "Praça", "Rio das Velhas", "Música", "Cívico", "Tradição", "Festa junina", "Esporte", "Confraternização", "Distrito", "Comunidade rural", "Moda", "Moda fitness", "Materiais de construção", "Bar", "Varejão" ou "Padaria e lanchonete" |
  | `resumo` | Até 140 caracteres |
  | `lead` | 2 ou 3 frases |
  | `paragrafos` | 2 ou 3 parágrafos curtos |
  | `chips` | Até 3 |
  | `info` | Só com dados conhecidos |

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('24 lugares com os slugs e a ordem do inventário; 6/7/5/6 por categoria', ...)
it('categorias: as intros são exatamente as da spec §7.2', () => expect(c['eventos'].intro).toBe('Música, fé, esporte e tradição ao longo de todo o ano.'))
it('campos obrigatórios e limites: resumo ≤ 140, descrição de 50 a 155, ≥ 2 parágrafos, ≤ 3 chips', ...)
it('título SEO "<titulo> · Santo Hipólito-MG" ≤ 60', ...)
it('nenhum emoji nem termo proibido', ...)   // /\p{Extended_Pictographic}/u, /parabéns/i, /possivelmente/i, /embora não tenha encontrado/i, /desfile \d/i, /matrix/i, /hulmilde/i, /disfile/i, /àgua/i, /caquente/i
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
])('%s preserva os fatos %j', (slug, fatos) => { /* texto = todos os campos concatenados; busca sem diferenciar maiúsculas */ })
it('info[].icone existe no sprite', ...)   // confere contra a lista de símbolos da Task 2
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Escrever o `lugares.json`**
  - Reescrever cada texto do legado em tom profissional e acolhedor, seguindo a spec §8.1.
  - Entram só os fatos da tabela §8.2.

- [ ] **Step 4: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 5: Commit**: `feat(conteudo): copy deck profissional dos 24 lugares e das 4 categorias`

---

### Task 9: Templates e páginas geradas (categorias e lugares)

**Files:**
- **Criar:**
  - `scripts/lib/templates.mjs` e `scripts/scaffold-pages.mjs`;
  - as páginas geradas: `pontos-turisticos/index.html` e 6 subpastas `<slug>/index.html`, `eventos/` (+7), `comunidades/` (+5) e `comercios/` (+6).
- **Modificar:** `src/styles/sections/hub.css` e `src/styles/sections/detail.css`.
- **Testes:** `tests/scripts/templates.test.mjs`.

**Interfaces:**
- **Consumes:**
  - o manifest e `semFotos` (Task 7);
  - `lugares.json` (Task 8);
  - `contatos-comercios.json` (Task 7);
  - as classes (Task 2) e os atributos (Tasks 4 e 5).
- **Produces:**
  - Utilitários:
    - `escapeHtml(s)`;
    - `seoTitle(titulo)`, que devolve `` `${titulo} · Santo Hipólito-MG` ``;
    - `mapsUrl(nome)`, que devolve `` `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome} Santo Hipólito MG`)}` ``;
    - `telHref('(38) 9 9817-7279')`, que devolve `'tel:+5538998177279'`.
  - Renderização:
    - `renderPicture(record, { sizes, loading = 'lazy', fetchpriority, className, alt })`;
    - `renderJsonLd(item, categoria)`;
    - `renderDetailPage(item, { categoria, images: { cover, gallery }, related, prev, next, contatos })`;
    - `renderHubPage(categoria, entries: Array<{ item, cover }>, { hero })`.
  - CLI `npm run scaffold -- [--force] [--only <slug>]`. Sem `--force`, não sobrescreve um arquivo que já existe; só avisa.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('renderPicture: src=1600, srcset "…-800.webp 800w, …-1600.webp 1600w", width/height da 1600, alt escapado, lazy e async', ...)
it('mapsUrl e telHref', () => {
  expect(mapsUrl('Coreto')).toBe('https://www.google.com/maps/search/?api=1&query=Coreto%20Santo%20Hip%C3%B3lito%20MG')
  expect(telHref('(38) 9 9817-7279')).toBe('tel:+5538998177279')
})
it('detalhe com fotos: um h1, data-page, includes header/footer/cta-fotos, trilha / → /<categoria>/, galeria com N itens, og:image = capa .og', ...)
it('JSON-LD: TouristAttraction (pontos), Place (comunidades), LocalBusiness com address (depósito), BreadcrumbList em todos; JSON válido', ...)
it('detalhe sem fotos: page-hero--type, sem data-gallery, com "Ainda não temos fotos"', ...)
it('comércio com contatos: tel: e Instagram com rel noopener', ...)
it('relacionados: 3, sem o próprio item; anterior e próximo dão a volta', ...)
it('hub: N cards com href /<categoria>/<slug>/, card-type para semFotos, chip com a contagem e data-header-theme="light"', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar `templates.mjs`**

  **Anatomia da página de lugar** (spec §7.3):

  | Bloco | Detalhes |
  | --- | --- |
  | Hero | `section.page-hero` com `.page-hero__media[data-parallax="0.12"]` (a imagem 1600 com `loading="eager"` e `fetchpriority="high"`) e `.page-hero__content` (trilha, `.eyebrow` com o nome da categoria, `h1[data-split]` e `.page-hero__chips`) |
  | Conteúdo | `section.detail-layout.grid-12`, com texto (`.lead[data-split-lines]` e os `p[data-reveal]`) e `aside` (`.info-card` com as linhas do `info`, o número do imóvel e os telefones, mais os botões "Como chegar", "Ligar", "Instagram" e "Compartilhar") |
  | Galeria | `section.gallery-section`, com `h2` "Galeria" e `.gallery[data-gallery]` (cada item com `data-reveal="clip"` e `data-cursor="Ver"`) |
  | Relacionados | `section.related` |
  | Header | `data-header-theme="over-dark"` no body |

  **Anatomia da página de categoria:**

  | Bloco | Detalhes |
  | --- | --- |
  | Hero | `section.hub-hero` com a trilha, a etiqueta "Santo Hipólito · <nome>", `p.hub-hero__word[data-fit-text][aria-hidden]`, `h1` (o nome da categoria), `.arch` com `home/cat-<categoria>`, a intro e o chip com a contagem |
  | Grade | `.places-grid`, com `card-place` ou `card-type`, sempre com `data-reveal` e `data-cursor="Ver"` |
  | Marquee | Os nomes dos itens |
  | Header | `data-header-theme="light"` no body |

  **Relacionados:** os 3 itens seguintes na ordem da categoria, voltando ao começo quando acaba.

- [ ] **Step 4: Rodar `npm test`.** Esperado: PASS.

- [ ] **Step 5: Implementar o CLI e gerar as páginas**
  1. Implementar `scaffold-pages.mjs`.
  2. Rodar `npm run scaffold -- --force`. Esperado: `28 páginas geradas`.

- [ ] **Step 6: Escrever o CSS**
  - `hub.css` e `detail.css`, em mobile a partir de 390 px.
  - No hero de lugar:
    - o gradiente sai de `--green-950` com 80% de opacidade na base;
    - o título usa `--fs-display` com `overflow-wrap: anywhere`.

- [ ] **Step 7: Verificar**
  1. `npm run build && npm run check`: 0 problemas em 29 páginas.
  2. `npm run shots -- --pages "/eventos/,/eventos/forrozao/,/comercios/deposito-pereira/,/comunidades/caquende/" --check-overflow`: 0 páginas com overflow.
  3. Revisar os PNGs, em desktop e mobile.

- [ ] **Step 8: Commit**: `feat(paginas): templates, scaffold e 28 páginas de categoria e lugar`

---

### Task 10: Home, parte 1 — intro, hero de temas, faixa do brasão, A cidade e vídeo

**Files:**
- **Modificar:**
  - `index.html`, que substitui a página provisória, com as seções 0 a 4 da spec §7.1;
  - `src/styles/sections/home.css`;
  - `src/js/ui/intro.js` e `src/js/fx/hero-themes.js`, `pillars.js` e `video-expand.js`.
- **Testes:** `tests/js/intro.test.js` e `tests/js/hero-themes.test.js`.

**Interfaces:**
- **Consumes:**
  - do manifest: `home/tema-*`, `home/orbita-*` e `home/cidade-matriz`;
  - `public/video/video.json`, que define se existe botão de som e a proporção do vídeo;
  - `fitFontSize`, `lockScroll`/`unlockScroll` e o evento `sh:intro-done`.
- **Produces:**
  - `shouldShowIntro(storage: Storage | null, reduced: boolean): boolean`. A chave é `sh-intro`. O retorno é falso se não houver storage, se o storage lançar erro, se a chave já existir ou se houver movimento reduzido;
  - `readThemes(root): Array<{ word, color, image, imageSmall, alt, orbits: string[] }>`;
  - `nextIndex(i: number, n: number, dir = 1): number`;
  - `applyTheme(root, theme, { instant }): void`;
  - no `<head>` do `index.html`, um script inline que põe `intro-on` quando `shouldShowIntro` seria verdadeiro, repetindo a mesma regra, para não piscar.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it.each([
  [{ getItem: () => null }, false, true], [{ getItem: () => '1' }, false, false],
  [{ getItem: () => null }, true, false], [null, false, false],
  [{ getItem: () => { throw new Error() } }, false, false],
])('shouldShowIntro', (s, r, out) => expect(shouldShowIntro(s, r)).toBe(out))
it('readThemes lê os 4 botões, cada um com 4 órbitas', ...)
it.each([[3, 4, 1, 0], [0, 4, -1, 3], [1, 4, 1, 2]])('nextIndex(%s,%s,%s)=%s', ...)
it('clicar no botão 2 marca aria-pressed só nele e troca a palavra; com reduced é instantâneo', ...)
it('sem troca automática com reduced motion', ...)   // vi.useFakeTimers(): avançar 7000 ms e o índice não muda
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar os módulos**

  **Intro**
  - Em cerca de 1,2 s, a contagem vai de 0 a 100 em `.intro__count`; depois `clip-path` de `inset(0)` para `inset(0 0 100% 0)` em .8s, `expo.inOut`.
  - Grava `sh-intro` no storage e dispara `sh:intro-done`.
  - Clique, toque ou Esc pulam a intro.

  **Hero de temas**

  | Momento | Animação |
  | --- | --- |
  | Entrada | Começa em `sh:intro-done` ou logo de cara, se não houver `intro-on`. Letras sobem de y 46 com stagger .03; o arco vai de `scale .9, y 80`; as órbitas chegam pelas laterais. |
  | Troca automática | A cada 6000 ms, mostrada por `.hero-themes__progress` (`scaleX`). Pausa em hover, foco ou aba oculta. |
  | Onda de cor | `scaleX` de 0 para 1 a partir da esquerda, .7s, `expo.inOut`. |
  | Letras | Saem até y −46 (.35s, stagger .02) e as novas entram (.6s, stagger .03, `back.out(1.6)`). |
  | Arco | `clip-path` de `inset(100% 0 0 0)` até `inset(0)`, .9s, `expo.out`. |
  | Órbitas | Trocam a imagem com `rotation: gsap.utils.random(-14, 14)`. |
  | Parallax do mouse | O palco move ±12 px e a palavra ∓6 px, por `quickTo` .8s. |
  | Tamanho da palavra | `fitFontSize` por tema. |

  **Pilares**
  - A partir de 1024 px e com movimento permitido, os cards 2 e 3 começam em y 60% e 120% e se empilham com scrub.
  - Fora disso, usam o reveal comum.

  **Vídeo**
  - Com o pin, `end '+=120%'` e scrub 1, o `clipPath` vai de `inset(6% 14% round 28px)` a `inset(0% 0% round 0px)`.
  - Desligado com movimento reduzido.

- [ ] **Step 4: Escrever o markup e o `home.css` das seções 0 a 4**
  - Seguir a spec §7.1.
  - Títulos exatamente como estão lá.
  - O texto de abertura e os pilares vêm do antigo `INDEX.HTML`, reescritos.
  - **Botões dos temas** ("01 Natureza", "02 Rio das Velhas", "03 Tradição" e "04 Fé"):
    - levam os atributos do contrato;
    - a cor de cada tema vem de `--theme-*`.
  - Botão magnético "Explorar a cidade" para `#a-cidade` e `h1.visually-hidden`.
  - **`<head>` do `index.html`:**
    - `<title>`: "Santo Hipólito-MG · Turismo, história e tradição" (47 caracteres).
    - Meta description com 50 a 155 caracteres.
    - `og:image` em `/og/home-og-default.jpg`.
    - JSON-LD `@graph` com `City` (`name` "Santo Hipólito", `containedInPlace` "Minas Gerais") e `TouristDestination`.
  - **Vídeo:** `<video muted loop playsinline preload="none" poster="/video/santo-hipolito-poster.webp" width height>`, com `width` e `height` tirados de `video.json`. O botão `[data-video-mute]` só entra se `hasAudio` for verdadeiro.

- [ ] **Step 5: Verificar**
  1. `npm test`: PASS.
  2. `npm run build && npm run check`: 0 problemas.
  3. `npm run shots -- --pages / --check-overflow` em s0 a s2, desktop e mobile, mais `--reduced`.
  4. Revisar o hero, a faixa, A cidade e o vídeo nos PNGs.

- [ ] **Step 6: Commit**: `feat(home): intro, hero de temas, faixa do brasão, A cidade e vídeo expansível`

---

### Task 11: Home, parte 2 — Explore, pontos, números, história, eventos e CTA

**Files:**
- **Modificar:** `index.html` (seções 5 a 10), `src/styles/sections/home.css`, `src/js/fx/horizontal.js` e `src/js/fx/timeline.js`.
- **Testes:** `tests/js/horizontal.test.js` e `tests/scripts/home.test.mjs`.

**Interfaces:**
- **Consumes:**
  - do manifest: `home/cat-*`, as capas de pontos e eventos e `home/numeros-fundo`;
  - os nomes e resumos de `lugares.json`;
  - `yearsSince`.
- **Produces:** `shouldPin(width: number, reduced: boolean): boolean`, verdadeiro com largura de 1024 ou mais e sem movimento reduzido.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it.each([[1023, false, false], [1024, false, true], [1440, true, false]])('shouldPin(%s,%s)=%s', ...)
// home.test.mjs — lê index.html
it('as seções aparecem na ordem: inicio, a-cidade, video, explore, pontos, numeros, historia, eventos', ...)
it('bento: 4 cards com href /pontos-turisticos/, /eventos/, /comunidades/ e /comercios/ e rótulos 06 lugares, 07 eventos, 05 comunidades e 06 negócios', ...)
it('pontos: 6 cards com href igual a cada ponto do inventário e um card-place--more para /pontos-turisticos/', ...)
it('números: data-count-to 2717, 430 e 270, e data-count-years-since="1963-03-01" mostrando 63', ...)
it('eventos: 7 linhas hover-list__row com href igual a cada evento do inventário e data-preview-src existente no manifest', ...)
it('linha do tempo: 5 itens com as datas Origens, 1910, 1943, 30/12/1962 e 1º/03/1963', ...)
it('head: title ≤ 60, og:image /og/home-og-default.jpg e JSON-LD que tem City e TouristDestination', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar os módulos**

  | Módulo | Comportamento |
  | --- | --- |
  | horizontal | Dentro de `gsap.matchMedia`: com `shouldPin` verdadeiro, desloca o `x` do track até `-(scrollWidth - innerWidth + edge)`, com pin, scrub 1 e `invalidateOnRefresh`. Fora disso, o CSS aplica `overflow-x: auto` com `scroll-snap`. |
  | timeline | `.timeline__progress` com `scaleY` de 0 a 1 e scrub; cada item ganha `is-active` (o ponto fica dourado) ao passar do centro. |

- [ ] **Step 4: Escrever o markup e o CSS das seções 5 a 10**
  - Seguir a spec §7.1, com os títulos exatamente como estão lá.
  - Incluir `<!-- @include cta-fotos -->` no fim do `main`.

- [ ] **Step 5: Verificar**
  1. `npm test`: PASS.
  2. `npm run build && npm run check`: 0 problemas.
  3. Screenshots da Home em s0 a s4, desktop e mobile, mais `--reduced` e `--check-overflow`: 0.
  4. Revisar os PNGs.

- [ ] **Step 6: Commit**: `feat(home): explore, pontos em scroll horizontal, números, história, eventos e CTA`

---

### Task 12: 404, SEO e publicação

**Files:**
- **Criar:**
  - `404.html` e `scripts/lib/seo.mjs`;
  - `vercel.json` (`{ "trailingSlash": true }`), `.env.example` (`VITE_SITE_URL=`) e `README.md`.
  - O `robots.txt` e o `site.webmanifest` já existem desde a Task 1; aqui eles só são validados.
- **Modificar:** `src/styles/sections/error.css` e `vite.config.js`, para registrar o `seoPlugin`.
- **Testes:** `tests/scripts/seo.test.mjs`.

**Interfaces:**
- **Produces:**
  - `injectSeo(html: string, { siteUrl, pagePath }): string`. Com `siteUrl`, faz três coisas:
    - acrescenta `<link rel="canonical">`;
    - acrescenta `og:url`;
    - torna absolutos os `og:image` relativos.

    Sem `siteUrl`, devolve o HTML como recebeu.
  - `buildSitemap(paths: string[], siteUrl: string): string`;
  - `seoPlugin({ siteUrl })`. No `closeBundle`, quando há `siteUrl`, grava `dist/sitemap.xml` e acrescenta `Sitemap: <url>/sitemap.xml` ao `dist/robots.txt`. O `siteUrl` vem de `loadEnv(mode, root, 'VITE_')`.

- [ ] **Step 1: Escrever os testes que devem falhar**

```js
it('injeta canonical e og:url absolutos', () => expect(injectSeo(h, { siteUrl: 'https://x.com', pagePath: '/eventos/' }))
  .toContain('<link rel="canonical" href="https://x.com/eventos/">'))
it('torna og:image absoluto', ...)            // content="/og/a.jpg" → content="https://x.com/og/a.jpg"
it('sem siteUrl não muda nada', ...)
it('buildSitemap lista as URLs com barra final', () => expect(buildSitemap(['/', '/eventos/'], 'https://x.com')).toContain('<loc>https://x.com/eventos/</loc>'))
it('site.webmanifest é JSON válido e os ícones existem em public/', ...)
```

- [ ] **Step 2: Rodar `npm test`.** Esperado: FAIL.

- [ ] **Step 3: Implementar**
  - **SEO:** `seo.mjs` e o plugin.
  - **404:** usa `data-page="erro"` e `data-header-theme="light"`, com "404" gigante em `[data-split]` e `[data-fit-text]` e o texto e os botões da spec §7.4.
  - **README, com estas seções:**
    - Requisitos;
    - Comandos;
    - Estrutura de pastas;
    - Como editar textos (o HTML é a fonte de verdade);
    - Como adicionar fotos (`_fotos/`, `images.config.json` e `npm run images`);
    - Como adicionar um lugar (copiar uma pasta, ou usar o scaffold com uma nova entrada no `lugares.json` e `--only`);
    - Publicar na Vercel (preset Vite, saída `dist`, `VITE_SITE_URL`);
    - Site antigo (`_legado/`).

- [ ] **Step 4: Verificar**
  1. `npm test`: PASS.
  2. `npm run build && npm run check`: 0 problemas em 30 páginas.
  3. `VITE_SITE_URL=https://exemplo.com.br npm run build` gera o `dist/sitemap.xml` com 29 URLs (o 404 fica fora). Rodar de novo `npm run build` sem a variável.

- [ ] **Step 5: Commit**: `feat(seo): página 404, SEO opcional por domínio, manifest e README`

---

### Task 13: QA final

**Files:**
- **Criar:** `scripts/keyboard-check.mjs`.
- **Modificar:** qualquer arquivo que precise de correção.

- [ ] **Step 1: Rodar a bateria completa**
  1. `npm test`.
  2. `npm run build`.
  3. `npm run check`.
  4. `npx html-validate "dist/**/*.html"`.

  Esperado: tudo PASS. Se for preciso relaxar uma regra do html-validate, justifique no `.htmlvalidate.json`.

- [ ] **Step 2: Rodar `npm run shots -- --all --check-overflow`**
  - Esperado: 0 páginas com overflow, em desktop e mobile.
  - Revisar todos os PNGs em busca de imagem faltando, texto sobreposto, contraste ruim e espaçamento inconsistente. Corrigir o que aparecer.

- [ ] **Step 3: Rodar `npm run shots -- --pages "/,/eventos/,/pontos-turisticos/coreto/,/404.html" --reduced`**
  - Esperado: todo o conteúdo visível e os contadores com o valor final.

- [ ] **Step 4: Rodar o Lighthouse mobile**
  - Com o `npm run preview` no ar, rodar `npx lighthouse http://localhost:4173/` e `…/pontos-turisticos/coreto/`, com estes parâmetros:
    - `--only-categories=performance,accessibility,best-practices,seo`;
    - `--chrome-flags="--headless=new"`;
    - `--output=json` e `--output-path=.shots/lh-<pagina>.json`.
  - Esperado:
    - todas as categorias com 0,90 ou mais;
    - `total-byte-weight` da Home com 2,5 MB ou menos.
  - Corrigir o que for preciso.

- [ ] **Step 5: Escrever e rodar `keyboard-check.mjs`** (playwright-core)

  | Viewport | Página | Ações | Esperado |
  | --- | --- | --- | --- |
  | 1440 | `/` | 1º Tab, depois Enter | O `.skip-link` fica visível e o foco vai para `#conteudo` |
  | 390 | — | Tab até o botão do menu, depois Enter | O menu abre e o foco fica no primeiro link |
  | 390 | — | Escape | O menu fecha e o foco volta ao botão |
  | — | `/pontos-turisticos/coreto/` | Foco no 1º item da galeria, depois Enter | O dialog abre |
  | — | idem | ArrowRight | O contador mostra "2 / N" |
  | — | idem | Escape | O dialog fecha e o foco volta ao item |

  Esperado: o script sai com código 0.

- [ ] **Step 6: Medir o peso**
  - `du -sh dist`.
  - Somar `dist/img`, `dist/og` e `dist/video`: 40 MB ou menos.

- [ ] **Step 7: Commit**: `test(qa): verificação final de layout, acessibilidade, teclado e desempenho`
