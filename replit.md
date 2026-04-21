# Workspace

## Overview

pnpm workspace monorepo using TypeScript. The repository is organized by runtime responsibility so it is immediately clear what is frontend, backend, database, shared contracts, and deploy infrastructure.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Backend build**: esbuild (ESM bundle)
- **Session fallback**: express-session
- **File parsing**: xlsx (for `.xlsx` and `.csv`)

## Monorepo Map

- `apps/web` - frontend principal do Estoque CDD
- `apps/api` - backend principal com rotas HTTP, auth e processamento de uploads
- `packages/db` - conexao Drizzle, schema, migrations e scripts de seed
- `packages/api-spec` - contrato OpenAPI
- `packages/api-zod` - schemas compartilhados gerados/curados
- `packages/api-client-react` - hooks/clientes React para consumo da API
- `infra/vercel/api` - entrypoints reais de deploy para a Vercel
- `api` - shims minimos para compatibilidade de descoberta de functions da Vercel
- `docs` - documentacao operacional
- `scripts` - automacoes locais e suporte de desenvolvimento

## Key Commands

- `pnpm run typecheck` - typecheck completo do workspace
- `pnpm run build` - typecheck + build de apps/packages com script de build
- `pnpm --filter @workspace/api-spec run codegen` - regenerar hooks React e schemas Zod a partir do OpenAPI
- `pnpm --filter @workspace/db run push` - aplicar schema do banco em ambiente de desenvolvimento
- `pnpm --filter @workspace/api-server run dev` - subir o backend localmente
- `pnpm --filter @workspace/estoque-cdd run dev` - subir o frontend localmente
- `pnpm run dev:local` - subir frontend + backend juntos

## Product Apps

### Gestao Estoque CDD Maceio (`apps/web`)

- **Type**: React + Vite
- **Preview path**: `/`
- **Purpose**: sistema de gestao de estoque do CDD Maceio

**Pages:**

- `/` - login administrativo
- `/admin/dashboard` - dashboard com KPIs e graficos
- `/admin/upload` - tela de upload de bases operacionais
- `/estoque` - consulta publica de estoque com filtros e paginacao

**Backend routes (in `apps/api`):**

- `POST /api/auth/login` - login administrativo legado
- `POST /api/auth/logout` - logout
- `GET /api/auth/me` - sessao atual
- `GET /api/estoque` - lista publica de estoque com busca/filtros/paginacao
- `GET /api/estoque/marcas` - marcas distintas
- `GET /api/estoque/dashboard` - KPIs do dashboard
- `GET /api/estoque/upload-status` - ultimo upload de estoque
- `POST /api/estoque/upload` - upload/processamento da base principal de estoque
- `POST /api/uploads/storage/sign` - assinatura de upload para Supabase Storage
- `POST/GET /api/bases/grade/*` - upload/status da base grade
- `POST/GET /api/bases/0111/*` - upload/status da base 0111
- `POST/GET /api/bases/agendados/*` - upload/status da base agendados
- `POST/GET /api/bases/exemplo/*` - upload/status da base exemplo
- `POST/GET /api/bases/020501/*` - upload/status da base 020501
- `POST/GET /api/bases/020502/*` - upload/status da base 020502
- `POST/GET /api/bases/producao/*` - upload/status da base producao
- `POST/GET /api/bases/segmentos/*` - upload/status da classificacao de segmentos

## Database

Schema principal em `packages/db/src/schema`:

- `packages/db/src/schema/estoque.ts` - `admin_users`, `upload_snapshots`, `estoque_items`
- `packages/db/src/schema/base_grade.ts` - `base_grade_snapshots`, `base_grade`
- `packages/db/src/schema/base_0111.ts` - `base_0111_snapshots`, `base_0111`
- `packages/db/src/schema/base_agendados.ts` - `base_agendados_snapshots`, `base_agendados`
- `packages/db/src/schema/base_exemplo.ts` - `base_exemplo_snapshots`, `base_exemplo`
- `packages/db/src/schema/base_020501.ts` - `base_020501_snapshots`, `base_020501`
- `packages/db/src/schema/base_020502.ts` - `base_020502_snapshots`, `base_020502`
- `packages/db/src/schema/base_producao.ts` - `base_producao_snapshots`, `base_producao`
- `packages/db/src/schema/produto_segmento.ts` - classificacao atual por produto

## Upload Strategy

- Em producao, o upload vai para o Supabase Storage com URL assinada
- A API recebe `storagePath` e processa o arquivo salvo
- Em desenvolvimento local, existe fallback para o fluxo legado em base64 quando necessario

## Important Notes

- Depois do codegen, confirme que `packages/api-zod/src/index.ts` exporta apenas `./generated/api` se houver conflito de tipos
- O login legado depende de `SESSION_SECRET`
- O fluxo recomendado de producao e Supabase Auth + bucket privado do Supabase Storage
- A Vercel usa `infra/vercel/api` como fonte dos handlers e a pasta raiz `api/` apenas como compatibilidade de roteamento
