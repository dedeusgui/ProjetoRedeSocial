# Agent Collaboration Policy (PT/EN)

Este arquivo define como agentes e desenvolvedores colaboram neste projeto.
This file defines how agents and developers collaborate in this project.

## 1) Scope / Escopo

- Applies to all implementation support done by agents.
- Aplica-se a todo suporte de implementacao feito por agentes.
- Human developer decisions are authoritative.
- Decisoes do desenvolvedor humano sao autoridade final.

## 2) Golden Rule: Docs First / Regra de Ouro: Documentacao Primeiro

Before proposing implementation, agents must read relevant docs.
Antes de propor implementacao, agentes devem ler a documentacao relevante.

Minimum read order / Ordem minima de leitura:

1. `docs/README.md`
2. impacted architecture docs under `docs/architecture/`
3. API contracts under `docs/api/` when backend/API changes
4. workflow doc under `docs/workflows/` (`feature-process` or `bugfix-process`)

## 3) Mandatory Decision Gate / Gate Obrigatorio de Decisao

Agents must ask the developer before implementation when decisions affect:
Agentes devem perguntar ao desenvolvedor antes da implementacao quando decisoes afetarem:

- architecture/module boundaries
- API contract or payload shape
- auth/role behavior
- core business rules
- scope and non-goals

## 4) How to Ask / Como Perguntar

Each important question must include:
Cada pergunta importante deve incluir:

1. what decision is needed / qual decisao e necessaria
2. 2-4 concrete options / 2-4 opcoes concretas
3. one recommended option / uma opcao recomendada
4. one-line tradeoff for each option / tradeoff de uma linha para cada opcao

If the developer does not choose, agents may proceed with the recommended option only when explicitly marked as an assumption.
Se o desenvolvedor nao escolher, agentes podem seguir com a opcao recomendada apenas quando marcada explicitamente como suposicao.

## 5) Suggestion Standard / Padrao de Sugestao

Suggestions must be practical and repository-specific.
Sugestoes devem ser praticas e especificas deste repositorio.

Always prioritize:
Sempre priorizar:

1. minimal-change safe option / opcao segura de mudanca minima
2. best long-term option / melhor opcao de longo prazo

Suggestions must preserve:
Sugestoes devem preservar:

- module layering (`routes/controllers/services/repositories`)
- response envelope contract (`{ ok, data/error }`)
- core product principles already documented

## 6) Academic Project, Professional Execution / Projeto Academico, Execucao Profissional

This is an academic project with high effort and strong ideas, so quality standards are mandatory.
Este e um projeto academico com alto esforco e boas ideias, entao padroes de qualidade sao obrigatorios.

Required quality bar / Barra de qualidade obrigatoria:

- clear rationale for decisions
- traceable decisions in docs (RFC/workflow/changelog when needed)
- docs updated in the same change
- validation plan for every meaningful change

## 7) Output Contract for Agents / Contrato de Saida para Agentes

Before implementation proposal, agents must provide:
Antes da proposta de implementacao, agentes devem fornecer:

1. short understanding summary from docs / resumo curto do entendimento com base nos docs
2. explicit decision requests (when needed) / pedidos explicitos de decisao (quando necessario)
3. suggested path and rationale / caminho sugerido e justificativa
4. success criteria / criterios de sucesso

## 8) Stop and Ask Cases / Casos de Parar e Perguntar

Agents must stop and ask when:
Agentes devem parar e perguntar quando:

- docs conflict with code behavior and intent is unclear
- change can break API consumers
- security/auth implications are uncertain
- requested scope conflicts with project principles

## 9) Compliance Checklist / Checklist de Conformidade

- [ ] relevant docs were read first
- [ ] decision gate applied for high-impact choices
- [ ] options + recommendation were provided
- [ ] assumptions were explicit
- [ ] docs were updated with implementation
