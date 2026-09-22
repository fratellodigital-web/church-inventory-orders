-- Saldo por igreja + depósitos antecipados + ledger

CREATE TYPE public.deposito_status AS ENUM ('pendente', 'confirmado', 'rejeitado');
CREATE TYPE public.movimentacao_saldo_tipo AS ENUM ('deposito', 'uso_pedido', 'estorno', 'ajuste');

ALTER TABLE public.igrejas
  ADD COLUMN IF NOT EXISTS saldo NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (saldo >= 0);

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS valor_pago_saldo NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (valor_pago_saldo >= 0),
  ADD COLUMN IF NOT EXISTS valor_pago_bonifico NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (valor_pago_bonifico >= 0);

CREATE TABLE public.depositos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id UUID NOT NULL REFERENCES public.igrejas(id) ON DELETE RESTRICT,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  numero_transacao TEXT NOT NULL,
  imagem_url TEXT,
  drive_file_id TEXT,
  status public.deposito_status NOT NULL DEFAULT 'pendente',
  observacao_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmado_em TIMESTAMPTZ,
  rejeitado_em TIMESTAMPTZ
);
GRANT ALL ON public.depositos TO service_role;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_depositos_igreja ON public.depositos(igreja_id);
CREATE INDEX idx_depositos_status ON public.depositos(status);

CREATE TABLE public.movimentacoes_saldo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id UUID NOT NULL REFERENCES public.igrejas(id) ON DELETE RESTRICT,
  tipo public.movimentacao_saldo_tipo NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.movimentacoes_saldo TO service_role;
ALTER TABLE public.movimentacoes_saldo ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mov_saldo_igreja ON public.movimentacoes_saldo(igreja_id);
CREATE INDEX idx_mov_saldo_pedido ON public.movimentacoes_saldo(pedido_id);
