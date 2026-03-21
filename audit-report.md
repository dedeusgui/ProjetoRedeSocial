# Auditoria Contextual do Projeto

## 1. Resumo executivo

Visao geral da qualidade atual:
- O projeto continua acima da media para o escopo academico: documentacao forte, backend modular coerente, contrato HTTP consistente, frontend organizado por pagina/orquestrador/renderer e design visual relativamente estavel.
- A revisao deste relatorio mostrou que o maior risco atual nao e "layout quebrado geral" nem "arquitetura sem direcao". O maior risco direto ao usuario esta nas acoes destrutivas sem confirmacao. O maior risco estrutural esta no frontend estatico depender de contratos implicitos entre HTML, `data-*` hooks e orquestradores JS sem blindagem suficiente contra drift.

Principais riscos:
- deletes permanentes de usuario, post e colecao continuam sem etapa intermediaria de seguranca
- alguns fluxos importantes ainda dependem de `status-line`, mas nao refletem estado ocupado no proprio controle
- paginas publicas podem continuar parecendo autenticadas quando o token local ja nao corresponde a uma sessao valida
- UI compartilhada depende de markup repetido e seletores tolerantes demais, o que aumenta regressao silenciosa

Padroes positivos encontrados:
- tokens visuais consistentes em `src/public/css/style.css`
- bons renderers reutilizaveis em `features/*`
- envelope HTTP `{ ok, data/error }` bem documentado e respeitado
- docs deixam varias decisoes de produto explicitas, o que evita falso positivo
- existe bom exemplo interno de busy-state e disable de controles em `features/posts/post-modal.js`

Areas mais frageis:
- protecao de acoes destrutivas
- coerencia de estado autenticado em paginas publicas
- uniformidade de pending/busy-state
- superficies compartilhadas com markup duplicado

Observacao metodologica:
- Esta versao nao e uma auditoria cega refeita do zero.
- Usei o `audit-report.md` anterior como base, reli os achados que estavam superficiais, ambiguos ou desatualizados e revalidei os arquivos-fonte mais relevantes.
- Nao rodei browser automation nem `npm run test:smoke`; a analise continua baseada em leitura contextual de codigo e docs.

## 2. Entendimento do projeto

Objetivo do sistema:
- Rede social academica/full-stack focada em compartilhamento de conhecimento, com feed cronologico, posts, comentarios, sequencias, colecoes e moderacao simples.

Padroes identificados:
- Backend em monolito modular com `routes/controllers/services/repositories`.
- Frontend estatico servido pelo Express, com HTML por pagina, orquestradores em `src/public/js/pages/*.js`, renderers em `src/public/js/features/*`, fachada HTTP em `src/public/js/api.js` e sessao local em `src/public/js/core/session.js`.
- UI dark-first com tipografia `Space Grotesk` + `Patrick Hand`, cartoes, chips, bordas suaves e feedback textual via `status-line`.

Decisoes intencionais percebidas:
- feed cronologico sem ranking
- ausencia de perfil publico clicavel para autores
- questionarios corrigidos localmente no browser em v1
- usuarios autenticados poderem avaliar os proprios posts
- modo `Followed tags` de colecoes considerar as tags da colecao, nao tags dos posts internos
- projeto nao declara light theme

Limitacoes ou escopos assumidos:
- parte da simplicidade de UX e intencional para manter o projeto didatico
- nem toda falta de feature foi tratada como bug
- a arquitetura de frontend aceita HTML estatico, entao a auditoria considerou o custo/beneficio dentro desse contexto, nao contra um SPA framework idealizado

Observacoes para evitar falso positivo:
- O campo `Confirm password` existe no `index.html` atual com os hooks corretos. O problema anterior de "campo ausente" foi reclassificado: hoje o problema confirmado e o contrato fail-open entre markup e JS, nao a ausencia atual do campo.
- O problema de sessao invalida em paginas publicas nao e universal. `index.js` e `collections.js` lidam melhor com 401/`UNAUTHENTICATED`; o drift aparece de forma parcial e localizada em `feed.js`, `post.js`, `collection.js` e no navbar.

## 3. Mapa de paginas auditadas

| Pagina | Arquivos associados | Status geral | Principais problemas encontrados |
|---|---|---|---|
| `index.html` | `src/public/js/pages/index.js`, `src/public/js/components/flash.js`, `src/public/js/api.js`, `src/public/css/style.css` | Bom com riscos localizados | status de cadastro mal ancorado, sem busy-state, contrato HTML/JS fail-open |
| `feed.html` | `src/public/js/pages/feed.js`, `src/public/js/features/feed/renderers.js`, `src/public/js/features/followed-tags/renderers.js`, `src/public/js/features/posts/post-modal.js` | Atencao | delete sem confirmacao, sessao aparentemente valida com token invalido, chips touch pequenos, modal compartilhado duplicado |
| `post.html` | `src/public/js/pages/post.js`, `src/public/js/features/post/renderers.js`, `src/public/js/features/questionnaire/renderers.js`, `src/public/js/features/posts/post-modal.js` | Atencao | delete sem confirmacao, limite de comentario so no backend, sessao aparentemente valida com token invalido, chips touch pequenos, modal duplicado |
| `profile.html` | `src/public/js/pages/profile.js`, `src/public/js/features/profile/renderers.js`, `src/public/js/features/profile/content-renderers.js`, `src/public/js/features/admin/renderers.js` | Fragilidade localizada | delete administrativo permanente sem confirmacao, modal de post duplicado |
| `collections.html` | `src/public/js/pages/collections.js`, `src/public/js/features/profile/content-renderers.js`, `src/public/css/style.css` | Atencao | `Add to collection` silencioso sem selecao, delete sem confirmacao, busy-state insuficiente em acoes da tela |
| `collection.html` | `src/public/js/pages/collection.js`, `src/public/js/features/collections/renderers.js` | Bom com ressalva | navbar e CTA de sessao dependem de token local, nao de sessao validada |
| `admin/reviews.html` | `src/public/js/pages/admin-reviews.js`, `src/public/js/features/admin/renderers.js`, `src/public/css/style.css` | Bom com debito estrutural | renderer inline duplicado fora de `features/admin`, risco de drift com outras views administrativas |

## 4. Achados por severidade

### Alta

#### F-02 - Acoes destrutivas permanentes sao executadas sem confirmacao intermediaria

Tipo:
- bug funcional/UX real

1. Problema
   Deletes de usuario por admin, post e colecao ainda acontecem imediatamente apos o clique. Para o usuario, isso transforma um misclick em perda definitiva de conteudo ou conta.
2. Causa estrutural provavel
   O projeto endureceu o fluxo de autoexclusao do proprio usuario, mas nao consolidou uma politica unica para acoes destrutivas. Cada pagina chama o endpoint de delete diretamente dentro do handler.
3. Onde ocorre exatamente
   - `src/public/js/pages/profile.js:334-342`
   - `src/public/js/pages/feed.js:716-742`
   - `src/public/js/pages/post.js:445-460`
   - `src/public/js/pages/collections.js:202-213`
4. Em que condicao ocorre
   - desktop e mobile
   - clique por mouse ou touch
   - tambem vale para teclado quando o botao recebe foco e `Enter`/`Space` e acionado
5. Qual o impacto real
   - usabilidade: perda irreversivel por acionamento acidental
   - confianca: o sistema nao sinaliza a gravidade da acao
   - consistencia: a danger zone do proprio usuario usa protecao forte, enquanto deletes igualmente permanentes fora dela nao usam
6. Severidade
   - alta
7. Grau de confianca
   - alto
8. Evidencia
   - `profile.js:342` chama `api.admin.deleteUser(userId)` diretamente
   - `feed.js:740`, `post.js:459` e `collections.js:211` disparam delete sem etapa intermediaria
9. Recomendacao objetiva de correcao
   - minima: antes de cada request destrutivo, exigir `window.confirm()` com texto especifico do recurso
   - estrutural: criar um helper unico de confirmacao destrutiva usado por `profile.js`, `feed.js`, `post.js` e `collections.js`, com copy padronizada e opcao futura de modal proprio

### Media

#### F-01 - O frontend depende de contratos implicitos entre HTML estatico, `data-*` hooks e JS, e falha de forma silenciosa quando o markup deriva

Tipo:
- inconsistencia entre camadas
- debito arquitetural/manutencao com risco real de regressao

1. Problema
   Partes criticas do frontend assumem hooks de markup especificos, mas os orquestradores continuam funcionando mesmo quando esses hooks somem ou ficam incompletos. Isso transforma drift de HTML em degradacao silenciosa de comportamento, nao em falha visivel no boot.
2. Causa estrutural provavel
   HTML estatico por pagina + seletores `data-*` como contrato informal + ausencia de assertivas de elementos obrigatorios + duplicacao de markup compartilhado.
3. Onde ocorre exatamente
   - `src/public/js/pages/index.js:86-101`
   - `src/public/pages/index.html:100-112`
   - `src/public/js/features/posts/post-modal.js:34-38`
   - `src/public/js/features/posts/post-modal.js:315-333`
   - `src/public/pages/feed.html:109-190`
   - `src/public/pages/post.html:41-122`
   - `src/public/pages/profile.html:70-139`
   - `src/public/js/pages/admin-reviews.js:55-92`
4. Em que condicao ocorre
   - quando um ajuste de HTML renomeia/remove um hook `data-*`
   - quando o modal compartilhado ganha um novo campo/controle e uma das paginas nao replica o markup completo
   - quando um renderer compartilhado muda, mas outra tela continua usando versao inline antiga
5. Qual o impacto real
   - regressao silenciosa: a pagina pode "funcionar" parcialmente sem denunciar que perdeu uma capacidade
   - manutencao: cada evolucao de UI exige lembrar de varios pontos manuais
   - QA: bugs podem escapar porque o script nao quebra; ele apenas deixa de aplicar uma parte do comportamento
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - o `index.html` atual tem `data-register-password-confirmation-input` em `index.html:108`, mas `index.js:91-92` retornaria `true` se esse hook desaparecesse, ou seja, a validacao falha em aberto
   - `post-modal.js` consulta varios hooks opcionais (`questionnaireShell`, `questionnaireToggle`, `questionnairePanel`, `mediaSummary`) e protege quase todos com `if (...)`, permitindo perda parcial de funcionalidade sem erro de inicializacao
   - o mesmo modal vive em tres HTMLs diferentes, entao o contrato de hooks precisa ser repetido manualmente
   - `admin-reviews.js` ainda define `renderUserCards()` inline mesmo havendo `features/admin/renderers.js`
9. Recomendacao objetiva de correcao
   - minima: adicionar um `assertRequiredElements()` por pagina para hooks criticos e um checklist de hooks obrigatorios do modal compartilhado
   - estrutural: centralizar o modal de post em uma unica fonte de markup/template e mover renderizacao administrativa residual para `features/admin/`

#### F-03 - O CTA `Add to collection` fica habilitado sem item selecionado e falha em silencio

Tipo:
- bug funcional/UX real

1. Problema
   O botao `Add to collection` parece disponivel mesmo quando o `<select>` ainda esta em `Choose a post`. Ao clicar, nada acontece e nenhum feedback e mostrado.
2. Causa estrutural provavel
   O estado do botao e derivado da existencia de posts adicionaveis, nao da selecao atual do usuario. O handler depois apenas sai sem mensagem quando `postId` esta vazio.
3. Onde ocorre exatamente
   - `src/public/js/features/profile/content-renderers.js:102-119`
   - `src/public/js/pages/collections.js:346-353`
4. Em que condicao ocorre
   - sempre que a colecao tenha ao menos um post adicionavel, mas o usuario ainda nao tenha escolhido nenhum item no select
5. Qual o impacto real
   - UX: o CTA promete uma acao valida que na pratica nao roda
   - clareza: para o usuario parece travamento ou clique perdido
   - manutencao: o renderer e o handler usam criterios diferentes de "pronto para enviar"
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - `content-renderers.js:117` so desabilita o botao quando `addablePosts.length === 0`
   - `collections.js:350-353` so chama `addPostToCollection()` se `postId` existir; caso contrario retorna sem feedback
9. Recomendacao objetiva de correcao
   - minima: deixar o botao desabilitado enquanto `select.value === ""` e reabilitar no `change`
   - estrutural: encapsular o bloco select + CTA como componente renderer que receba o estado derivado e aplique validacao visual e fallback de mensagem

#### F-04 - O limite de 2000 caracteres dos comentarios existe no backend, mas nao e refletido na UI de criar/editar

Tipo:
- bug funcional/UX real
- inconsistencia entre camadas

1. Problema
   O backend rejeita comentarios acima de 2000 caracteres, mas o frontend nao comunica esse limite no composer nem na edicao inline.
2. Causa estrutural provavel
   A regra foi implementada corretamente no servico do backend, mas nao foi propagada para os textareas do frontend nem para um token/constante compartilhada de validacao.
3. Onde ocorre exatamente
   - `src/modules/comments/services/CommentService.js:14-21`
   - `src/modules/comments/services/CommentService.js:63-70`
   - `src/public/pages/post.html:31-34`
   - `src/public/js/features/post/renderers.js:93-98`
4. Em que condicao ocorre
   - criacao de comentario longo
   - edicao de comentario longo
   - desktop e mobile
5. Qual o impacto real
   - UX: o usuario descobre tarde demais que digitou algo invalido
   - round-trip desnecessario: erro poderia ser evitado antes do request
   - risco de drift: a regra de dominio fica escondida so no backend
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - `CommentService.js` valida o maximo de 2000 caracteres tanto na criacao quanto na edicao
   - o textarea de composicao em `post.html` e o textarea de edicao renderizado em `features/post/renderers.js` nao exibem `maxlength`
9. Recomendacao objetiva de correcao
   - minima: aplicar `maxlength="2000"` nos dois textareas e mostrar texto de ajuda simples
   - estrutural: criar uma constante de validacao de comentario consumida por backend e frontend, ou ao menos um modulo frontend unico para limites de formulario

#### F-05 - O projeto tem estado assincrono, mas parte dele nao chega ao DOM como busy-state confiavel

Tipo:
- bug funcional/UX real
- inconsistencia de padrao entre telas

1. Problema
   Em varias telas, o request em andamento e representado so por texto de status, enquanto o proprio controle que iniciou a acao continua visualmente clicavel ou sem indicacao forte de ocupado.
2. Causa estrutural provavel
   O estado existe em memoria (`isManagingCollections`, ausencia de `isSubmitting` em alguns fluxos, etc.), mas nao ha helper unico para sincronizar `disabled`, label do botao e campos relacionados. Cada pagina implementa um pedaco diferente.
3. Onde ocorre exatamente
   - `src/public/js/pages/index.js:104-159`
   - `src/public/js/pages/collections.js:161-305`
   - `src/public/js/features/profile/content-renderers.js:91-119`
   - `src/public/js/pages/post.js:384-415`
   - contraste positivo:
     - `src/public/js/features/posts/post-modal.js:315-333`
     - `src/public/js/features/posts/post-modal.js:445-526`
     - `src/public/js/pages/post.js:243-258`
     - `src/public/js/pages/feed.js:681-705`
4. Em que condicao ocorre
   - rede lenta
   - duplo clique
   - `Enter` repetido em formulario
   - tentativas de interagir em colecoes enquanto uma operacao ainda esta em progresso
5. Qual o impacto real
   - UX: pouco feedback no proprio ponto de interacao
   - risco de repeticao: login, cadastro e comentario nao marcam envio em andamento
   - inconsistencia: algumas partes do sistema se comportam de forma madura, outras ainda parecem "clicaveis mas travadas"
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - `index.js` nao mantem `isSubmitting` nem altera `disabled`/label dos submits de login e cadastro
   - `collections.js` usa `state.isManagingCollections` como guarda logica, mas `content-renderers.js` continua emitindo botoes ativos sem awareness de busy-state; o usuario ve controles habilitados que passam a nao responder
   - `post.js:408-415` envia comentario sem desabilitar o textarea e o submit durante o request
   - o projeto ja tem referencia melhor em `post-modal.js`, onde `isSubmitting` e refletido nos controles
9. Recomendacao objetiva de correcao
   - minima: criar um helper pequeno de `setBusyState({ button, inputs, busyLabel })` e aplica-lo em `index.js`, `post.js` e `collections.js`
   - estrutural: padronizar um contrato de busy-state para formularios e acoes de lista, com renderer recebendo `disabled/busy` e nao so o orquestrador mantendo flags internas

#### F-06 - Em paginas publicas relevantes, `token presente` ainda pode renderizar uma UI aparentemente autenticada

Tipo:
- bug funcional real
- inconsistencia de estado entre cliente e API

1. Problema
   Quando o token local esta expirado, invalido ou adulterado, algumas paginas publicas ainda renderizam navbar, follow controls, review controls e composer como se a sessao estivesse valida. O erro so aparece depois, na tentativa de uso.
2. Causa estrutural provavel
   O navbar usa apenas `hasSession()` para decidir visibilidade. Alem disso, `feed.js` e `post.js` validam perfil/tags com `Promise.allSettled()`, mas ao falhar nao limpam sessao nem ressincronizam a UI inteira para estado anonimo.
3. Onde ocorre exatamente
   - `src/public/js/components/navbar.js:6-32`
   - `src/public/js/pages/feed.js:292-354`
   - `src/public/js/pages/feed.js:558-589`
   - `src/public/js/pages/post.js:145-178`
   - `src/public/js/pages/post.js:200-220`
   - `src/public/js/pages/post.js:312-339`
   - `src/public/js/pages/collection.js:66-69`
   - contraexemplos positivos:
     - `src/public/js/pages/index.js:43-59`
     - `src/public/js/pages/collections.js:63-71`
4. Em que condicao ocorre
   - token expirado
   - token invalido/tamperado
   - aba reaberta depois de tempo longo
   - refresh em pagina publica com sessao local desatualizada
5. Qual o impacto real
   - consistencia funcional: a UI diz "logado", a API diz "nao autenticado"
   - UX: o usuario so descobre o problema depois de tentar comentar, avaliar ou seguir tag
   - regressao: cada pagina publica decide sessao invalida de um jeito, entao o bug reaparece com facilidade
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - `navbar.js:12-29` usa apenas `hasSession()` para esconder/mostrar links
   - `feed.js:573-588` zera `viewerRole/viewerId` quando `meProfile()` falha, mas nao limpa token nem chama uma politica central de sessao invalida
   - `post.js:210-219` continua renderizando `canReviewPosts: hasSession()` e `canManageTagFollows: hasSession()`, o que pode manter controles protegidos visiveis mesmo sem sessao valida
   - `collection.js:68` apenas executa `navbar.refresh()`, sem validacao
9. Recomendacao objetiva de correcao
   - minima: ao receber 401/`UNAUTHENTICATED` em `feed.js`, `post.js` e `collection.js`, chamar `clearSession()`, `navbar.refresh()` e re-renderizar controles auth-gated
   - estrutural: centralizar invalidacao de sessao na camada `api.request()` ou em um `bootstrapPublicSession()` reutilizado por paginas publicas

#### F-08 - Os chips de follow/unfollow estao abaixo do alvo minimo confortavel para touch e repetem o problema em varias superficies

Tipo:
- bug de ergonomia/acessibilidade real

1. Problema
   O componente `.tag-follow-button` e muito compacto para interacao touch confortavel. O problema nao aparece em um lugar so; ele se repete no feed, no detalhe do post, no feed de colecoes e no dropdown de tags seguidas.
2. Causa estrutural provavel
   O componente de chip foi desenhado para densidade visual, mas sem token de tamanho minimo interativo. Como ele e reutilizado em varias renderizacoes, a deficiencia tambem e propagada em varios contextos.
3. Onde ocorre exatamente
   - `src/public/css/style.css:1379-1382`
   - `src/public/js/features/feed/renderers.js:49-85`
   - `src/public/js/features/post/renderers.js:36-72`
   - `src/public/js/features/collections/feed-renderers.js:8-45`
   - `src/public/js/features/followed-tags/renderers.js:21-47`
4. Em que condicao ocorre
   - principalmente `mobile S`, `mobile M` e `mobile L`
   - listas densas de tags
   - dropdown de tags seguidas, onde label clicavel e botao de unfollow ficam lado a lado
5. Qual o impacto real
   - acessibilidade motora: alvo pequeno aumenta mis-tap
   - UX mobile: seguir/desseguir tag vira acao menos confiavel justamente em superficies de alta repeticao
   - consistencia: o resto do sistema usa botoes mais confortaveis; o chip foge do padrao
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - `style.css:1379-1382` aplica `padding: 4px 8px` e `font-size: 0.8rem` sem `min-height`
   - o mesmo componente e reutilizado em pelo menos quatro superfices diferentes
   - em `followed-tags/renderers.js`, o botao pequeno fica imediatamente ao lado de outro botao (`followed-tag-chip-label-button`), o que aumenta ambiguidade de toque
9. Recomendacao objetiva de correcao
   - minima: no breakpoint mobile, dar `min-height: 44px`, padding vertical maior e mais espacamento lateral aos chips interativos
   - estrutural: criar uma variante de chip interativo com token proprio de tamanho minimo para touch e usa-la em todos os renderers de tags

#### F-09 - Ha risco de drift funcional/manutencao em UI compartilhada, e ele ja atravessa HTML, renderers e orquestradores

Tipo:
- debito arquitetural/manutencao
- risco confirmado de regressao silenciosa

1. Problema
   O modal de post esta replicado em tres HTMLs e o dominio administrativo ainda tem renderizacao duplicada fora da camada `features`. Isso ja nao e so "codigo repetido": combinado com seletores opcionais, o arranjo facilita divergencia funcional sem erro evidente.
2. Causa estrutural provavel
   O projeto compartilhou comportamento via JS (`createPostModalController`), mas deixou o markup fonte do modal distribuido por pagina. Ao mesmo tempo, nem toda UI administrativa foi consolidada em `features/admin/`.
3. Onde ocorre exatamente
   - `src/public/pages/feed.html:109-190`
   - `src/public/pages/post.html:41-122`
   - `src/public/pages/profile.html:70-139`
   - `src/public/js/features/posts/post-modal.js:34-38`
   - `src/public/js/features/posts/post-modal.js:315-333`
   - `src/public/js/pages/admin-reviews.js:55-92`
   - `src/public/js/features/admin/renderers.js:3-30`
4. Em que condicao ocorre
   - qualquer evolucao no modal de post: novos campos, novos hooks, nova copy, novos estados
   - qualquer ajuste de UI nos cards administrativos
5. Qual o impacto real
   - manutencao: correcoes e evolucoes exigem sincronizar varias fontes manuais
   - regressao silenciosa: se uma pagina esquecer um hook do modal, o controller tende a degradar sem quebrar o boot
   - arquitetura: `pages/*.js` volta a acumular responsabilidade de renderer, contrariando o padrao mais saudavel ja adotado no resto do projeto
6. Severidade
   - media
7. Grau de confianca
   - alto
8. Evidencia
   - o mesmo bloco de modal com os mesmos `data-post-*` aparece em `feed.html`, `post.html` e `profile.html`
   - `post-modal.js` depende desses hooks para recursos como questionario, midia e previous-post select
   - `admin-reviews.js` ainda tem `renderUserCards()` inline, enquanto `features/admin/renderers.js` ja existe e e usado em `profile.js`
9. Recomendacao objetiva de correcao
   - minima: criar checklist/teste de hooks obrigatorios do modal e mover `renderUserCards()` para `features/admin/`
   - estrutural: unificar o markup do modal em uma fonte unica e manter `pages/*.js` apenas como orquestradores

### Baixa

#### F-07 - O feedback do cadastro continua ancorado na area visual do login

Tipo:
- bug de UX localizado

1. Problema
   O cadastro usa o mesmo `data-auth-status` do login, que fica fisicamente abaixo do card de sign-in. Em desktop com cards lado a lado, a mensagem do cadastro aparece longe do formulario que a gerou.
2. Causa estrutural provavel
   Reuso de um unico `createFlash()` para dois formularios diferentes.
3. Onde ocorre exatamente
   - `src/public/pages/index.html:58`
   - `src/public/js/pages/index.js:16`
   - `src/public/js/pages/index.js:23`
   - `src/public/js/pages/index.js:104-159`
4. Em que condicao ocorre
   - erro de validacao local no cadastro
   - erro de API no cadastro
   - desktop com layout em duas colunas
5. Qual o impacto real
   - UX: a associacao entre acao e feedback fica fraca
   - onboarding: a tela inicial parece menos confiavel do que precisa
6. Severidade
   - baixa
7. Grau de confianca
   - alto
8. Evidencia
   - ha apenas um `data-auth-status` no HTML
   - `index.js` usa `authFlash` tanto em `handleLogin()` quanto em `handleRegister()`
9. Recomendacao objetiva de correcao
   - minima: adicionar `data-register-status` abaixo do formulario de cadastro e criar um segundo flash
   - estrutural: encapsular login e cadastro com um helper comum de formulario que receba seu proprio target de status

#### F-10 - O feedback de moderacao ainda esta fora do sistema central de copy e em idioma divergente

Tipo:
- acabamento/copy/polimento

1. Problema
   O sucesso de moderacao usa string em portugues e fora do modulo central de textos, enquanto o restante do frontend segue majoritariamente em ingles e ja possui `UI_TEXT`.
2. Causa estrutural provavel
   Implementacao pontual nao migrada para o sistema central de copy.
3. Onde ocorre exatamente
   - `src/public/js/features/moderation/renderers.js:1-2`
   - `src/public/js/core/ui-text.js:1-45`
4. Em que condicao ocorre
   - apos salvar uma review em feed ou post
5. Qual o impacto real
   - acabamento: quebra de consistencia de linguagem
   - manutencao: copy espalhada fora do ponto central
6. Severidade
   - baixa
7. Grau de confianca
   - alto
8. Evidencia
   - `reviewSavedMessage()` retorna `Avaliacao salva.` / `Avaliacao registrada.`
   - `UI_TEXT` ja centraliza parte importante da copy do frontend
9. Recomendacao objetiva de correcao
   - minima: mover `reviewSavedMessage()` para `core/ui-text.js` e alinhar idioma
   - estrutural: concentrar mensagens de interface novas em `UI_TEXT` como regra de contribuicao

## 5. Achados por pagina

### `index.html`

Contexto da pagina:
- entrada publica para login e criacao de conta
- a pagina atual ja valida token salvo antes de redirecionar ao feed e ja possui campo de confirmacao de senha

Problemas encontrados:
- F-01: o orquestrador e tolerante a hooks ausentes e nao falha de forma explicita se o markup derivar
- F-05: login e cadastro nao desabilitam submit nem sinalizam pending state no proprio controle
- F-07: feedback do cadastro aparece na regiao visual do login

Causa predominante:
- formularios com JS simples e sem helper compartilhado de busy-state
- contrato HTML/JS baseado em seletor informal

Condicao em que ocorre:
- cadastro/login sob rede lenta
- desktop em duas colunas
- futuras edicoes de markup

Impacto:
- onboarding menos confiavel do que deveria
- risco de regressao silenciosa em hooks

Recomendacao:
- separar o `status-line` do cadastro
- adicionar helper de busy-state no submit
- criar assertiva minima de hooks obrigatorios do onboarding

### `feed.html`

Contexto da pagina:
- superficie principal de descoberta publica/autenticada, com busca, alternancia posts/collections, tags seguidas e modal de publicacao

Problemas encontrados:
- F-02: delete de post imediato e permanente
- F-06: UI protegida pode parecer autenticada com token invalido
- F-08: follow/unfollow pequeno para touch
- F-09: modal compartilhado replicado em markup
- F-10: copy de moderacao fora do sistema central

Causa predominante:
- session gating por `hasSession()`
- markup compartilhado repetido
- ausencia de politica unica para acoes destrutivas

Condicao em que ocorre:
- token expirado
- mobile com listas densas de tags
- manutencao futura do modal

Impacto:
- confianca de sessao baixa
- regressao silenciosa em UI compartilhada
- ergonomia pior no mobile

Recomendacao:
- limpar sessao e re-renderizar navbar/controles ao detectar 401
- confirmar delete antes do request
- aumentar alvo touch dos chips
- deduplicar ou blindar o modal

### `post.html`

Contexto da pagina:
- detalhe do post com comentarios, review, questionario, colecoes relacionadas e edicao do proprio post

Problemas encontrados:
- F-02: delete de post imediato
- F-04: composer e edicao de comentario sem refletir limite de 2000 caracteres
- F-05: comentario novo sem busy-state dedicado
- F-06: token invalido ainda pode manter comentarios/review/follow aparentando disponibilidade
- F-08: chips pequenos para touch
- F-09: modal duplicado
- F-10: copy de moderacao fora do sistema central

Causa predominante:
- mistura de bons exemplos de estado (`review`, `commentEdit`) com outros fluxos ainda sem o mesmo nivel de blindagem

Condicao em que ocorre:
- token expirado
- comentario longo
- rede lenta durante envio de comentario

Impacto:
- inconsistencia de estado
- erro evitavel so descoberto apos request
- risco de drift no modal

Recomendacao:
- aplicar `maxlength` e contador
- desabilitar composer durante submit
- alinhar sessao invalida com politica central

### `profile.html`

Contexto da pagina:
- perfil privado com avatar, posts do usuario, metricas e ferramentas administrativas

Problemas encontrados:
- F-02: delete de usuario por admin acontece sem confirmacao
- F-09: modal compartilhado de post duplicado

Causa predominante:
- ausencia de helper de confirmacao destrutiva
- compartilhamento parcial do modal so pelo JS

Condicao em que ocorre:
- uso administrativo
- evolucao futura do modal

Impacto:
- perda irreversivel por clique acidental
- manutencao mais cara do modal

Recomendacao:
- confirmar delete administrativo
- usar a mesma estrategia de blindagem/deduplicacao do modal das outras paginas

### `collections.html`

Contexto da pagina:
- gestao autenticada de colecoes do proprio usuario, com criar/editar/deletar e ordenar itens

Problemas encontrados:
- F-02: delete de colecao imediato
- F-03: `Add to collection` falha em silencio sem selecao
- F-05: flag de busy-state existe, mas nao chega aos controles da lista/modal com a clareza necessaria

Causa predominante:
- renderer e handler usam criterios diferentes de prontidao
- guardas logicas existem, mas sem espelhamento forte no DOM

Condicao em que ocorre:
- rede lenta
- clique repetido
- select ainda em valor vazio

Impacto:
- falha silenciosa
- sensacao de interface travada
- delete perigoso

Recomendacao:
- tornar o botao dependente da selecao atual
- refletir `isManagingCollections` em `disabled`/label dos controles
- adicionar confirmacao de delete

### `collection.html`

Contexto da pagina:
- leitura publica de uma colecao com itens ordenados

Problemas encontrados:
- F-06: navbar/auth UI e renderizada pela presenca do token local, nao pela validacao da sessao

Causa predominante:
- `navbar.refresh()` sem bootstrap de sessao valida

Condicao em que ocorre:
- token expirado ou invalido

Impacto:
- pagina publica aparenta estado autenticado incorreto

Recomendacao:
- validar sessao no boot ou limpar token ao primeiro 401 em pagina publica

### `admin/reviews.html`

Contexto da pagina:
- gestao de elegibilidade e papeis de moderacao por administradores

Problemas encontrados:
- F-09: renderer inline `renderUserCards()` concorre com o renderer administrativo compartilhado

Causa predominante:
- consolidacao incompleta da camada `features/admin/`

Condicao em que ocorre:
- qualquer ajuste visual ou funcional em cards administrativos

Impacto:
- drift de UI e manutencao em duplicidade

Recomendacao:
- mover o renderer inline para `features/admin/` ou reutilizar o existente com opcoes parametrizadas

## 6. Problemas sistemicos/transversais

### Drift HTML x JS x docs

- O frontend depende de HTML estatico enriquecido por `data-*` hooks. Isso e valido para o stack atual, mas o projeto ainda nao blinda esses contratos.
- Quando um hook some, o efeito frequente nao e "erro no boot"; e "parte da feature some". Isso e mais perigoso para regressao, porque o problema pode passar por testes superficiais.
- O caso mais claro hoje e estrutural: `index.js` aceita a ausencia do campo de confirmacao sem falhar, e o controller do modal de post trata muitos hooks como opcionais.
- Areas com maior risco de repeticao do padrao:
  - onboarding (`index.html` + `index.js`)
  - modal compartilhado de post (`feed.html`, `post.html`, `profile.html` + `post-modal.js`)
  - cards administrativos (`admin-reviews.js` versus `features/admin/renderers.js`)

### Contratos implicitos frageis via hooks/selectors

- O contrato real do frontend nao esta so nos arquivos HTML nem so no JS. Ele esta espalhado entre:
  - HTML estatico
  - atributos `data-*`
  - seletores consultados pelos orquestradores
  - renderers compartilhados
  - docs que descrevem o comportamento esperado
- Enquanto isso nao tiver blindagem simples, um ajuste aparentemente inocente de markup pode quebrar comportamento sem erro explicito.

### Padronizacao de estados de formulario e async

- O projeto ja provou que sabe fazer isso bem em `post-modal.js` e nas reviews do feed/post.
- O problema e sistemico: o padrao bom nao virou utilitario nem regra geral.
- Isso explica por que `index.js`, comentario em `post.js` e varias acoes de `collections.js` ficaram para tras.

### Politica fragmentada de sessao invalida

- Algumas telas limpam sessao ao detectar token ruim; outras apenas mostram mensagem ou zeram parte do contexto.
- Resultado: sessao invalida nao tem resposta uniforme e reaparece como bug de consistencia visual.
- O ponto de consolidacao natural e a camada `api.request()` ou um bootstrap comum de paginas publicas.

### Prevencao pratica de regressao

Problemas com maior chance de voltar:
- F-01 e F-09, porque dependem de contratos implicitos e markup duplicado
- F-05, porque cada nova tela pode repetir o padrao "status textual sem busy-state"
- F-06, porque cada pagina publica hoje decide sessao invalida localmente

Blindagens simples que cabem no projeto atual:
- smoke test/checklist de hooks obrigatorios por pagina critica
- helper unico de busy-state para formularios e acoes de lista
- helper unico para confirmacao destrutiva
- politica unica de `401/UNAUTHENTICATED` em pagina publica
- checklist de evolucao do modal compartilhado enquanto a deduplicacao total nao chega

## 7. Falsos positivos evitados / decisoes intencionais respeitadas

- Nao marquei como problema o feed ser estritamente cronologico. Isso e regra central do produto.
- Nao marquei como problema a ausencia de perfil publico navegavel. A documentacao proibe autor publico clicavel.
- Nao marquei como problema o questionario ser corrigido no browser e expor `correctOptionIndex`. Isso esta documentado como escolha de v1.
- Nao marquei como problema usuarios autenticados poderem avaliar os proprios posts. O backend documenta isso explicitamente.
- Nao marquei como problema o modo `Followed tags` de colecoes ignorar tags dos posts internos. Isso e regra definida.
- Nao marquei como problema a inexistencia de light mode. O projeto nao declara sistema de temas alternativos.
- Nao marquei como problema a separacao entre navegacao publica e CRUD do proprietario. Isso e intencional na proposta do sistema.
- Revi o achado anterior sobre "confirmacao de senha ausente" e o retirei como bug atual. O `index.html` local agora contem o campo e os hooks esperados. O que permanece como problema confirmado e o risco estrutural de drift silencioso entre markup e JS.

## 8. Quick wins

- Adicionar um helper unico de confirmacao destrutiva e aplica-lo a deletes de usuario, post e colecao.
- Fazer `Add to collection` depender da selecao atual do `<select>` e exibir mensagem curta quando a selecao for invalida.
- Aplicar `maxlength="2000"` e contador simples nos comentarios de criar/editar.
- Criar um helper pequeno de busy-state e usa-lo em login, cadastro, comentario e acoes de colecao.
- Adicionar `assertRequiredElements()` para hooks criticos do onboarding e do modal compartilhado.

## 9. Correcoes estruturais

- Blindar contratos entre markup e JS:
  - minima: assertivas de hooks obrigatorios no boot das paginas criticas
  - estrutural: gerar superfices compartilhadas a partir de uma unica fonte de markup
- Padronizar pending/busy-state:
  - minima: helper comum para `disabled`, label temporario e restauracao de foco
  - estrutural: tornar `busy` parte do contrato entre orquestradores e renderers
- Criar politica unica de sessao invalida em paginas publicas:
  - minima: limpar token e ressincronizar navbar ao detectar 401
  - estrutural: centralizar a decisao na camada HTTP/bootstrap
- Reduzir drift de UI compartilhada:
  - mover renderers administrativos residuais para `features/admin/`
  - deduplicar o modal de post
- Centralizar copy nova em `core/ui-text.js` para evitar strings soltas e divergencia de idioma

## 10. Ordem sugerida de priorizacao

- Prioridade 1: confianca e prevencao de erro irreversivel
  - F-02 acoes destrutivas sem confirmacao
  - F-03 CTA de colecao com falha silenciosa
  - F-04 limite de comentario so no backend
  - F-07 feedback do cadastro mal ancorado

- Prioridade 2: consistencia de estado e verdade da sessao
  - F-05 busy-state inconsistente
  - F-06 UI aparentemente autenticada com token invalido

- Prioridade 3: prevencao de regressao e manutencao
  - F-01 contratos implicitos entre HTML/JS/docs
  - F-09 duplicacao e drift de UI compartilhada

- Prioridade 4: ergonomia e acabamento
  - F-08 chips touch pequenos
  - F-10 copy de moderacao fora do sistema central
