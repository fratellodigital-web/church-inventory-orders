
-- Enums
CREATE TYPE public.pedido_status AS ENUM ('pendente', 'pago', 'em_separacao', 'entregue', 'cancelado');
CREATE TYPE public.movimentacao_tipo AS ENUM ('entrada', 'saida', 'reserva', 'estorno_reserva', 'ajuste');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Igrejas
CREATE TABLE public.igrejas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT,
  responsavel TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.igrejas TO service_role;
ALTER TABLE public.igrejas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_igrejas_updated BEFORE UPDATE ON public.igrejas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Categorias
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  foto_url TEXT,
  estoque_fisico INTEGER NOT NULL DEFAULT 0,
  estoque_disponivel INTEGER NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (estoque_fisico >= 0),
  CHECK (estoque_disponivel >= 0)
);
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sequencial de pedidos / documentos
CREATE SEQUENCE public.pedido_numero_seq START 1;
CREATE SEQUENCE public.documento_numero_seq START 1;

-- Pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE DEFAULT ('PED-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.pedido_numero_seq')::text, 5, '0')),
  igreja_id UUID NOT NULL REFERENCES public.igrejas(id) ON DELETE RESTRICT,
  solicitante_nome TEXT,
  observacao TEXT,
  status public.pedido_status NOT NULL DEFAULT 'pendente',
  pago_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_igreja ON public.pedidos(igreja_id);

-- Itens do pedido
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  snapshot_nome TEXT NOT NULL,
  snapshot_unidade TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.pedido_itens TO service_role;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_itens_pedido ON public.pedido_itens(pedido_id);

-- Documentos de saída
CREATE TABLE public.documentos_saida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE DEFAULT ('SAI-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.documento_numero_seq')::text, 5, '0')),
  pedido_id UUID NOT NULL UNIQUE REFERENCES public.pedidos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.documentos_saida TO service_role;
ALTER TABLE public.documentos_saida ENABLE ROW LEVEL SECURITY;

-- Movimentações de estoque
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo public.movimentacao_tipo NOT NULL,
  quantidade INTEGER NOT NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mov_produto ON public.movimentacoes_estoque(produto_id);

-- Config admin (senha inicial)
CREATE TABLE public.admin_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_config TO service_role;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_config (id, password) VALUES (1, 'admin123');

-- Seeds: categorias + 3 igrejas de exemplo + alguns produtos
INSERT INTO public.igrejas (nome, cidade) VALUES
  ('CCI Sede', 'Cidade Sede'),
  ('CCI Filial Norte', 'Cidade Norte'),
  ('CCI Filial Sul', 'Cidade Sul');

INSERT INTO public.categorias (nome) VALUES ('Bíblias'), ('Livros'), ('Materiais');

INSERT INTO public.produtos (nome, descricao, categoria_id, unidade, estoque_fisico, estoque_disponivel, estoque_minimo)
SELECT 'Bíblia de Estudo', 'Bíblia completa com notas de estudo', id, 'un', 50, 50, 10 FROM public.categorias WHERE nome='Bíblias';
INSERT INTO public.produtos (nome, descricao, categoria_id, unidade, estoque_fisico, estoque_disponivel, estoque_minimo)
SELECT 'Bíblia Infantil', 'Bíblia ilustrada para crianças', id, 'un', 30, 30, 5 FROM public.categorias WHERE nome='Bíblias';
INSERT INTO public.produtos (nome, descricao, categoria_id, unidade, estoque_fisico, estoque_disponivel, estoque_minimo)
SELECT 'Devocional Diário', 'Livro devocional 365 dias', id, 'un', 100, 100, 20 FROM public.categorias WHERE nome='Livros';
INSERT INTO public.produtos (nome, descricao, categoria_id, unidade, estoque_fisico, estoque_disponivel, estoque_minimo)
SELECT 'Caderno Escola Bíblica', 'Caderno para anotações da EBD', id, 'un', 200, 200, 50 FROM public.categorias WHERE nome='Materiais';
