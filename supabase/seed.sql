-- Seed local (roda no `supabase db reset` / `pnpm db:reset`).
-- A migration base já cria admin_config com password 'admin123'.
-- Aqui reforçamos uma senha simples só para o ambiente local.

INSERT INTO public.admin_config (id, password)
VALUES (1, 'admin')
ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;
