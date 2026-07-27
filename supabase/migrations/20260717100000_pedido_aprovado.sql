-- Status "aprovado" + snapshot de preço na aprovação
ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'aprovado' AFTER 'pendente';

ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS snapshot_preco NUMERIC(12,2);

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;
