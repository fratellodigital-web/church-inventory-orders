-- Adiciona preco e codigo aos produtos e importa o inventario de TERAMO
-- (PDF "Inventario de Produtos", emitido 06/06/2026).

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Remove os produtos de exemplo criados no seed inicial.
DELETE FROM public.produtos
WHERE nome IN ('Bíblia de Estudo', 'Bíblia Infantil', 'Devocional Diário', 'Caderno Escola Bíblica');

INSERT INTO public.produtos
  (codigo, nome, categoria_id, unidade, preco, estoque_fisico, estoque_disponivel, estoque_minimo, ativo)
VALUES
  ('B-3ITA',   'BIBBIA ITALIANA - MISURA 140X210 MM',          (SELECT id FROM public.categorias WHERE nome='Bíblias'),  'PC', 20.00,   79,   79, 0, true),
  ('B-5ITA',   'BIBBIA ITALIANA PULPITO - MISURA 208X275 MM',  (SELECT id FROM public.categorias WHERE nome='Bíblias'),  'PC', 50.00,   38,   38, 0, true),
  ('B-7ITA',   'BIBBIA ITALIANA - MISURA 160X230 MM',          (SELECT id FROM public.categorias WHERE nome='Bíblias'),  'PC', 25.00,   52,   52, 0, true),
  ('C-18',     'BLOCCHETTI RECITATIVI',                        (SELECT id FROM public.categorias WHERE nome='Materiais'), 'PC',  0.50,  830,  830, 0, true),
  ('C-19',     'BLOCCHETTI RICHIESTE DI ORAZIONE',             (SELECT id FROM public.categorias WHERE nome='Materiais'), 'PC',  1.60,  150,  150, 0, true),
  ('C-26ITA',  'TOVAGLIA CON 4 TOVAGLIONI PER SANTA CENA',     (SELECT id FROM public.categorias WHERE nome='Materiais'), 'PC', 40.00,   11,   11, 0, true),
  ('C-50',     'LIBRO COLLETTA',                               (SELECT id FROM public.categorias WHERE nome='Materiais'), 'PC',  5.00,   10,   10, 0, true),
  ('HM13-102', 'INNARIO MUSICI - DO',                          (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 25.00,  320,  320, 0, true),
  ('HM13-109', 'INNARIO MUSICI - ORGANO',                      (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 25.00,   16,   16, 0, true),
  ('HM13-110', 'INNARIO MUSICI - SI-BEMOLLE',                  (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 25.00,   32,   32, 0, true),
  ('HM13-111', 'INNARIO MUSICI - MI-BEMOLLE',                  (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 25.00,   51,   51, 0, true),
  ('HM13-113', 'INNARIO MUSICI - CORDE',                       (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 25.00,   13,   13, 0, true),
  ('MSA-ITA',  'METODO SEMPLIFICATO DI APRENDIMENTO MUSICALE', (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC', 15.00,   51,   51, 0, true),
  ('MTS-13',   'MTS - METODO DI TEORIA E SOLFEGGIO',           (SELECT id FROM public.categorias WHERE nome='Livros'),   'PC',  5.00, 2010, 2010, 0, true);
