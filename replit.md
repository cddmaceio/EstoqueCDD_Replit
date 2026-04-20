# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Session**: express-session
- **File parsing**: xlsx (for .xlsx and .csv)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Gestão Estoque CDD Maceió (`artifacts/estoque-cdd`)
- **Type**: react-vite
- **Preview path**: /
- **Purpose**: Inventory management system for CDD Maceió logistics distribution center

**Pages:**
- `/` — Admin login (email: admin@cdd-maceio.com, password: admin123)
- `/admin/dashboard` — Analytics dashboard with KPIs (Total SKUs, % OK, % NOK, Média DOI) and charts
- `/admin/upload` — File upload (drag & drop .xlsx/.csv) to load stock snapshots
- `/estoque` — Public stock query page (no login required), with search, filters and paginated table

**Backend routes (in `artifacts/api-server`):**
- `POST /api/auth/login` — Admin login with session
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current session
- `GET /api/estoque` — Public stock list with search/filter/pagination
- `GET /api/estoque/marcas` — Distinct brands list
- `GET /api/estoque/dashboard` — Dashboard KPIs (admin only)
- `GET /api/estoque/upload-status` — Last upload info (admin only)
- `POST /api/estoque/upload` — Upload base64 xlsx/csv (admin only)
- `POST/GET /api/bases/grade/*` — base_grade upload & status
- `POST/GET /api/bases/0111/*` — base_0111 upload & status
- `POST/GET /api/bases/agendados/*` — base_agendados upload & status
- `POST/GET /api/bases/exemplo/*` — base_exemplo upload & status
- `POST/GET /api/bases/020501/*` — base_020501 upload & status
- `POST/GET /api/bases/020502/*` — base_020502 upload & status
- `POST/GET /api/bases/producao/*` — base_producao upload & status

**DB Schema:**
- `lib/db/src/schema/estoque.ts` — admin_users, upload_snapshots, estoque_items
- `lib/db/src/schema/base_grade.ts` — base_grade_snapshots, base_grade (CodigoProduto, Grade, Reserva, Saida, SaldoDisponivel)
- `lib/db/src/schema/base_0111.ts` — base_0111_snapshots, base_0111 (Código, Descrição, Marca, Embalagem, NCM, EAN, Fator...)
- `lib/db/src/schema/base_agendados.ts` — base_agendados_snapshots, base_agendados (Pedido, Cliente, Produto, Situação, NF...)
- `lib/db/src/schema/base_exemplo.ts` — base_exemplo_snapshots, base_exemplo (Colaboradores: CPF, Crachá, Setor, Turno...)
- `lib/db/src/schema/base_020501.ts` — base_020501_snapshots, base_020501 (Movimentação: Data, Doc, Item, Entradas, Saídas...)
- `lib/db/src/schema/base_020502.ts` — base_020502_snapshots, base_020502 (Saldo por Depósito: Armazém, Produto, Saldos...)
- `lib/db/src/schema/base_producao.ts` — base_producao_snapshots, base_producao (Date, CodSAP, Embalagem, Fator RA24)

**File encoding notes:**
- Grade, Agendados: UTF-8 BOM; separator: semicolon
- 0111, exemplo, 020501, 020502: ISO-8859-1; separator: semicolon (xlsx codepage 28591 handles this)
- Produção: .xlsx (Microsoft Excel)

## Important Notes

- After codegen, patch `lib/api-zod/src/index.ts` to only export `./generated/api` (not `./generated/types`) to avoid duplicate export errors
- Upload accepts base64-encoded file content; frontend encodes via FileReader API
- Sessions require `SESSION_SECRET` environment variable

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
