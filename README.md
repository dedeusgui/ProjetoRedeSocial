# The Social Network

Rede social anti-ego, anti-algoritmo e centrada em conhecimento.

## Visão geral

Este projeto implementa uma API REST + frontend estático com foco em:

- feed cronológico (sem recomendação algorítmica)
- interação binária em posts (`approved` e `not_relevant`)
- percentual público de aprovação por post
- métricas agregadas do usuário em contexto autenticado
- governança por papéis (`user`, `moderator`, `admin`)

## Engineering docs hub

For implementation workflows, architecture references, and API contracts, use:

- [`docs/README.md`](docs/README.md)
- [`AGENTS.md`](AGENTS.md) (agent/dev collaboration policy and decision gate)

## Agent collaboration policy

Antes de implementar qualquer mudança, consulte:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/README.md`](docs/README.md)

Regras principais:

- documentação primeiro, implementação depois
- decisões de alto impacto devem ser confirmadas com o dev
- agentes devem trazer opções concretas com recomendação e tradeoff
- projeto acadêmico com execução profissional: decisões rastreáveis e docs atualizados no mesmo PR

## Estado atual (implementado)

A base foi evoluída para **monólito modular** com camadas por módulo:

- `routes` (HTTP)
- `controllers` (entrada/saída)
- `services` (regras de negócio)
- `repositories` (persistência)

Módulos ativos:

- `auth`
- `users`
- `posts`
- `comments`
- `feed`
- `admin`
- `moderation`

## Stack técnica

- Node.js (ESM)
- Express 5
- MongoDB + Mongoose
- Frontend em HTML/CSS/JS puro

## Estrutura do projeto

```text
src/
  common/
    errors/
    http/
    security/
    validation/
  config/
    db.js
    env.js
  middleware/
    auth.js
    roles.js
  models/
    user.js
    post.js
    post_review.js
    comment.js
  modules/
    auth/
    users/
    posts/
    comments/
    feed/
    admin/
    moderation/
  public/
    css/
    js/
    pages/
  server.js
```

## Responsabilidade por módulo

### Auth

- cadastro (`register`)
- login (`login`)
- emissão de JWT Bearer

### Users

- leitura de perfil autenticado (`/me/profile`)
- manutenção de métricas privadas do usuário

### Posts

- criação de post autenticado
- detalhe de post + comentários visíveis
- atualização de tendência por contrato interno
- exclusão de post por autor, moderador ou admin, com limpeza de comentários/reviews vinculados

### Comments

- criação de comentários autenticada
- listagem de comentários visíveis por post
- exclusão de comentário por moderador ou admin

### Feed

- listagem cronológica de posts publicados
- paginação por cursor (`createdAt + id`)

### Moderation

- registro de review em post
- regras de autorização para usuário autenticado
- cálculo de tendência do post
- recálculo de métricas privadas do autor

### Admin

- bootstrap de administradores via configuração (`ADMIN_EMAILS`)
- listagem administrativa de usuários e respectivos papéis
- listagem de usuários elegíveis para moderação
- concessão e remoção de papel `moderator`
- exclusão administrativa de usuários para testes (com recálculo de estatísticas derivadas)

## Regras de negócio principais

- feed público em ordem cronológica decrescente
- público vê percentual de aprovação por post
- autor não pode revisar o próprio post
- métricas privadas são retornadas somente em `/me/profile`
- papel `admin` é controlado por configuração do projeto

## Contrato de resposta da API

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

## Endpoints (`/api/v1`)

| Método | Rota | Auth | Role | Descrição |
|---|---|---|---|---|
| `POST` | `/auth/register` | Não | - | Cria usuário e retorna token |
| `POST` | `/auth/login` | Não | - | Autentica e retorna token |
| `GET` | `/feed` | Não | - | Feed cronológico com cursor |
| `POST` | `/posts` | Sim | `user+` | Cria post |
| `GET` | `/posts/:id` | Não | - | Detalhe do post + comentários |
| `GET` | `/posts/:id/comments` | Não | - | Lista comentários visíveis |
| `POST` | `/posts/:id/comments` | Sim | `user+` | Cria comentário |
| `DELETE` | `/posts/:id` | Sim | `user+` | Exclui post (autor/mod/admin) |
| `DELETE` | `/comments/:id` | Sim | `moderator/admin` | Exclui comentário |
| `GET` | `/admin/users` | Sim | `admin` | Lista usuários e papéis |
| `GET` | `/admin/moderator-eligibility` | Sim | `admin` | Lista elegíveis e moderadores |
| `PATCH` | `/admin/users/:id/moderator` | Sim | `admin` | Concede/remove `moderator` |
| `DELETE` | `/admin/users/:id` | Sim | `admin` | Exclui usuário e recalcula estatísticas |
| `POST` | `/posts/:id/review` | Sim | `user+` | Registra review |
| `GET` | `/me/profile` | Sim | `user+` | Perfil autenticado + métricas privadas |

Observações:

- Header de autenticação: `Authorization: Bearer <token>`
- Endpoint raiz: `GET /` retorna metadados da API

## Exemplos de payload

### Registro

```json
{
  "username": "ana",
  "email": "ana@email.com",
  "password": "123456"
}
```

### Login

```json
{
  "email": "ana@email.com",
  "password": "123456"
}
```

### Criação de post

```json
{
  "title": "Como estudar Node.js",
  "content": "Resumo prático...",
  "tags": ["node", "backend"]
}
```

### Review de post

```json
{
  "decision": "approved",
  "reason": "Conteúdo claro e útil"
}
```

## Modelos de dados (MongoDB)

### User

- `username: string` (único)
- `email: string` (único)
- `passwordHash: string`
- `role: "user" | "moderator" | "admin"`
- `privateMetrics.score: number (0-100, percentual de aprovação)`
- `privateMetrics.totalReviews: number`
- `createdAt: Date`
- `updatedAt: Date`

### Post

- `authorId: ObjectId(User)`
- `title: string`
- `content: string`
- `tags: string[]`
- `status: "published" | "hidden" | "pending_review"`
- `trend: "positive" | "neutral" | "negative"`
- `createdAt: Date`
- `updatedAt: Date`

### PostReview

- `postId: ObjectId(Post)`
- `reviewerId: ObjectId(User)`
- `decision: "approved" | "not_relevant"`
- `reason: string | null`
- `createdAt: Date`
- `updatedAt: Date`

### Comment

- `postId: ObjectId(Post)`
- `authorId: ObjectId(User)`
- `content: string`
- `status: "visible" | "hidden"`
- `createdAt: Date`
- `updatedAt: Date`

## Segurança

- autenticação JWT Bearer (assinatura HMAC SHA-256)
- middleware global de autenticação para rotas privadas
- middleware de papéis para rotas de moderação
- validação de campos obrigatórios e `ObjectId`

## Variáveis de ambiente

Arquivo: variáveis lidas em `src/config/env.js`.

- `PORT` (padrão: `3000`)
- `MONGO_URI` (padrão: `mongodb://localhost:27017/thesocial`)
- `JWT_SECRET` (padrão de desenvolvimento: `change-me-in-production`)
- `JWT_EXPIRES_IN_SECONDS` (padrão: `43200`)
- `ADMIN_EMAILS` (opcional: emails separados por vírgula que recebem papel `admin`)

## Como executar localmente

### Pré-requisitos

- Node.js 18+
- MongoDB rodando localmente (ou remoto via `MONGO_URI`)

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build e start

> O script `build` usa `xcopy` (ambiente Windows).

```bash
npm run build
npm start
```

## Frontend estático

Páginas disponíveis em `src/public/pages`:

- `index.html` (registro/login)
- `feed.html`
- `post.html`
- `profile.html`
- `admin/reviews.html`

Arquitetura frontend em `src/public/js`:

- `api.js` (cliente HTTP + facade de endpoints)
- `core/` (sessão, formatadores e tratamento de estado/erro)
- `components/` (navbar, navegação por `data-nav-href`, feedback visual)
- `features/*/renderers.js` (renderização por domínio)
- `pages/*.js` (orquestração por página)

O frontend consome a API em `/api/v1` por meio dessa estrutura modular.
A navegação interna entre páginas usa botões com `data-nav-href`, tratados por `src/public/js/components/navigation.js`.

## Padrões de contribuição

Toda contribuição deve preservar:

- feed estritamente cronológico
- ausência de métricas públicas de validação
- separação de responsabilidade entre módulos
- contrato de resposta `{ ok, data/error }`
- controle de acesso por autenticação e papel

## Não-objetivos do produto

Este projeto não é:

- clone de Instagram
- clone de LinkedIn
- clone de TikTok
- plataforma de competição por status
- plataforma de exibição de popularidade por números públicos

## Governança do README

Se houver conflito entre implementação e documentação:

1. atualizar a implementação para aderir ao README, **ou**
2. revisar conscientemente o README antes da mudança.

Este arquivo deve sempre refletir o estado real do código.
