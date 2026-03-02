# The Social Network

Rede social anti-ego, anti-algoritmo e centrada em conhecimento.

## Objetivo deste documento

Este README é o guia oficial de produto, design e arquitetura técnica do projeto. Ele existe para alinhar implementações futuras com regras inegociáveis de experiência, identidade visual e contratos de dados.

Este documento não é um roadmap por fases. Ele define o padrão que qualquer evolução deve seguir.

## Estado atual do projeto (base real)

Stack atualmente configurada no repositório:

- Node.js + Express (`src/server.js`)
- MongoDB + Mongoose (`src/config/db.js`)
- Frontend em HTML/CSS/JS puros (`src/public/pages`, `src/public/css`, `src/public/js`)

Status da base:

- Servidor inicial funcional com rota `GET /`.
- Conexão com MongoDB local (`mongodb://localhost:27017/thesocial`).
- Estrutura de pastas de modelos e middlewares criada, com implementações ainda pendentes.
- Estrutura de páginas públicas/admin criada, com TODOs de interface e integração.

## Identidade do produto

The Social Network é uma plataforma social educacional e cronológica. A lógica central é remover mecanismos de validação social pública e priorizar conteúdo útil.

Princípios obrigatórios:

- Conteúdo acima do autor.
- Conhecimento acima da validação.
- Cronologia acima de algoritmo.
- Sem hierarquia social visível.

## Regras de plataforma (obrigatórias)

### 1) Conta e perfil

- Login obrigatório para publicar e interagir.
- Nome de usuário visível.
- Sem seguidores.
- Sem contagem pública de amigos.
- Perfil discreto (não-vitrine).

### 2) Feed

- Ordem 100% cronológica (mais recente primeiro).
- Sem algoritmo de recomendação.
- Sem personalização por relevância comportamental.

### 3) Conteúdo

- Foco em publicações educacionais e informativas.
- Posts devem ensinar, explicar, refletir ou compartilhar conhecimento útil.
- Autopromoção não é foco da plataforma.

### 4) Interações

Interação binária em posts:

- `Aprovado`
- `Não relevante`

Regras:

- Sem contagens públicas de interação.
- Público vê apenas tendência visual (sem números).
- Autor vê métricas privadas percentuais do próprio conteúdo.
- Sem ranking entre usuários.

### 5) Governança

- Módulo de review/moderação é privado.
- Regras de permissão por papéis (ex.: `admin`, `moderator`).

## Guia de design (decisão oficial)

O design deve ser consistente, silencioso e intencional. Evitar aparência corporativa padrão de SaaS.

### Direção visual

- Tema único escuro (dark-only).
- Estética minimalista com espaçamento amplo (Void).
- Textura visual sutil (partículas/estática leve), sem exagero.
- Leve personalidade de "desenhado" em detalhes pontuais, sem comprometer legibilidade.

### Tokens oficiais

Implementar variáveis globais (CSS custom properties) com os seguintes valores base:

#### Cores

- `--bg-0: #0b0d10` (fundo principal)
- `--bg-1: #12161b` (superfícies)
- `--bg-2: #181e25` (camadas elevadas)
- `--text-0: #e6ebf2` (texto principal)
- `--text-1: #a8b0bc` (texto secundário)
- `--line-0: #2a3340` (bordas/divisores)
- `--ok-0: #9bb6a6` (tendência positiva, dessaturada)
- `--warn-0: #b7ab91` (tendência neutra/atenção)
- `--bad-0: #b59898` (tendência negativa, dessaturada)

Regras de cor:

- Proibido uso de cores neon/saturadas no feed.
- Proibido gradiente chamativo em áreas de leitura.
- Cor serve hierarquia, não decoração.

#### Tipografia

- Fonte base recomendada: `"Space Grotesk", "IBM Plex Sans", "Segoe UI", sans-serif`
- Fonte de personalidade (uso pontual): `"Caveat", "Patrick Hand", cursive`

Regras tipográficas:

- Corpo de texto sempre com fonte base.
- Fonte de personalidade apenas em labels curtos, detalhes de destaque e sublinhados.
- Não usar estilo infantil/cartunesco.

#### Escala de espaçamento

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 24px`
- `--space-6: 32px`
- `--space-7: 48px`
- `--space-8: 64px`

Regra de layout:

- Telas principais com respiração vertical generosa (`--space-6` para cima).
- Densidade visual baixa por padrão.

#### Bordas e profundidade

- `--radius-1: 8px`
- `--radius-2: 12px`
- `--radius-3: 16px`
- Borda padrão: `1px solid var(--line-0)`
- Sombra padrão: `0 8px 24px rgba(0, 0, 0, 0.28)`

#### Motion

- Duração curta: `120ms`
- Duração média: `220ms`
- Curva padrão: `cubic-bezier(0.2, 0.8, 0.2, 1)`

Regras de movimento:

- Animação deve ser quase imperceptível.
- Sem glitches agressivos, flicker rápido ou deslocamentos bruscos.
- Sempre respeitar `prefers-reduced-motion`.

### Componentes de interface (contrato visual)

#### Card de post

- Prioridade total ao conteúdo textual.
- Cabeçalho discreto (autor + data + contexto mínimo).
- Rodapé com ações binárias (`Aprovado` / `Não relevante`) sem contadores.

#### Indicador de tendência (público)

Estados permitidos:

- `positive`
- `neutral`
- `negative`

Regras:

- Exibir tendência por cor/ícone/label curto.
- Nunca exibir número absoluto de votos no público.

#### Perfil

- Bloco simples com identidade e histórico básico.
- Exibir métricas privadas apenas para o próprio usuário autenticado.

#### Painel admin/reviews

- Interface funcional e objetiva.
- Não compartilhar visual/rotas com área pública.
- Deve evidenciar status de decisão e histórico de review.

### Microcopy e tom de UX

Tom oficial: neutro técnico.

Regras de escrita:

- Frases curtas e claras.
- Sem linguagem agressiva.
- Sem ironia pesada.
- Evitar jargões corporativos.

Exemplos aprovados:

- "Feed cronológico. Sem recomendação automática."
- "Interação registrada."
- "Este indicador não exibe contagens públicas."

## Arquitetura técnica

### Baseline oficial

- Runtime: Node.js
- Backend: Express
- Banco: MongoDB + Mongoose
- Frontend: HTML/CSS/JS puro

### Estrutura esperada de responsabilidade

- `src/server.js`: bootstrap da API e middlewares globais.
- `src/config/`: configurações de infraestrutura (DB, env, etc.).
- `src/models/`: schemas e regras de persistência.
- `src/middleware/`: autenticação e autorização por papel.
- `src/public/pages/`: interfaces estáticas por contexto (público/admin).
- `src/public/css/`: estilos e tokens globais.
- `src/public/js/`: comportamentos de UI e integração com API.

## Contratos de API (base)

Todos os endpoints abaixo são contratos de referência para implementação.

### Convenção de resposta

Sucesso:

```json
{
  "ok": true,
  "data": {}
}
```

Erro:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição objetiva"
  }
}
```

### Endpoints base

#### `POST /auth/register`

Cria conta de usuário.

Entrada mínima:

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

#### `POST /auth/login`

Autentica usuário e retorna token de sessão.

Entrada mínima:

```json
{
  "email": "string",
  "password": "string"
}
```

#### `GET /feed`

Retorna posts publicados em ordem cronológica descendente.

Parâmetros opcionais:

- `cursor` (paginação)
- `limit`

Resposta não deve incluir contadores públicos de validação.

#### `POST /posts`

Cria post do usuário autenticado.

Entrada mínima:

```json
{
  "title": "string",
  "content": "string",
  "tags": ["string"]
}
```

#### `GET /posts/:id`

Retorna detalhe do post + comentários.

#### `POST /posts/:id/review`

Registra avaliação binária.

Entrada permitida:

```json
{
  "decision": "approved"
}
```

ou

```json
{
  "decision": "not_relevant"
}
```

#### `GET /me/profile`

Retorna perfil do usuário autenticado com métricas privadas (percentuais), sem comparação pública.

## Modelos de dados (base MongoDB)

Campos abaixo são o contrato inicial de schema. Ajustes são permitidos desde que não violem regras de produto.

### `User`

- `username: string` (único)
- `email: string` (único)
- `passwordHash: string`
- `role: "user" | "moderator" | "admin"`
- `privateMetrics.approvalRate: number` (0-100)
- `privateMetrics.rejectionRate: number` (0-100)
- `createdAt: Date`
- `updatedAt: Date`

### `Post`

- `authorId: ObjectId(User)`
- `title: string`
- `content: string`
- `tags: string[]`
- `status: "published" | "hidden" | "pending_review"`
- `trend: "positive" | "neutral" | "negative"`
- `createdAt: Date`
- `updatedAt: Date`

### `PostReview`

- `postId: ObjectId(Post)`
- `reviewerId: ObjectId(User)`
- `decision: "approved" | "not_relevant"`
- `reason: string | null`
- `createdAt: Date`

### `Comment`

- `postId: ObjectId(Post)`
- `authorId: ObjectId(User)`
- `content: string`
- `status: "visible" | "hidden"`
- `createdAt: Date`
- `updatedAt: Date`

## Regras de segurança e permissão

- Rotas privadas exigem autenticação.
- Rotas de review/moderação exigem papel autorizado (`admin` ou `moderator`).
- Dados privados de métricas só podem ser lidos pelo próprio dono da conta.
- Validar payloads em todas as entradas de API.

## Padrões de qualidade para contribuições

Toda contribuição deve preservar:

- Feed estritamente cronológico.
- Ausência de métricas sociais públicas.
- Coerência visual com tokens oficiais.
- Legibilidade em dark-only (desktop e mobile).
- Contratos de API e schema definidos neste README.

## Cenários de teste obrigatórios

- Ordenação cronológica correta do feed.
- API não expõe números públicos de validação.
- Usuário autenticado visualiza apenas suas métricas privadas.
- Usuário não autenticado não acessa rotas privadas.
- Usuário sem role adequada não acessa reviews administrativas.
- UI respeita contraste mínimo e consistência de tokens.

## Não-objetivos explícitos

Este produto não é:

- Instagram clone
- LinkedIn clone
- TikTok clone
- Plataforma de competição por status
- Plataforma de exibição de popularidade por número

## Regra de governança do próprio README

Se houver conflito entre implementação e este documento, a implementação deve ser ajustada para aderir ao README, ou o README deve ser revisado conscientemente antes da mudança.
