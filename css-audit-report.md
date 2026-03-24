# Auditoria de CSS

## 1. Resumo executivo

O CSS do projeto tem uma base boa e intencional: existe um conjunto claro de tokens em `:root`, uma linguagem visual consistente com dark theme + tipografia de destaque, componentes-base reaproveitados (`.card`, `button`, campos de formulario) e varios cuidados uteis de responsividade (`min-width: 0`, `overflow-wrap`, `prefers-reduced-motion`, breakpoints explicitos).

O principal problema nao e ausencia total de padrao. E drift arquitetural dentro do mesmo `style.css`. O arquivo concentra base, componentes, estados, paginas e uma camada tardia de overrides que passou a funcionar como segunda fonte de verdade. Isso gera:

- duplicacao real de seletores importantes
- overrides tardios que contradizem a base
- semantica visual inconsistente em alguns contextos
- aumento de especificidade local para resolver conflitos
- maior risco de regressao ao tocar em modal, feed e superficies de collection/questionnaire

**Principais riscos**

- quebrar modal/feed/collections ao corrigir um estilo aparentemente local
- manter regras mortas ou contraditorias sem perceber
- aumentar o drift visual porque o sistema ja aceita "ajustes no fim do arquivo"

**Pontos positivos**

- tokens de cor, spacing, radius e shadow ja existem
- tipografia e tom visual estao bem definidos
- ha boa cobertura de estados de foco e motion reduction
- varios componentes cuidam bem de quebra de texto e `min-width: 0`

**Areas mais frageis**

- bloco tardio de overrides apos `/* Dev-baseline overrides restored after featureCollection UI drift. */`
- modal stack
- header/discovery do feed
- superficies de collections + questionnaire

## 2. Entendimento da arquitetura visual

### Como o CSS esta organizado

- O frontend usa um unico arquivo principal: `src/public/css/style.css` com **2291 linhas**.
- Todas as paginas (`index`, `feed`, `post`, `profile`, `collections`, `collection`, `admin/reviews`) consomem esse mesmo arquivo.
- Boa parte da UI e montada por renderers JS (`features/feed`, `features/post`, `features/profile`, `features/collections`, `features/questionnaire`), entao a auditoria cruzou CSS com HTML e templates JS.

### Tokens e padroes existentes

- **Tokens visuais** em `:root`: cores, spacing, radius e shadow.
- **Primitivos claros**:
  - superficies: `.card`
  - acoes: `button`, `.button-link`, variantes `ghost/approve/reject`
  - formularios: `input`, `textarea`, `select`
  - tipografia de destaque: `Patrick Hand`
  - tipografia base: `Space Grotesk`
- **Breakpoints principais**:
  - `860px`
  - `640px` (aparece duas vezes)
  - `425px`

### Distribuicao por pagina/bloco

- `index.html`: auth grid, hero, formularios basicos
- `feed.html`: header expandido, busca, controles de feed, dropdown de tags seguidas, cards de post/collection, modal de post
- `post.html`: post detail, galeria de imagens, painel de questionnaire, comentarios, modal de post
- `profile.html`: hero do perfil, metricas, lista de posts, admin tools, danger zone, modais
- `collections.html` / `collection.html`: cards e hero de collection, listas ordenadas, acoes de management
- `admin/reviews.html`: grid administrativo simples e reutilizacao do sistema de cards/buttons

### Observacoes para evitar falso positivo

- A linguagem visual dark com starfield, a tipografia acentuada com `Patrick Hand`, o uso de chips/pills e o fallback mobile de uma coluna estao documentados e parecem intencionais.
- O problema nao e "tema escuro" nem "muito estilo global"; o problema e a coexistencia de uma boa base com uma camada de remendos que sobrescreve a propria base.

## 3. Achados por severidade

### Alta

#### H1. Ha uma segunda fonte de verdade no fim do arquivo

1. **Problema**  
   Existe uma camada tardia de overrides que reabre componentes ja definidos anteriormente e passa a competir com a base.
2. **O que esta acontecendo tecnicamente**  
   Depois do comentario `/* Dev-baseline overrides restored after featureCollection UI drift. */`, o CSS redefine regras ja existentes como `.ink-underline::after`, `.modal`, `.modal::backdrop`, `.modal-card`, alem de varios blocos de collection/questionnaire.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Seletores/blocos: por volta de `2128-2688`
   - Comparar com definicoes anteriores em `223-231`, `1641-1656`, `1259-1490`, `1549-1635`
4. **Por que isso e ruim**  
   Cria duplicacao estrutural, reduz previsibilidade, aumenta custo de manutencao e faz o arquivo aceitar "conserto no fim" como padrao.
5. **Severidade**  
   Alta
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Consolidar esse bloco tardio: decidir quais regras sao a verdade final, mover para perto da definicao original e eliminar duplicacao contraditoria.

#### H2. O primitive `.ink-underline` esta contradito pelo proprio arquivo

1. **Problema**  
   O sublinhado decorativo e definido cedo e desativado globalmente depois.
2. **O que esta acontecendo tecnicamente**  
   `.ink-underline::after` ganha pseudo-elemento visivel na base e depois recebe `display: none; content: none;` no bloco tardio.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Definicao original: `.ink-underline::after` em `223-231`
   - Override tardio: `.ink-underline::after` em `2129-2132`
4. **Por que isso e ruim**  
   A regra original vira praticamente morta, o nome da classe deixa de refletir o comportamento real e qualquer ajuste futuro no "underline" pode ser feito no lugar errado.
5. **Severidade**  
   Alta
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Escolher uma unica regra final para `.ink-underline`: manter o underline ou remove-lo da base; nao deixar as duas coexistirem.

#### H3. O significado de `.muted` quebra dentro de `.modal-card`

1. **Problema**  
   A classe semantica `.muted` deixa de significar "texto secundario" dentro de modal.
2. **O que esta acontecendo tecnicamente**  
   A base define `.muted { color: var(--text-1); }`, mas depois `.modal-card .muted` e forcado para `var(--text-0)`, seguido por excecoes para `success`, `error`, `info`, `tag-input-hint` e `tag-input-counter`.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Base: `.muted` em `247-279`
   - Override contextual: `.modal-card, .modal-card label, .modal-card .muted...` em `2656-2684`
4. **Por que isso e ruim**  
   Enfraquece semantica, espalha excecoes locais, aumenta chance de regressao de contraste e dificulta leitura do codigo CSS/HTML.
5. **Severidade**  
   Alta
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Separar semantica de contexto: manter `.muted` com significado estavel e criar tokens/variantes de modal em vez de reescrever o significado da classe.

#### M1. A responsividade esta espalhada em dois blocos `@media (max-width: 640px)`

1. **Problema**  
   O mesmo breakpoint e reaberto em regioes distantes do arquivo.
2. **O que esta acontecendo tecnicamente**  
   Existe um bloco `@media (max-width: 640px)` em `1924` e outro em `2688`, e ambos ajustam layout de grids, actions e superficies relacionadas a collections.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Breakpoints: `1924-2068` e `2688-2291`
   - Exemplos de seletor espalhado: `.managed-content-grid`, `.collection-post-list`
4. **Por que isso e ruim**  
   Dificulta rastrear comportamento responsivo completo, aumenta chance de override acidental e obriga leitura em duas regioes distantes para entender um mesmo estado.
5. **Severidade**  
   Media
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Unificar por breakpoint ou por componente responsivo, para que cada comportamento mobile tenha uma unica area de manutencao.

#### M2. O header do feed depende de especificidade local demais

1. **Problema**  
   O feed usa muitas variantes como `.app-header-feed-inner .feed-discovery-controls`, `.app-header-feed-inner .follow-tags-toolbar`, `.app-header-feed-inner .feed-follow-toggle`.
2. **O que esta acontecendo tecnicamente**  
   Componentes "genericos" (`.feed-discovery-controls`, `.follow-tags-toolbar`, `.feed-follow-toggle`) recebem overrides page-scoped repetidos e em varios breakpoints.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Blocos: `535-779`, `1881-2107`
   - Seletores: `.app-header-feed-inner .feed-discovery-controls`, `.app-header-feed-inner .follow-tags-toolbar`, `.app-header-feed-inner .feed-follow-toggle`
4. **Por que isso e ruim**  
   A leitura do componente fica dificil, o reuso vira arriscado e pequenos ajustes de layout no feed exigem navegar por muitos overrides com especificidade diferente.
5. **Severidade**  
   Media
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Tratar o discovery do feed como um bloco proprio com variantes explicitas, em vez de sobrepor componentes genericos com seletores descendentes repetidos.

#### M3. O design system existe, mas muitas cores continuam hard-coded

1. **Problema**  
   Ha tokens em `:root`, mas muitos estados e superficies usam valores literais repetidos.
2. **O que esta acontecendo tecnicamente**  
   Cores como `#506484`, `#d7b0b0`, `#3f6651`, `#6f4242`, `#222f43`, `#182336` e varios `rgba(...)` entram direto em buttons, toggles, menu e cards especiais.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Tokens: `3-23`
   - Exemplos de bypass: `421-489`, `620-669`, `1766-1836`, `2398-2417`
4. **Por que isso e ruim**  
   Reduz capacidade de padronizacao, dificulta ajuste global de tema e favorece drift de tons entre componentes parecidos.
5. **Severidade**  
   Media
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Promover cores recorrentes para tokens semanticos de botao, chip, border-highlight e surface-accent.

#### M4. A familia de pills/chips/badges nao tem primitive reutilizavel

1. **Problema**  
   Varios elementos visualmente da mesma familia sao estilizados separadamente.
2. **O que esta acontecendo tecnicamente**  
   `.reputation-badge`, `.trend-chip`, `.tag-item`, `.questionnaire-count`, `.managed-collection-count`, `.post-context-pill`, `.profile-privacy-badge` repetem radius `999px`, padding pequeno, border, fundo e tipografia com pequenas divergencias.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Seletores/blocos: `1020-1029`, `1290-1316`, `1495-1538`, `2219-2230`, `2315-2329`
4. **Por que isso e ruim**  
   Pequenas diferencas se acumulam, o sistema visual parece menos coeso e cada novo chip tende a nascer como "mais um caso especial".
5. **Severidade**  
   Media
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Definir um primitive base de pill/chip/badge com variantes de cor/estado, e migrar os componentes gradualmente para esse eixo.

#### M5. Ha um remendo explicito por margem negativa em collection management

1. **Problema**  
   O espacamento entre acoes e select de collection depende de margem compensatoria negativa.
2. **O que esta acontecendo tecnicamente**  
   `.collection-card-actions + .managed-collection-select { margin-top: calc(var(--space-1) * -1); }` corrige layout "empurrando" o proximo bloco para cima.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Seletor/bloco: `2439-2445`
4. **Por que isso e ruim**  
   E fragil, depende da ordem do DOM, aumenta risco de quebra quando padding/gap mudar e e um sinal tipico de remendo visual.
5. **Severidade**  
   Media
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Reorganizar o container de actions/select para que o spacing seja resolvido por `gap`, padding ou bloco wrapper explicito, sem margem negativa.

### Baixa

#### L1. Existem seletores com forte indicio de nao uso

1. **Problema**  
   Alguns blocos aparecem no CSS mas nao tem ocorrencia em `src/public/pages` nem em `src/public/js`.
2. **O que esta acontecendo tecnicamente**  
   Busca exata no frontend nao encontrou uso para `.info-strip`, `.moderation-panel`, `.profile-section-card`, `.post-meta` e `.collection-detail-meta`.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Seletores: `.info-strip` (`240-242`), `.post-meta` (`1033-1036`), `.moderation-panel` (`1694-1697`), `.profile-section-card` (`1592-1595`), `.collection-detail-meta` (`1553-1556`)
4. **Por que isso e ruim**  
   Mantem ruido no arquivo, dificulta leitura e pode esconder dependencias mortas.
5. **Severidade**  
   Baixa
6. **Grau de confianca**  
   Medio
7. **Recomendacao objetiva**  
   Confirmar se essas classes ainda sao necessarias; se nao forem, remover em uma limpeza dedicada com validacao visual.

#### L2. Ha classes estruturais no HTML/renderers sem contrato visual explicito

1. **Problema**  
   Algumas classes aparecem como semantica estrutural, mas nao tem regra dedicada no CSS.
2. **O que esta acontecendo tecnicamente**  
   Classes como `modal-form-layout`, `modal-form-section`, `modal-form-section-copy`, `danger-zone-card` e `post-author-summary` existem em HTML/renderers, mas nao tem seletor correspondente em `style.css`.
3. **Onde ocorre exatamente**  
   - Arquivos: `src/public/pages/feed.html`, `src/public/pages/post.html`, `src/public/pages/profile.html`, `src/public/js/features/feed/renderers.js`, `src/public/js/features/post/renderers.js`
   - CSS: ausencia de seletores equivalentes em `src/public/css/style.css`
4. **Por que isso e ruim**  
   Enfraquece previsibilidade do contrato entre markup e estilo; quem le o DOM pode assumir que a classe "tem dono" visual quando na pratica ela so organiza semantica.
5. **Severidade**  
   Baixa
6. **Grau de confianca**  
   Medio
7. **Recomendacao objetiva**  
   Documentar quais classes sao apenas estruturais/hook e quais sao efetivamente primitivas visuais, para reduzir ambiguidade.

#### L3. O carregamento de fonte externa esta acoplado ao CSS via `@import`

1. **Problema**  
   A folha principal depende de um `@import` externo logo na primeira linha.
2. **O que esta acontecendo tecnicamente**  
   `style.css` importa Google Fonts diretamente com `@import url(...)`.
3. **Onde ocorre exatamente**  
   - Arquivo: `src/public/css/style.css`
   - Linha aproximada: `1`
4. **Por que isso e ruim**  
   E menos eficiente para carregamento que um `<link>` dedicado no HTML, aumenta acoplamento da folha com infraestrutura externa e piora previsibilidade de render inicial.
5. **Severidade**  
   Baixa
6. **Grau de confianca**  
   Alto
7. **Recomendacao objetiva**  
   Migrar o carregamento das fontes para `<link>` no HTML ou outra estrategia centralizada de asset loading.

## 4. Achados por categoria

### Duplicacao e redundancia

- H1: camada tardia de overrides vira segunda fonte de verdade
- H4: collections/questionnaire redefinidos em varios grupos grandes
- M1: breakpoint `640px` duplicado em regioes distantes
- L1: regras com forte indicio de nao uso

### Gambiarras e fragilidade

- H2: `.ink-underline::after` definido e depois anulado
- H3: `.muted` perde significado dentro de modal
- M2: especificidade local alta no discovery/feed header
- M5: margem negativa compensatoria em collection management

### Inconsistencia visual

- H3: semantica de cor muda por contexto
- M3: hard-coded colors convivem com tokens
- M4: chips/pills/badges da mesma familia divergem sem primitive comum

### Falta de padronizacao

- H4: agrupamentos grandes misturam familias de componente diferentes
- M2: versao "generica" e versao "feed-specific" do mesmo bloco coexistem
- M4: multiplos padroes de pill/button-like control sem eixo comum
- L2: classes estruturais sem contrato visual explicito

### Layout e responsividade

- M1: responsividade espalhada por dois blocos `640px`
- M2: feed header depende de cadeia de overrides page-scoped
- M5: ajuste de spacing por margem negativa

## 5. Problemas sistemicos

### 1. Drift por override tardio

O projeto tem uma base visual boa, mas aceita um padrao perigoso: quando um componente deriva, o ajuste vai para o fim do arquivo, reabrindo o mesmo seletor. Isso ja aconteceu com modal, underline, collections e questionnaire.

### 2. Sem primitivas suficientes para familias visuais recorrentes

O sistema tem tokens, mas nao consolidou familias como pill/chip/badge, modal text semantics e page-specific header variants. O resultado e reaplicar border/padding/radius/background em muitos lugares.

### 3. Responsividade e page overrides dispersos

Parte importante do comportamento mobile e do feed depende de overrides espalhados. Isso eleva a chance de regressao porque o comportamento final so aparece ao combinar blocos distantes.

## 6. Quick wins

1. Unificar a verdade de `.ink-underline::after` e remover a definicao morta.
2. Consolidar `.modal`, `.modal::backdrop` e `.modal-card` em um unico ponto do arquivo.
3. Juntar os dois blocos `@media (max-width: 640px)` ou, no minimo, agrupar por componente.
4. Remover a margem negativa de `.collection-card-actions + .managed-collection-select` substituindo por spacing estrutural.
5. Revisar e limpar seletores provavelmente mortos (`.info-strip`, `.moderation-panel`, `.profile-section-card`, `.post-meta`, `.collection-detail-meta`) apos validacao visual.

## 7. Correcoes estruturais

1. Reorganizar `style.css` por camadas claras: base, primitives, components, pages, responsive.
2. Criar primitivas explicitas para:
   - pills/chips/badges
   - superficies especiais (modal, collection hero, questionnaire surfaces)
   - variacoes de button-like controls que hoje reimplementam foco/hover/tipografia
3. Promover cores recorrentes e estados para tokens semanticos, reduzindo hex/rgba literais.
4. Reduzir grupos gigantes de seletores compartilhados e separar melhor regras de questionnaire e collections.
5. Definir um contrato claro para classes estruturais vs classes visuais.

## 8. Ordem sugerida de priorizacao

1. **Resolver conflitos de fonte de verdade**
   - H1, H2, H3
2. **Atacar superficies mais frageis**
   - modal stack
   - feed discovery/header
   - questionnaire/collections
3. **Limpar fragilidade local**
   - M5
   - L1
4. **Padronizar o sistema visual**
   - M3
   - M4
5. **Refinar arquitetura responsiva**
   - M1
   - M2

