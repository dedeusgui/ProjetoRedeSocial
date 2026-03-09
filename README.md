# Projeto Rede Social

Projeto acadêmico de curta duração, desenvolvido para um curso técnico com o objetivo de consolidar práticas de backend, organização de código e integração entre API REST e frontend estático. O repositório também foi estruturado para funcionar como item de portfólio no GitHub, evidenciando decisões técnicas, clareza de arquitetura e documentação consistente.

> Aplicação web full-stack com Node.js, Express e MongoDB, projetada para demonstrar fundamentos de arquitetura, design de APIs, autenticação e organização modular.

## Visão geral

A proposta do sistema é simular uma rede social voltada ao compartilhamento de conhecimento, priorizando simplicidade de regras e clareza técnica. Em vez de buscar escala ou complexidade de produto, o projeto explora fundamentos relevantes do desenvolvimento web:

- autenticação e autorização
- organização modular no backend
- persistência com MongoDB
- integração entre API e interface web
- documentação técnica alinhada ao código

O conceito central da aplicação é um feed cronológico, sem recomendação algorítmica, com interações de moderação simples e métricas privadas para o usuário autenticado.

## O que este projeto demonstra

Mais do que entregar uma interface funcional, este repositório foi pensado para evidenciar conhecimento prático em pontos importantes do desenvolvimento web:

- modelagem de API REST com contrato de resposta consistente
- autenticação com JWT e controle de acesso por papéis
- separação de responsabilidades entre rotas, controllers, services e repositories
- persistência e consulta de dados com MongoDB e Mongoose
- frontend sem framework, consumindo a API de forma organizada
- documentação técnica complementar para arquitetura, contratos e fluxo de trabalho

## Objetivo do projeto

Este projeto foi construído com dois objetivos principais:

1. servir como entrega acadêmica de curto prazo, demonstrando domínio dos conceitos trabalhados no curso
2. funcionar como item de portfólio, evidenciando estrutura de projeto, boas separações de responsabilidade e preocupação com documentação

Por esse motivo, a implementação procura manter um padrão profissional de organização, sem deixar de reconhecer que se trata de um projeto de estudo, com escopo controlado e sem objetivo de produção.

## Principais funcionalidades

- cadastro e login de usuários
- autenticação com JWT
- criação, listagem, edição e visualização de posts
- comentários em posts
- feed público em ordem cronológica
- moderação binária de posts (`approved` e `not_relevant`)
- percentual público de aprovação por post
- métricas privadas no perfil autenticado
- gerenciamento básico de papéis administrativos

## Destaques técnicos

- `Express 5` como base da API e do servidor que entrega o frontend estático
- `MongoDB + Mongoose` para modelagem de usuários, posts, comentários e reviews
- `JWT Bearer` para autenticação de rotas privadas
- envelope de resposta padronizado no formato `{ ok, data/error }`
- paginação por cursor no feed para listagem cronológica
- busca no feed por título, conteúdo e tags
- `RBAC` simples com papéis `user`, `moderator` e `admin`
- arquitetura de monólito modular com composição centralizada no backend

## Stack utilizada

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose

### Frontend

- HTML
- CSS
- JavaScript puro

## Visão do produto

Do ponto de vista funcional, a aplicação se apoia em três ideias centrais:

1. feed em ordem cronológica, sem algoritmo de recomendação
2. moderação simples por avaliação binária de posts
3. separação entre informação pública do post e métricas privadas do usuário

Esse recorte ajuda a manter o projeto enxuto, coerente e adequado ao contexto acadêmico, ao mesmo tempo em que permite exercitar decisões técnicas relevantes.

## Arquitetura resumida

O projeto adota uma estrutura de monólito modular. No backend, cada módulo segue a mesma divisão de responsabilidades:

- `routes`: definição das rotas HTTP
- `controllers`: tradução entre requisição, resposta e serviços
- `services`: regras de negócio e orquestração
- `repositories`: acesso e persistência de dados

Os módulos ativos atualmente cobrem:

- autenticação
- usuários
- posts
- comentários
- feed
- moderação
- administração

No frontend, a aplicação é servida de forma estática pelo próprio backend, com separação entre páginas, componentes reutilizáveis e scripts por domínio.

Essa organização foi escolhida para manter o código simples de navegar, mas suficientemente estruturado para demonstrar critérios reais de projeto.

## Contrato da API

A API utiliza o prefixo `/api/v1` e segue um envelope padrão de resposta.

### Sucesso

```json
{
  "ok": true,
  "data": {}
}
```

### Erro

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição objetiva"
  }
}
```

Rotas protegidas utilizam:

```http
Authorization: Bearer <token>
```

## Exemplo do que a API cobre

Sem listar toda a referência técnica no README principal, a API inclui fluxos como:

- registro e login
- leitura de feed público
- criação, edição e exclusão de posts
- comentários por post
- avaliação de moderação
- leitura de perfil autenticado
- administração de usuários e papéis

Os detalhes completos de rotas, payloads e regras ficam na documentação em `docs/`.

## Estrutura do projeto

```text
src/
  common/
  config/
  middleware/
  models/
  modules/
  public/
  server.js
```

### Organização geral

- `src/modules`: domínios principais da aplicação
- `src/public`: páginas, scripts e estilos do frontend
- `src/common`: utilitários compartilhados, validações e tratamento HTTP
- `src/config`: configurações de ambiente e conexão

## Fluxo de execução

- `src/server.js` inicializa a aplicação
- o Express registra middlewares, rotas e arquivos estáticos
- os módulos de backend são compostos no bootstrap da aplicação
- o frontend consome a API em `/api/v1`

## Como executar localmente

### Pré-requisitos

- Node.js 18+
- MongoDB local ou remoto configurado via `MONGO_URI`

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Por padrão, a aplicação utiliza:

- `PORT=3000`
- `MONGO_URI=mongodb://localhost:27017/thesocial`

### Build e execução

```bash
npm run build
npm start
```

Observação: o script `build` utiliza `xcopy`, portanto o fluxo atual foi preparado com foco em ambiente Windows.

## Páginas disponíveis

O frontend atual possui as seguintes telas principais:

- `index.html`: entrada de autenticação
- `feed.html`: listagem cronológica de posts
- `post.html`: detalhe do post e comentários
- `profile.html`: perfil autenticado e métricas privadas
- `admin/reviews.html`: fluxo de moderação e administração

## Por que este projeto é relevante para portfólio

Mesmo sendo um projeto acadêmico de curto prazo, ele demonstra pontos que costumam ser relevantes em avaliação técnica:

- organização de backend além de um CRUD simples
- preocupação com separação de camadas
- consistência de contrato HTTP
- controle de autenticação e autorização
- integração de frontend e backend no mesmo repositório
- documentação alinhada ao código

## Escopo e posicionamento

Este repositório não pretende representar uma rede social completa, nem um produto pronto para uso comercial. O foco está em:

- aprendizado prático
- consolidação de conceitos técnicos
- demonstração de estrutura de projeto
- apresentação profissional de um trabalho acadêmico

Em outras palavras, o valor do projeto está menos em complexidade de negócio e mais em clareza de implementação, consistência arquitetural e documentação.

## Documentação complementar

Os detalhes técnicos mais completos ficam centralizados na pasta `docs/`.

- [docs/README.md](docs/README.md)
- [docs/architecture/system-overview.md](docs/architecture/system-overview.md)
- [docs/api/http-contract.md](docs/api/http-contract.md)
- [AGENTS.md](AGENTS.md)

## Observação final

O README principal foi pensado para apresentar o projeto de forma objetiva e profissional. Quando houver divergência entre este arquivo e a implementação, a documentação técnica em `docs/` e o código devem ser tratados como referência para revisão e alinhamento.
