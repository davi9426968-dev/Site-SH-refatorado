# Santo Hipólito-MG

Site da cidade de Santo Hipólito, em Minas Gerais: páginas HTML estáticas, CSS próprio e JavaScript puro com GSAP e Lenis, empacotados com o Vite (várias páginas, sem framework).

## Requisitos

- Node 24 e npm 11.
- Git Bash no Windows (os scripts usam caminhos com `path`, mas os comandos abaixo foram testados no Git Bash).

```bash
npm install
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera o site em `dist/` |
| `npm run preview` | Serve o `dist/` localmente |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run check` | Examina o `dist/` (links, imagens, títulos, descrições, textos proibidos); rode depois do build |
| `npm run shots` | Tira capturas de tela das páginas (veja `scripts/screenshots.mjs` para as opções) |
| `npm run keyboard` | Confere o teclado em navegador real (skip-link, menu mobile, trilho fixado da Home, lightbox com Tab preso); rode depois do build |
| `npm run images` | Gera as imagens otimizadas a partir de `_fotos/` e `_legado/` |
| `npm run video` | Comprime o vídeo da cidade |
| `npm run sheets` | Gera folhas de contato para conferir as fotos |
| `npm run scaffold` | Gera as páginas de categoria e de lugar a partir de `content/` |

## Estrutura de pastas

```
index.html, 404.html          Home e página de erro
pontos-turisticos/ eventos/   Uma pasta por categoria, com index.html
comunidades/ comercios/       e uma subpasta por lugar (ex.: eventos/forrozao/index.html)
partials/                     Trechos repetidos (head, header, footer, cta-fotos, boot)
src/styles/                   CSS em camadas (tokens, base, componentes, sections/)
src/js/                       Módulos: core/, ui/ e fx/; o src/main.js os carrega
public/                       Arquivos servidos como estão (ícones, imagens geradas, vídeo, robots.txt)
content/                      Dados dos lugares (lugares.json, inventario.json, contatos-comercios.json)
scripts/                      Pipeline de imagens, scaffold, verificações e capturas de tela
tests/                        Testes
_fotos/                       Fotos originais novas (fora do Git)
_legado/                      Site antigo (fora do Git)
```

Os `<!-- @include nome -->` das páginas são trocados pelo conteúdo de `partials/nome.html` no build.

## Como editar textos

O HTML é a fonte de verdade. Para mudar um texto, abra a página (por exemplo `eventos/forrozao/index.html`) e edite direto nela.

Atenção ao regerar páginas com `npm run scaffold`: ele não sobrescreve páginas existentes, a menos que você passe `--force`, e nesse caso as edições manuais daquela página se perdem. Para mudar um texto que vem de `content/lugares.json`, edite o JSON e regere só aquela página.

Os textos da Home (trilho, bento, lista de eventos e contagens em `index.html`) também são editados à mão no `index.html`: o `scaffold` regera apenas as páginas de categoria e de lugar.

Regras de texto: tudo em pt-BR, sem emojis, `<title>` no formato "Item · Santo Hipólito-MG" com até 60 caracteres e meta description de 50 a 155 caracteres. O `npm run check` confere isso.

## Como adicionar fotos

1. Coloque as fotos originais em `_fotos/` (ou aponte para arquivos de `_legado/`).
2. Registre cada foto em `scripts/images.config.json`, na lista `entries`:

   ```json
   { "src": "_fotos/forrozao.jpg", "dest": "eventos/forrozao/08", "alt": "Descrição da foto", "role": "gallery" }
   ```

   `dest` segue `<categoria>/<slug>/<NN>`, em que `01` é sempre a capa (`role: "cover"`). `role` pode ser `cover`, `gallery`, `hero`, `orbit` ou `brand`. Use `"og": true` para gerar a imagem de compartilhamento.
3. Rode `npm run images`. Saem WebP em 1600 e 800 px (sem ampliar) em `public/img/` e o manifest `scripts/images.manifest.json`.
4. Use as fotos no HTML com `width` e `height` reais, `alt` descritivo, `decoding="async"` e `loading="lazy"` (o hero usa `fetchpriority="high"`).

## Como adicionar um lugar

Duas opções:

- **Copiar uma pasta.** Copie a pasta de um lugar parecido (por exemplo `eventos/forrozao/`) para `<categoria>/<novo-slug>/` e edite o `index.html`: título, descrição, textos, fotos e o JSON-LD. Inclua o link do novo lugar na página da categoria.
- **Usar o scaffold.**
  1. Adicione o lugar em `content/inventario.json` e em `content/lugares.json` (campos: `slug`, `categoria`, `titulo`, `tipo`, `resumo`, `descricao`, `lead`, `paragrafos`, `chips`, `info` e, se houver, `endereco`).
  2. Cadastre as fotos (seção anterior) e rode `npm run images`.
  3. Gere a página: `npm run scaffold -- --only <novo-slug>`. Com `--only`, só a página desse lugar (ou dessa categoria) é gerada; para que a lista da categoria mostre o novo item, rode também `npm run scaffold -- --only <categoria> --force`.

Depois, rode `npm run build && npm run check`.

## Publicar na Vercel

1. Importe o repositório na Vercel.
2. Preset **Vite**, comando `npm run build`, pasta de saída `dist`.
3. O `vercel.json` já ativa `trailingSlash`, e as URLs do site terminam em barra.
4. Em Settings, Environment Variables, defina `VITE_SITE_URL` com o endereço público, sem barra final (por exemplo `https://santohipolito.com.br`). Com ela, o build:
   - acrescenta `<link rel="canonical">` e `og:url` em cada página;
   - torna absolutas as URLs de `og:image` e as do JSON-LD;
   - gera `dist/sitemap.xml` (sem a página 404) e acrescenta `Sitemap: <endereço>/sitemap.xml` ao `dist/robots.txt`.

   Sem `VITE_SITE_URL`, nada disso é gerado e o site funciona do mesmo jeito. Para testar localmente: `VITE_SITE_URL=https://exemplo.com.br npm run build`. Há um modelo em `.env.example`.
5. A Vercel serve o `404.html` automaticamente para endereços que não existem.

## Validação

`npx html-validate "dist/**/*.html"` usa o `.htmlvalidate.json` (JSON não aceita comentários, por isso as justificativas ficam aqui). Além de `html-validate:recommended`, duas regras estão configuradas:

- `doctype-style: lowercase`: o contrato de páginas do projeto usa `<!doctype html>` em minúsculas em todas as páginas. Em vez de reescrever o doctype em 30 páginas, a regra foi ajustada para exigir o mesmo estilo.
- `tel-non-breaking` com `ignoreClasses: ["btn"]`: a regra pede U+2011 (hífen não separável) nos telefones, mas a Poppins não tem esse glifo (cairia numa fonte de reserva). Nos links `.btn`, o `white-space: nowrap` já impede a quebra do número, então o aviso é dispensado só nessas classes.

Bateria completa antes de publicar: `npm test`, `npm run build`, `npm run check` (0 problemas em 30 páginas), `npx html-validate "dist/**/*.html"`, `npm run shots -- --all --check-overflow` (sem rolagem horizontal), `npm run keyboard` e o Lighthouse mobile com `npm run preview` no ar:

```bash
npx lighthouse http://localhost:4173/ --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new" --output=json --output-path=.shots/lh-home.json
```

Meça com a máquina ociosa (nenhuma outra aba animando o site) e use a mediana de pelo menos 3 execuções: o desempenho simulado varia alguns centésimos de uma execução para outra. Na primeira visita da sessão o Lighthouse vê a intro da Home; o LCP é o primeiro quadro dela.

## Site antigo

O site anterior fica em `_legado/` e não vai para o Git. Ele é só fonte de fotos e vídeo para o pipeline de imagens (`images.config.json` aponta para arquivos de lá). Não apague a pasta enquanto houver entradas apontando para ela.
