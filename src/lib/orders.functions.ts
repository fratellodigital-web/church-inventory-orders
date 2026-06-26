// Public-facing server functions (used by solicitante).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarIgrejas = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("igrejas")
    .select("id, nome, cidade, regiao")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listarProdutos = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("produtos")
    .select("id, codigo, nome, descricao, unidade, preco, foto_url, estoque_disponivel, categoria_id, categorias(nome)")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nome: p.nome,
    descricao: p.descricao,
    unidade: p.unidade,
    preco: p.preco,
    foto_url: p.foto_url,
    estoque_disponivel: p.estoque_disponivel,
    categoria: (p.categorias as { nome: string } | null)?.nome ?? null,
  }));
});

const criarPedidoSchema = z.object({
  igreja_id: z.string().uuid(),
  solicitante_nome: z.string().max(120).optional().nullable(),
  observacao: z.string().max(1000).optional().nullable(),
  itens: z
    .array(
      z.object({
        produto_id: z.string().uuid(),
        quantidade: z.number().int().positive().max(10000),
      }),
    )
    .min(1)
    .max(100),
});

export const criarPedido = createServerFn({ method: "POST" })
  .inputValidator((d) => criarPedidoSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // verifica igreja
    const { data: igreja, error: igErr } = await supabaseAdmin
      .from("igrejas")
      .select("id, ativo")
      .eq("id", data.igreja_id)
      .maybeSingle();
    if (igErr) throw new Error(igErr.message);
    if (!igreja || !igreja.ativo) throw new Error("Igreja inválida");

    // carrega produtos
    const ids = data.itens.map((i) => i.produto_id);
    const { data: produtos, error: pErr } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, unidade, estoque_disponivel, ativo")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);

    const prodMap = new Map((produtos ?? []).map((p) => [p.id, p]));
    for (const item of data.itens) {
      const p = prodMap.get(item.produto_id);
      if (!p || !p.ativo) throw new Error(`Produto indisponível`);
      if (p.estoque_disponivel < item.quantidade) {
        throw new Error(`Estoque insuficiente para "${p.nome}" (disponível: ${p.estoque_disponivel})`);
      }
    }

    // cria pedido
    const { data: pedido, error: pedErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        igreja_id: data.igreja_id,
        solicitante_nome: data.solicitante_nome || null,
        observacao: data.observacao || null,
        status: "pendente",
      })
      .select("id, numero")
      .single();
    if (pedErr || !pedido) throw new Error(pedErr?.message || "Erro ao criar pedido");

    // itens + reserva
    const itensInsert = data.itens.map((i) => {
      const p = prodMap.get(i.produto_id)!;
      return {
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        snapshot_nome: p.nome,
        snapshot_unidade: p.unidade,
      };
    });
    const { error: iErr } = await supabaseAdmin.from("pedido_itens").insert(itensInsert);
    if (iErr) throw new Error(iErr.message);

    // atualiza estoque_disponivel + movimentações
    for (const i of data.itens) {
      const p = prodMap.get(i.produto_id)!;
      const { error: uErr } = await supabaseAdmin
        .from("produtos")
        .update({ estoque_disponivel: p.estoque_disponivel - i.quantidade })
        .eq("id", i.produto_id);
      if (uErr) throw new Error(uErr.message);
      await supabaseAdmin.from("movimentacoes_estoque").insert({
        produto_id: i.produto_id,
        tipo: "reserva",
        quantidade: i.quantidade,
        pedido_id: pedido.id,
        observacao: `Reserva pelo pedido ${pedido.numero}`,
      });
    }

    return { id: pedido.id, numero: pedido.numero };
  });

export const listarPedidosIgreja = createServerFn({ method: "GET" })
  .inputValidator((d: { igreja_id: string }) => ({ igreja_id: z.string().uuid().parse(d.igreja_id) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, numero, status, created_at, pago_em, entregue_em, pedido_itens(quantidade)")
      .eq("igreja_id", data.igreja_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((p) => ({
      id: p.id,
      numero: p.numero,
      status: p.status,
      created_at: p.created_at,
      pago_em: p.pago_em,
      entregue_em: p.entregue_em,
      total_itens: ((p.pedido_itens as { quantidade: number }[] | null) ?? []).reduce(
        (s, i) => s + (i.quantidade ?? 0),
        0,
      ),
    }));
  });

export const buscarPedido = createServerFn({ method: "GET" })
  .inputValidator((d: { numero: string }) => ({ numero: String(d.numero) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        "id, numero, status, observacao, solicitante_nome, created_at, pago_em, entregue_em, igrejas(nome, cidade), pedido_itens(quantidade, snapshot_nome, snapshot_unidade), documentos_saida(numero)",
      )
      .eq("numero", data.numero)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pedido) return null;
    return pedido;
  });
