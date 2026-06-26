-- Campos de comprovante de pagamento (bonifico) nos pedidos:
-- imagem anexada (URL no storage) e numero do comprovante.

ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS comprovante_numero TEXT;

-- Bucket publico para armazenar as imagens dos comprovantes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', true)
ON CONFLICT (id) DO NOTHING;
