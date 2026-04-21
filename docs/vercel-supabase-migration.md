# Vercel + Supabase Migration

Este projeto foi desacoplado do runtime antigo para rodar com:

- Frontend Vite em Vercel
- API Express empacotada em `apps/api` e exposta na Vercel via `infra/vercel/api`
- PostgreSQL no Supabase
- Auth em transicao: Supabase Auth com fallback legado por email/senha

## Variaveis de ambiente

Defina estas variaveis na Vercel:

```env
DATABASE_URL=postgresql://...:6543/postgres
VITE_API_BASE_URL=
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_UPLOAD_BUCKET=app-uploads
SUPABASE_JWT_SECRET=<jwt-secret>
SESSION_SECRET=<temporary-only-if-legacy-login-is-needed>
```

Para teste local, `.env.local` pode reaproveitar as mesmas chaves e ainda incluir:

```env
PORT=3001
FRONTEND_PORT=5173
VITE_API_BASE_URL=http://127.0.0.1:3001
```

## Banco de dados

Gerar migration:

```bash
pnpm --filter @workspace/db run generate
```

Aplicar schema:

```bash
pnpm --filter @workspace/db run push
```

## Bootstrap do primeiro admin

Criar ou atualizar um admin:

```bash
ADMIN_EMAIL=admin@cdd-maceio.com \
ADMIN_PASSWORD=change-me \
ADMIN_NAME=Administrador \
ADMIN_AUTH_USER_ID=<supabase-auth-user-uuid-opcional> \
pnpm --filter @workspace/db run seed:admin
```

Observacoes:

- Na Vercel, prefira a connection string do pooler do Supabase em modo transaction (`:6543`) para o runtime serverless.
- Se `ADMIN_AUTH_USER_ID` for informado, o backend vai preferir o vinculo pelo `uuid` do Supabase Auth.
- Se `ADMIN_AUTH_USER_ID` estiver vazio, o backend aceita o email do usuario autenticado no Supabase como fallback de transicao.
- O login legado continua disponivel enquanto `SESSION_SECRET` existir e houver um `password_hash` em `admin_users`.

## Fluxo recomendado para producao

1. Criar o usuario administrador no Supabase Auth.
2. Rodar `seed:admin` com o mesmo email e, de preferencia, com `ADMIN_AUTH_USER_ID`.
3. Publicar na Vercel com as variaveis acima.
4. Remover o uso de `SESSION_SECRET` quando o login legado nao for mais necessario.

## Uploads em producao

O fluxo de upload foi preparado para evitar o limite de payload das Vercel Functions:

1. O frontend pede uma URL assinada de upload para a API.
2. O arquivo sobe direto para um bucket privado do Supabase Storage.
3. A API recebe apenas `storagePath` e processa o arquivo ja salvo no bucket.

Observacoes:

- Em producao, `SUPABASE_SERVICE_ROLE_KEY` e obrigatoria para assinar uploads e baixar o arquivo do bucket privado.
- O bucket usado por padrao e `app-uploads`, mas pode ser alterado por `SUPABASE_UPLOAD_BUCKET`.
- Em desenvolvimento local, se a `SUPABASE_SERVICE_ROLE_KEY` nao existir, a tela faz fallback para o fluxo legado em base64 apenas para nao bloquear testes locais.

## Configuracao Vercel aplicada

- O frontend continua sendo publicado como app Vite estatico.
- O `buildCommand` gera primeiro o bundle do backend (`apps/api/dist/app.mjs`) e depois o build do frontend em `apps/web`.
- Os handlers reais de deploy ficam em `infra/vercel/api`.
- A pasta raiz `api/` foi mantida como shim de compatibilidade para a descoberta de functions da Vercel.
- O `vercel.json` configura `maxDuration` de 300 segundos para as funcoes da pasta `api`.

## Validacoes locais

```bash
pnpm run typecheck
pnpm --filter @workspace/estoque-cdd run build
pnpm --filter @workspace/api-server run build
```

## Teste local antes do deploy

Subir frontend + API juntos:

```bash
pnpm run dev:local
```

Ambiente esperado:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`

Checklist sugerido:

1. Abrir `/` e autenticar no painel administrativo.
2. Validar `/admin/dashboard`.
3. Validar `/admin/upload`.
4. Validar `/estoque`.
5. Testar uma chamada autenticada para `/api/auth/me` apos login.
