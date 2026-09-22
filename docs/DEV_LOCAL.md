# Desenvolvimento local — banco de teste (Supabase + OrbStack)

Produção (Vercel) usa o projeto Supabase Cloud. Em local usamos **OrbStack** + CLI Supabase.

## Pré-requisitos

- **macOS Sonoma (14) ou superior** — OrbStack não instala em Monterey/Ventura via Homebrew
- [OrbStack](https://orbstack.dev/) instalado e aberto (`Running`)
  - `brew install --cask orbstack` **ou** baixar no site
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase --version`)

Confirme: `docker version` e `docker ps` (o Docker CLI vem com o OrbStack).

## Subir tudo: `pnpm dev`

```bash
pnpm dev
```

O script [`scripts/dev-local.sh`](../scripts/dev-local.sh) faz, nesta ordem:

1. Abre o **OrbStack**
2. Espera o **Docker** ficar pronto (até ~60s)
3. `supabase start` (banco local)
4. `vite dev`

Só a app (banco já no ar): `pnpm dev:app`

## Configurar `.env` (uma vez)

Depois do primeiro `supabase start`:

```bash
pnpm db:status
```

Copie **API URL**, **anon key** e **service_role key** para o `.env` (veja `.env.example`).

Exemplo típico:

```env
SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

## Só o banco / reset

```bash
pnpm db:start
pnpm db:reset   # reaplica migrations + seed (admin password: admin)
pnpm db:stop
pnpm db:status
```

- App: http://127.0.0.1:5173  
- Studio: http://127.0.0.1:54323  

## Produção (Vercel)

No painel da Vercel, mantenha as variáveis do **projeto Supabase Cloud** (não `127.0.0.1`).

## Google Drive

Uploads usam `GOOGLE_DRIVE_*`. Sem credenciais, o SQL local funciona; uploads falham. Ver `GOOGLE_DRIVE_SETUP.md`.

## Problemas comuns

| Sintoma | O que fazer |
|---------|-------------|
| `OrbStack não encontrado` | Instalar OrbStack (Sonoma+) e abrir o app |
| Timeout Docker 60s | Abrir OrbStack até ficar Running; `docker ps` |
| `This cask does not run on macOS versions older than Sonoma` | Atualizar o macOS ou usar um Mac com Sonoma+ / projeto Supabase Cloud de staging |
