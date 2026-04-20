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

**DB Schema (in `lib/db/src/schema/estoque.ts`):**
- `admin_users` — Admin credentials (password hashed with SHA-256 + salt)
- `upload_snapshots` — Metadata about each uploaded file
- `estoque_items` — Stock line items linked to snapshots

## Important Notes

- After codegen, patch `lib/api-zod/src/index.ts` to only export `./generated/api` (not `./generated/types`) to avoid duplicate export errors
- Upload accepts base64-encoded file content; frontend encodes via FileReader API
- Sessions require `SESSION_SECRET` environment variable

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
