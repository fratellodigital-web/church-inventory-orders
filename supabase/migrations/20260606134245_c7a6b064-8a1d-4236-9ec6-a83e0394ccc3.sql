ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS regiao text;
ALTER TABLE public.igrejas DROP CONSTRAINT IF EXISTS igrejas_regiao_check;
ALTER TABLE public.igrejas ADD CONSTRAINT igrejas_regiao_check CHECK (regiao IS NULL OR regiao IN ('norte','centro','sul'));