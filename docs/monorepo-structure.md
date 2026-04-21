# Monorepo Structure

## Purpose

Este repositorio foi reorganizado para separar claramente aplicacoes, bibliotecas compartilhadas e adaptacoes de plataforma.

## Directory Map

```text
apps/
  api/               backend principal
  web/               frontend principal

packages/
  db/                schema, migrations, seed e conexao com o banco
  api-spec/          contrato OpenAPI
  api-zod/           validacao compartilhada
  api-client-react/  client e hooks React

infra/
  vercel/
    api/             entrypoints reais usados no deploy

api/                 shims minimos para a descoberta de functions da Vercel
docs/                documentacao operacional
scripts/             automacoes locais
```

## Boundaries

- `apps/web`: paginas, componentes, hooks e integracao de frontend
- `apps/api`: rotas, auth, parsing de arquivo e regras de negocio do backend
- `packages/db`: tudo que modela ou toca schema e bootstrap de dados
- `packages/api-spec`: fonte do contrato HTTP
- `packages/api-zod`: tipos/schemas compartilhados gerados ou refinados
- `packages/api-client-react`: cliente consumido pelo frontend
- `infra/vercel`: adaptacao de deploy, sem regra de negocio

## Deploy Note

A Vercel continua descobrindo functions pela pasta raiz `api/`. Por isso ela foi mantida como camada de compatibilidade, reexportando os handlers reais de `infra/vercel/api`.
