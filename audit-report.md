# Auditoria Contextual do Projeto

## 1. Resumo executivo

Estado geral validado:
- O projeto segue acima da media para o escopo academico: backend modular coerente, docs tecnicas fortes, contrato HTTP consistente, frontend organizado por pagina/orquestrador/renderers e boa disciplina recente de changelog.
- Nao encontrei achados criticos no backend ou no contrato publico durante a revisao de docs, rotas montadas em `src/server.js` e inventario de `src/modules/*/routes/*.js`.
- O relatorio anterior ficou parcialmente desatualizado. Algumas fragilidades que eram reais ja foram corrigidas e hoje precisam sair da lista principal para nao virar falso positivo.

Maiores riscos atuais:
- acoes destrutivas ainda fragmentadas: colecoes e contas ja tem confirmacao forte, mas posts e comentarios ainda podem ser apagados imediatamente
- estado de autenticacao ainda e dirigido demais por `token presente` em varias superficies, o que deixa paginas publicas e administrativas parecerem autenticadas mesmo quando a sessao real ja falhou
- o frontend continua dependendo de contratos implicitos entre HTML estatico, hooks `data-*` e controladores compartilhados, especialmente no modal de post
- a base ja tem testes e smoke scripts uteis, mas a validacao automatizada rapida ainda e estreita para o tamanho atual do produto

Padroes positivos confirmados:
- docs em `docs/` continuam sendo a fonte de verdade mais confiavel do projeto
- arquitetura `routes/controllers/services/repositories` esta aplicada de forma consistente
- o contrato `{ ok, data/error }` esta documentado e alinhado com a estrutura do backend
- o projeto ganhou endurecimentos importantes desde a auditoria anterior: confirmacao de senha no cadastro, modal de delete de colecao, modal de delete administrativo com preview, limite de comentario espelhado no frontend e correcao do CTA `Add to collection`

Observacao metodologica:
- Esta versao foi refeita com base no estado atual do repositorio.
- O relatorio antigo foi usado apenas como referencia para verificar o que ainda era verdadeiro e o que ja ficou para tras.
- Rodei a suite rapida com `node --test --test-isolation=none tests/*.test.js`: 13 testes, 13 aprovados.
- Nao rodei os smoke scripts dependentes de app + Mongo (`test:smoke` e `test:populate`) nesta revisao; eles foram lidos e considerados como parte do diagnostico de cobertura, nao como execucao validada.

## 2. Entendimento atual do projeto

Escopo funcional confirmado no estado atual:
- autenticacao JWT
- perfil autenticado com metricas privadas
- posts com imagens, sequenciamento e questionarios opcionais
- comentarios
- feed cronologico publico e feed cronologico por tags seguidas
- colecoes publicas com CRUD do dono em tela dedicada
- avatar
- moderacao binaria e reputacao publica derivada
- delecao compartilhada de conta com limpeza de dados relacionados
- painel administrativo com elegibilidade de moderador e delete de usuario com preview de impacto

Arquitetura validada:
- backend Node.js + Express 5 + MongoDB/Mongoose
- composicao central em `src/server.js`
- modulos ativos: `auth`, `users`, `posts`, `comments`, `feed`, `collections`, `admin`, `moderation`
- frontend estatico servido de `src/public`, com scripts em `pages/`, renderers em `features/`, helpers compartilhados em `core/` e `components/`

Leitura de maturidade atual:
- o backend esta mais maduro do que o README principal sugere
- o frontend melhorou em varios fluxos desde meados de marco, mas ainda carrega divida estrutural tipica de HTML estatico com markup compartilhado repetido
- a documentacao tecnica esta mais atual do que a documentacao publica de apresentacao

## 3. Metodologia, fontes e criterio de classificacao

Fontes auditadas:
- `AGENTS.md`
- `docs/README.md`
- `docs/architecture/system-overview.md`
- `docs/architecture/backend-modules.md`
- `docs/architecture/frontend-overview.md`
- `docs/api/http-contract.md`
- `docs/api/endpoints.md`
- `docs/workflows/feature-process.md`
- `docs/workflows/bugfix-process.md`
- `README.md`
- `CHANGELOG.md`
- `src/server.js`
- `src/modules/**/*`
- `src/public/pages/**/*`
- `src/public/js/**/*`
- `tests/*`
- `scripts/smoke-permissions.mjs`
- `scripts/test-populate-smoke.mjs`

Criterio usado:
- so entram como achado principal problemas confirmados no codigo atual, na documentacao atual ou na relacao entre ambas
- problemas corrigidos desde a auditoria anterior ficam em secao de reclassificacao, nao em findings ativos
- decisoes intencionais documentadas nao foram tratadas como bug

Escala de severidade:
- `Critica`: risco direto de seguranca, perda irreversivel grave, quebra ampla de contrato ou falha estrutural central
- `Alta`: impacto real relevante ao usuario ou ao produto, com alta chance de incidente funcional ou regressao importante
- `Media`: problema real, fragilidade de manutencao ou cobertura insuficiente com impacto frequente, mas contornavel
- `Baixa`: inconsistencia localizada, drift documental/publico ou debito de UX/robustez com impacto menor

Escala de necessidade de resolucao:
- `Imediata`
- `Proxima sprint`
- `Planejar`
- `Oportunista`

## 4. Achados por severidade

### Alta

#### A-01 - Posts e comentarios ainda podem ser excluidos sem confirmacao intermediaria

Tipo:
- bug funcional/UX real
- consistencia de safety incompleta

Severidade:
- alta

Necessidade de resolucao:
- imediata

Confianca:
- alta

1. Problema
   Posts no feed, posts no detalhe e comentarios no detalhe ainda podem ser apagados imediatamente apos o clique. Nao ha confirmacao intermediaria nem protecao verbal equivalente ao que o projeto ja implementou para delete de colecao, delete administrativo e autoexclusao.
2. Onde e evidencia
   - `src/public/js/features/feed/renderers.js:144` expoe botao `Delete` para post no feed
   - `src/public/js/pages/feed.js:740-742` chama `api.posts.delete(postId)` diretamente
   - `src/public/js/features/post/renderers.js:138` expoe botao `Delete` para comentario
   - `src/public/js/features/post/renderers.js:242` expoe botao `Delete post` no detalhe
   - `src/public/js/pages/post.js:500-502` chama `api.posts.delete(state.postId)` diretamente
   - `src/public/js/pages/post.js:728-730` chama `api.comments.delete(commentId)` diretamente
3. Em que situacao ocorre
   - autor do post
   - moderador ou admin apagando post alheio
   - autor do comentario
   - moderador ou admin apagando comentario alheio
   - mouse, touch ou teclado
4. Como o problema se manifesta
   O clique dispara a request destrutiva sem uma segunda etapa de intencao explicita. O feedback visual atual e apenas `Deleting...`, quando a remocao ja esta em curso.
5. Causa-raiz
   A politica de acoes destrutivas foi endurecida por fluxo, nao por regra compartilhada. O projeto criou modais seguros para colecao e conta, mas os handlers antigos de post/comentario continuaram chamando o endpoint direto.
6. Por que isso ainda acontece
   Nao existe helper unificado de confirmacao destrutiva nem uma politica transversal aplicada a todos os deletes. Cada pagina decide sozinha como apagar.
7. Impacto real
   - perda de conteudo por misclick
   - experiencia inconsistente: o sistema trata delecao de colecao/conta como perigosa, mas post/comentario como acao comum
   - maior risco em mobile e em moderacao, onde o operador faz mais cliques destrutivos em sequencia
8. Diagnostico
   O problema ja nao e ausencia total de protecao destrutiva no projeto. O problema atual e fragmentacao de padrao. Isso torna o sistema enganoso: parte da UI ensina o usuario a esperar confirmacao, parte nao.
9. Recomendacao objetiva
   - minima: exigir confirmacao nativa antes de `api.posts.delete(...)` e `api.comments.delete(...)`
   - estrutural: criar um helper unico de confirmacao destrutiva para post, comentario, colecao e conta, com copy, busy-state e variante de risco padronizados

#### A-02 - Varias paginas continuam tratando `token local` como sessao valida demais

Tipo:
- inconsistencia de autenticacao/UX
- falha parcial de resiliencia de sessao

Severidade:
- alta

Necessidade de resolucao:
- proxima sprint

Confianca:
- alta

1. Problema
   Em varias superficies, a UI autenticada ainda depende principalmente de `hasSession()` e, portanto, da mera existencia do token local. Quando a sessao real falha no backend, a interface nem sempre limpa a sessao, esconde controles protegidos ou redireciona.
2. Onde e evidencia
   - `src/public/js/components/navbar.js:12` calcula estado autenticado so por `hasSession()`
   - `src/public/js/core/session.js:3` define sessao como `Boolean(auth.getToken())`
   - `src/public/js/pages/feed.js:571-585` usa `Promise.allSettled([api.users.meProfile(), api.users.listFollowedTags()])`; se o perfil falha, apenas zera `viewerRole/viewerId`, sem `clearSession()`
   - `src/public/js/pages/feed.js:896` chama `navbar.refresh()` antes da sincronizacao de contexto
   - `src/public/js/pages/post.js:357-371` repete o mesmo padrao de `Promise.allSettled(...)` sem limpar sessao
   - `src/public/js/pages/collection.js:109-123` repete o mesmo padrao sem limpar sessao
   - `src/public/js/pages/admin-reviews.js:143-164` confia em `hasSession()` e, em caso de falha/403, apenas mostra erro
   - por contraste, `src/public/js/pages/profile.js:357-365` e `src/public/js/pages/collections.js:84-92` ja tem `handleAuthFailure()` com `clearSession()` + redirect
3. Em que situacao ocorre
   - token expirado
   - conta deletada ou invalida
   - JWT assinado com segredo antigo
   - usuario abre `feed.html`, `post.html`, `collection.html` ou `admin/reviews.html` com token stale no navegador
4. Como o problema se manifesta
   - navbar e controles protegidos podem aparecer como se a sessao ainda existisse
   - botoes de seguir tag, revisar post, navegar como admin ou abrir modais continuam visiveis em contexto parcialmente autenticado
   - a pagina falha depois, na API, com mensagens de auth ou estado "meio logado"
5. Causa-raiz
   O projeto resolveu corretamente a validacao de sessao na home (`index.html`), mas ainda nao propagou o mesmo modelo de "sessao tentativa ate revalidacao" para o restante das telas.
6. Por que isso ainda acontece
   A regra de auth state esta espalhada:
   - navbar usa apenas token local
   - algumas paginas tem `handleAuthFailure`
   - outras tratam 401 como um erro qualquer e nao como encerramento de sessao
7. Impacto real
   - UX enganosa e repeticao de erros 401
   - telas publicas parecem autenticadas sem que a sessao realmente exista
   - superficie administrativa pode parecer acessivel ate a API negar
   - aumenta suporte manual e dificulta depuracao de bugs relatados como "estou logado, mas nada funciona"
8. Diagnostico
   O backend continua seguro porque a API rejeita o token invalido. O problema esta no frontend, que ainda nao tem uma politica unica de invalidacao/reauth. E um bug de coerencia de sessao, nao uma quebra de autorizacao do servidor.
9. Recomendacao objetiva
   - minima: tratar 401/`UNAUTHENTICATED` como encerramento de sessao em `feed.js`, `post.js`, `collection.js` e `admin-reviews.js`
   - estrutural: centralizar uma camada de `syncSession()`/`handleAuthFailure()` compartilhada e mudar a navbar para estado "tentativo" ate a revalidacao do perfil concluir

### Media

#### M-01 - O modal compartilhado de post ainda depende de markup duplicado e contratos de DOM implicitos

Tipo:
- debito arquitetural de frontend
- risco de regressao silenciosa

Severidade:
- media

Necessidade de resolucao:
- proxima sprint

Confianca:
- alta

1. Problema
   O controlador compartilhado do modal de post evoluiu bastante, mas a fonte de markup continua duplicada em tres HTMLs e o proprio controller aceita varios hooks opcionais. Isso deixa o frontend vulneravel a drift parcial: uma pagina pode perder um controle sem falhar de forma clara no boot.
2. Onde e evidencia
   - o markup do modal esta repetido em:
     - `src/public/pages/feed.html:101-187`
     - `src/public/pages/post.html:45-127`
     - `src/public/pages/profile.html:108-187`
   - `src/public/js/features/posts/post-modal.js:41-45` busca hooks opcionais como `questionnaireShell`, `questionnaireToggle`, `questionnairePanel` e `mediaSummary`
   - `src/public/js/features/posts/post-modal.js:52-85` e `:260-289` seguem operando mesmo quando parte desses hooks nao existe
   - `src/public/js/pages/admin-reviews.js:55-125` ainda define `renderUserCards()` inline, apesar de ja existir `src/public/js/features/admin/renderers.js`
3. Em que situacao ocorre
   - quando o modal compartilhado ganha um novo elemento e uma das paginas nao replica o HTML inteiro
   - quando um hook `data-*` muda de nome em apenas uma superficie
   - quando a view administrativa evolui e a pagina inline esquece de acompanhar o renderer compartilhado
4. Como o problema se manifesta
   Em vez de um erro claro de inicializacao, a tela pode continuar abrindo com funcionalidade parcial: helper text ausente, estado de questionario quebrado, resumo de imagens faltando, renderer administrativo divergente, etc.
5. Causa-raiz
   O projeto compartilha comportamento, mas nao compartilha a fonte de markup. O contrato entre HTML e JS existe, mas ainda e informal.
6. Por que isso ainda acontece
   O frontend foi estruturado corretamente em `pages/` e `features/`, mas ainda nao deu o passo seguinte de formalizar o markup compartilhado mais sensivel.
7. Impacto real
   - regressao silenciosa
   - manutencao mais cara
   - maior risco sempre que o modal de post ou as views administrativas forem refinados
8. Diagnostico
   Nao e um bug isolado de uma tela. E um risco estrutural do frontend estatico atual. O projeto ja amadureceu o suficiente para esse problema pesar mais do que no inicio.
9. Recomendacao objetiva
   - minima: adicionar `assertRequiredElements()` para hooks obrigatorios do modal e eliminar renderers inline restantes
   - estrutural: centralizar o markup do modal de post em template/shared renderer unico e consolidar a renderizacao administrativa em `features/admin/`

#### M-02 - A base ja tem testes uteis, mas a validacao automatizada rapida ainda e estreita para o tamanho atual do produto

Tipo:
- risco de regressao
- cobertura automatizada insuficiente para o escopo atual

Severidade:
- media

Necessidade de resolucao:
- planejar

Confianca:
- alta

1. Problema
   O projeto nao esta sem testes, mas a cobertura automatizada rapida ainda se concentra em helpers e utilitarios compartilhados. O produto hoje inclui auth, papeis, deletes destrutivos, colecoes, questionarios, uploads, perfil, avatar e fluxos administrativos, sem uma suite rapida proporcional a esse escopo.
2. Onde e evidencia
   - `tests/approval-status.test.js` cobre paleta de status/reputacao
   - `tests/content-tags.test.js` cobre alinhamento frontend/backend de tags
   - `tests/post-media-selection.test.js` cobre acumulacao de imagens no modal
   - `package.json:7-14` nao expoe um `npm test` padrao; os scripts sao `test:smoke`, `test:populate`, `demo:*`
   - `scripts/smoke-permissions.mjs` cobre permissoes basicas de auth/post/comment/followed tags
   - `scripts/test-populate-smoke.mjs` e mais amplo, mas depende de app + Mongo + seed controlado
3. Em que situacao ocorre
   - regressao em service/controller/repository
   - mudancas em auth/roles/delete/account cleanup
   - drift entre contrato de endpoint e implementacao
4. Como o problema se manifesta
   O projeto depende relativamente mais de leitura manual, smoke local e disciplina do changelog/docs para manter confiabilidade. Isso funciona, mas escala pior conforme o escopo cresce.
5. Causa-raiz
   A estrategia de validacao cresceu por acumulacao de scripts uteis e docs de runbook, mas sem um degrau intermediario de testes automatizados rapidos e padronizados para o fluxo cotidiano.
6. Por que isso ainda acontece
   O repositorio priorizou primeiro produto, documentacao e smoke realista. A camada de testes de service/route/contract ainda nao acompanhou o mesmo ritmo.
7. Impacto real
   - regressao funcional pode escapar ate smoke manual
   - contribuidores novos nao encontram um caminho obvio tipo `npm test`
   - fluxos centrais do backend ficam menos blindados do que o frontend compartilhado
8. Diagnostico
   O ponto fraco aqui nao e "testes quebrados". Pelo contrario: a suite rapida passou inteira quando executada com `node --test --test-isolation=none`. O problema e cobertura e ergonomia de execucao, nao qualidade zero de teste.
9. Recomendacao objetiva
   - minima: adicionar `npm test` como agregador da suite rapida atual e documentar quando usar smoke
   - estrutural: expandir testes de service/route para auth, posts, comments, collections, account deletion e auth failure handling

### Baixa

#### B-01 - O README principal ficou materialmente atras do escopo real do produto

Tipo:
- drift de documentacao publica
- risco de onboarding/portfolio

Severidade:
- baixa

Necessidade de resolucao:
- planejar

Confianca:
- alta

1. Problema
   O `README.md` principal ainda descreve uma versao menor do sistema. Ele continua util como apresentacao curta, mas ja nao comunica varias capacidades relevantes que existem hoje.
2. Onde e evidencia
   - `README.md:39-49` lista funcionalidades principais sem citar colecoes, tags seguidas, avatar, uploads de imagem, questionarios, account deletion ou feed de colecoes
   - `README.md:215-223` lista paginas disponiveis sem citar `collections.html` nem `collection.html`
   - por contraste, esses recursos estao refletidos em `docs/architecture/*`, `docs/api/*`, `src/modules/*` e `src/public/pages/*`
3. Em que situacao ocorre
   - primeira leitura do repositorio no GitHub
   - avaliacao academica/portfolio sem entrar em `docs/`
4. Como o problema se manifesta
   O leitor entende um produto menor e mais simples do que o repositorio realmente entrega.
5. Causa-raiz
   A documentacao tecnica evoluiu junto do codigo. O README principal parou em um snapshot mais antigo do escopo.
6. Por que isso importa
   Neste projeto, o README tambem funciona como vitrine publica. Drift ali nao quebra runtime, mas enfraquece apresentacao e onboarding.
7. Impacto real
   - leitura inicial subestima o projeto
   - risco de avaliador achar que docs e codigo estao desalinhados
8. Diagnostico
   Nao e um problema de produto nem de API. E um problema de representacao publica do estado atual.
9. Recomendacao objetiva
   - minima: atualizar lista de funcionalidades e paginas
   - estrutural: tratar o README principal como resumo de alto nivel sincronizado com `docs/README.md`

#### B-02 - A tela inicial ainda concentra feedback de login e cadastro em um unico ponto visual e sem busy-state

Tipo:
- bug de UX localizado
- padrao async incompleto

Severidade:
- baixa

Necessidade de resolucao:
- oportunista

Confianca:
- alta

1. Problema
   Login e cadastro compartilham um unico `status-line`, posicionado no card de login, e nenhum dos fluxos tem estado de submissao com disable de botao ou texto de carregamento.
2. Onde e evidencia
   - `src/public/pages/index.html:58` declara apenas um `data-auth-status`, localizado no card `Sign in`
   - `src/public/js/pages/index.js:23` cria um unico `authFlash`
   - `src/public/js/pages/index.js:104-137` usa esse mesmo `authFlash` para erros de cadastro
   - `src/public/js/pages/index.js:139-160` usa o mesmo `authFlash` para login
   - nao existe `isSubmitting`, `disabled` ou troca de label de botao nesses handlers
3. Em que situacao ocorre
   - erro de cadastro
   - rede lenta no login
   - clique repetido enquanto a request ainda nao terminou
4. Como o problema se manifesta
   - mensagem de cadastro aparece visualmente ancorada na area de login
   - usuario nao recebe pista forte de que a submissao esta em andamento
5. Causa-raiz
   A pagina tem duas experiencias distintas, mas o feedback assincrono continua centralizado como se fosse um unico formulario.
6. Por que isso ainda acontece
   O fluxo foi endurecido em validacao de senha, mas nao em feedback operacional.
7. Impacto real
   - confusao moderada na UX de cadastro
   - chance de duplo envio em rede lenta
8. Diagnostico
   E um debito localizado, nao um problema sistmico comparavel aos dois achados altos.
9. Recomendacao objetiva
   - minima: adicionar `status-line` dedicado para cadastro ou mover o status compartilhado para uma zona neutra acima dos cards
   - estrutural: introduzir `isSubmitting` para login/cadastro com disable de botao e copy de pending

## 5. Falsos positivos removidos ou reclassificados

Itens do relatorio anterior que ja nao devem seguir como problema ativo:
- O limite de 2000 caracteres de comentario ja esta refletido no frontend:
  - `src/public/pages/post.html:39`
  - `src/public/js/features/post/renderers.js:102`
  - `src/public/js/features/post/constants.js:1`
- O CTA `Add to collection` ja nao sai silenciosamente sem selecao:
  - o botao nasce desabilitado em `src/public/js/features/profile/content-renderers.js:157-165`
  - o handler mostra feedback explicito em `src/public/js/pages/collections.js:646-654`
- Colecao ja possui modal de confirmacao de delete:
  - `src/public/pages/collections.html:66`
  - `src/public/js/pages/collections.js:290` e `:398`
- Delete administrativo de usuario ja possui preview + confirmacao contextual:
  - `src/public/pages/profile.html:49`
  - `src/public/js/pages/profile.js:505`
- Confirmacao de senha no cadastro ja foi restaurada:
  - `src/public/pages/index.html:90-103`
  - `src/public/js/pages/index.js:87-99`
- A suite rapida atual nao esta quebrada:
  - `node --test --test-isolation=none tests/*.test.js` passou com `13/13`

## 6. Diagnostico sistemico

O estado atual do projeto nao aponta para "arquitetura errada" nem para "backend fora de controle". O diagnostico mais fiel hoje e este:
- o backend esta bem orientado por docs, modulo e contrato
- o frontend melhorou bastante, mas os problemas remanescentes sao de consolidacao de padrao
- a maior fragilidade ja nao esta em validacao basica de formulario; esta em coerencia transversal entre telas
- a documentacao tecnica esta forte, mas a camada publica de apresentacao e a camada de teste rapido ainda nao acompanham totalmente o escopo atual

Em termos praticos, o projeto entrou numa fase em que os maiores ganhos nao vem de adicionar mais feature. Vem de consolidar quatro politicas transversais:
- auth failure handling
- confirmacao destrutiva
- contratos de markup compartilhado
- validacao automatizada rapida

## 7. Priorizacao recomendada

Ordem sugerida:
1. Resolver `A-01` e `A-02`
   - sao os problemas mais perceptiveis ao usuario e os mais propensos a gerar erro operacional real
2. Resolver `M-01`
   - reduz regressao silenciosa e baixa custo de manutencao do frontend
3. Resolver `M-02`
   - importante para estabilizar crescimento futuro e proteger fluxos centrais
4. Resolver `B-01` e `B-02`
   - ganhos de apresentacao, onboarding e acabamento de UX

Quick wins de baixo custo:
- adicionar confirmacao nativa aos deletes de post/comentario
- reaproveitar `handleAuthFailure()` ja existente em `profile.js`/`collections.js`
- expor `npm test` para a suite rapida atual
- corrigir o README principal
- separar visualmente feedback de login e cadastro

Correcao estrutural mais valiosa:
- criar uma politica compartilhada de sessao e acoes destrutivas, em vez de continuar resolvendo isso tela a tela
