// Admin server functions. Auth via signed cookie (admin-session.server).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { isAdmin } = await import("./admin-session.server");
  if (!isAdmin()) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ============ AUTH ============
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => ({ password: String(d.password) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg, error } = await supabaseAdmin
      .from("admin_config")
      .select("password")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cfg || cfg.password !== data.password) throw new Error("Password errata");
    const { issueAdminCookie } = await import("./admin-session.server");
    issueAdminCookie();
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearAdminCookie } = await import("./admin-session.server");
  clearAdminCookie();
  return { ok: true };
});

export const adminCheck = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdmin } = await import("./admin-session.server");
  return { isAdmin: isAdmin() };
});

export const adminChangePassword = createServerFn({ method: "POST" })
  .inputValidator((d: { atual: string; nova: string }) => ({
    atual: String(d.atual),
    nova: z.string().min(4).max(120).parse(d.nova),
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: cfg } = await sb.from("admin_config").select("password").eq("id", 1).maybeSingle();
    if (!cfg || cfg.password !== data.atual) throw new Error("Password attuale errata");
    const { error } = await sb.from("admin_config").update({ password: data.nova }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PEDIDOS ============

function sanitizeDriveFilePart(value: string, maxLen = 60): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, maxLen) || "igreja"
  );
}

function formatComprovanteDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const adminListarPedidos = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: string | null } | undefined) => ({ status: d?.status ?? null }))
  .handler(async ({ data }) => {
    const sb = await admin();
    let q = sb
      .from("pedidos")
      .select("id, numero, status, created_at, pago_em, igrejas(nome)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status as never);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetPedido = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: pedido, error } = await sb
      .from("pedidos")
      .select(
        "id, numero, status, observacao, solicitante_nome, created_at, pago_em, entregue_em, comprovante_url, comprovante_drive_file_id, comprovante_numero, igrejas(nome, cidade, responsavel, telefone), pedido_itens(id, produto_id, quantidade, snapshot_nome, snapshot_unidade), documentos_saida(numero, created_at)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return pedido;
  });

export const adminSalvarComprovante = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    comprovante_numero?: string | null;
    imagem?: { base64: string; contentType: string; nome: string } | null;
  }) => ({
    id: z.string().uuid().parse(d.id),
    comprovante_numero: d.comprovante_numero ? z.string().max(100).parse(d.comprovante_numero) : null,
    imagem: d.imagem ?? null,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const update: {
      comprovante_numero: string | null;
      comprovante_url?: string;
      comprovante_drive_file_id?: string | null;
    } = {
      comprovante_numero: data.comprovante_numero,
    };
    if (data.imagem) {
      const { base64, contentType, nome } = data.imagem;
      const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
      if (!allowed.includes(contentType)) throw new Error("Formato immagine non supportato");
      const bytes = Buffer.from(base64, "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Immagine più grande di 5 MB");
      const ext = (nome.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

      const { data: pedido } = await sb
        .from("pedidos")
        .select("igrejas(nome)")
        .eq("id", data.id)
        .maybeSingle();
      const igrejaNome = (pedido?.igrejas as { nome: string } | null)?.nome ?? "igreja";
      const driveFileName = `${formatComprovanteDate()}_${sanitizeDriveFilePart(igrejaNome)}_comprovante.${ext}`;

      const { uploadFile } = await import("./google-drive.server");
      const uploaded = await uploadFile({
        name: driveFileName,
        buffer: bytes,
        mimeType: contentType,
        subfolders: ["comprovantes", data.id],
      });
      update.comprovante_url = uploaded.viewUrl;
      update.comprovante_drive_file_id = uploaded.fileId;
    }
    const { error } = await sb.from("pedidos").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    return {
      ok: true,
      comprovante_url: update.comprovante_url ?? null,
      comprovante_drive_file_id: update.comprovante_drive_file_id ?? null,
    };
  });

const editarPedidoSchema = z.object({
  id: z.string().uuid(),
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

export const adminEditarPedido = createServerFn({ method: "POST" })
  .inputValidator((d) => editarPedidoSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: pedido, error: pErr } = await sb
      .from("pedidos")
      .select("id, numero, status, pedido_itens(id, produto_id, quantidade)")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!pedido) throw new Error("Ordine non trovato");
    if (pedido.status !== "pendente") throw new Error("È possibile modificare solo gli ordini in attesa");

    const oldItems = pedido.pedido_itens ?? [];
    const oldMap = new Map(oldItems.map((i) => [i.produto_id, i.quantidade]));
    const newMap = new Map(data.itens.map((i) => [i.produto_id, i.quantidade]));
    const allProdIds = [...new Set([...oldMap.keys(), ...newMap.keys()])];

    const { data: prods } = await sb
      .from("produtos")
      .select("id, nome, unidade, estoque_disponivel, ativo")
      .in("id", allProdIds);
    const pm = new Map((prods ?? []).map((p) => [p.id, { ...p }]));

    for (const produto_id of allProdIds) {
      const oldQty = oldMap.get(produto_id) ?? 0;
      const newQty = newMap.get(produto_id) ?? 0;
      const delta = newQty - oldQty;
      if (delta === 0) continue;

      const p = pm.get(produto_id);
      if (newQty > 0 && (!p || !p.ativo)) throw new Error("Prodotto non disponibile");

      if (delta > 0 && p) {
        if (p.estoque_disponivel < delta) {
          throw new Error(`Magazzino insufficiente per "${p.nome}" (disponibile: ${p.estoque_disponivel})`);
        }
        const next = p.estoque_disponivel - delta;
        const { error: uErr } = await sb.from("produtos").update({ estoque_disponivel: next }).eq("id", produto_id);
        if (uErr) throw new Error(uErr.message);
        pm.set(produto_id, { ...p, estoque_disponivel: next });
        await sb.from("movimentacoes_estoque").insert({
          produto_id,
          tipo: "reserva",
          quantidade: delta,
          pedido_id: pedido.id,
          observacao: `Ajuste reserva pedido ${pedido.numero}`,
        });
      } else if (delta < 0 && p) {
        const release = -delta;
        const next = p.estoque_disponivel + release;
        const { error: uErr } = await sb.from("produtos").update({ estoque_disponivel: next }).eq("id", produto_id);
        if (uErr) throw new Error(uErr.message);
        pm.set(produto_id, { ...p, estoque_disponivel: next });
        await sb.from("movimentacoes_estoque").insert({
          produto_id,
          tipo: "estorno_reserva",
          quantidade: release,
          pedido_id: pedido.id,
          observacao: `Ajuste reserva pedido ${pedido.numero}`,
        });
      }
    }

    for (const item of oldItems) {
      if (!newMap.has(item.produto_id)) {
        const { error } = await sb.from("pedido_itens").delete().eq("id", item.id);
        if (error) throw new Error(error.message);
      }
    }

    for (const [produto_id, quantidade] of newMap) {
      const p = pm.get(produto_id);
      if (!p) throw new Error("Prodotto non disponibile");
      const existing = oldItems.find((i) => i.produto_id === produto_id);
      if (existing) {
        const { error } = await sb
          .from("pedido_itens")
          .update({ quantidade, snapshot_nome: p.nome, snapshot_unidade: p.unidade })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb.from("pedido_itens").insert({
          pedido_id: pedido.id,
          produto_id,
          quantidade,
          snapshot_nome: p.nome,
          snapshot_unidade: p.unidade,
        });
        if (error) throw new Error(error.message);
      }
    }

    const { error: upErr } = await sb
      .from("pedidos")
      .update({
        solicitante_nome: data.solicitante_nome || null,
        observacao: data.observacao || null,
      })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });

export const adminMarcarPago = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: pedido, error: pErr } = await sb
      .from("pedidos")
      .select("id, numero, status, pedido_itens(produto_id, quantidade)")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!pedido) throw new Error("Ordine non trovato");
    if (pedido.status !== "pendente") throw new Error("L'ordine non è in attesa");

    // checa estoque físico antes de abater
    const ids = pedido.pedido_itens.map((i) => i.produto_id);
    const { data: prods } = await sb.from("produtos").select("id, nome, estoque_fisico").in("id", ids);
    const pm = new Map((prods ?? []).map((p) => [p.id, p]));
    for (const it of pedido.pedido_itens) {
      const p = pm.get(it.produto_id);
      if (!p || p.estoque_fisico < it.quantidade) {
        throw new Error(`Magazzino fisico insufficiente per "${p?.nome || "prodotto"}"`);
      }
    }

    // abate estoque físico e cria movimentações
    for (const it of pedido.pedido_itens) {
      const p = pm.get(it.produto_id)!;
      const { error: uErr } = await sb
        .from("produtos")
        .update({ estoque_fisico: p.estoque_fisico - it.quantidade })
        .eq("id", it.produto_id);
      if (uErr) throw new Error(uErr.message);
      await sb.from("movimentacoes_estoque").insert({
        produto_id: it.produto_id,
        tipo: "saida",
        quantidade: it.quantidade,
        pedido_id: pedido.id,
        observacao: `Saída pelo pedido ${pedido.numero}`,
      });
    }

    // gera documento de saída
    const { data: doc, error: dErr } = await sb
      .from("documentos_saida")
      .insert({ pedido_id: pedido.id })
      .select("id, numero")
      .single();
    if (dErr) throw new Error(dErr.message);

    // gera PDF e salva no Google Drive
    try {
      const { gerarDocumentoSaidaPDF } = await import("./pdf.server");
      const { uploadFile } = await import("./google-drive.server");
      const pdfBytes = await gerarDocumentoSaidaPDF(doc.numero);
      const uploaded = await uploadFile({
        name: `${doc.numero}.pdf`,
        buffer: Buffer.from(pdfBytes),
        mimeType: "application/pdf",
        subfolders: ["documentos"],
      });
      await sb
        .from("documentos_saida")
        .update({ pdf_url: uploaded.contentUrl, drive_file_id: uploaded.fileId })
        .eq("id", doc.id);
    } catch (e) {
      console.error("[Drive] Falha ao salvar PDF do documento:", e);
      // pedido continua pago; PDF pode ser gerado sob demanda pela API
    }

    // atualiza pedido
    const { error: upErr } = await sb
      .from("pedidos")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", pedido.id);
    if (upErr) throw new Error(upErr.message);

    return { documento_numero: doc.numero };
  });

export const adminMudarStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "em_separacao" | "entregue" }) => ({
    id: z.string().uuid().parse(d.id),
    status: z.enum(["em_separacao", "entregue"]).parse(d.status),
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const patch: { status: typeof data.status; entregue_em?: string } = { status: data.status };
    if (data.status === "entregue") patch.entregue_em = new Date().toISOString();
    const { error } = await sb.from("pedidos").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminCancelarPedido = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: z.string().uuid().parse(d.id) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: pedido } = await sb
      .from("pedidos")
      .select("id, numero, status, pedido_itens(produto_id, quantidade)")
      .eq("id", data.id)
      .maybeSingle();
    if (!pedido) throw new Error("Ordine non trovato");
    if (pedido.status === "cancelado") throw new Error("Già annullato");
    if (pedido.status === "entregue") throw new Error("Ordine già consegnato, non può essere annullato");

    // se ainda estava pendente, estorna a reserva
    if (pedido.status === "pendente") {
      const ids = pedido.pedido_itens.map((i) => i.produto_id);
      const { data: prods } = await sb.from("produtos").select("id, estoque_disponivel").in("id", ids);
      const pm = new Map((prods ?? []).map((p) => [p.id, p]));
      for (const it of pedido.pedido_itens) {
        const p = pm.get(it.produto_id);
        if (!p) continue;
        await sb
          .from("produtos")
          .update({ estoque_disponivel: p.estoque_disponivel + it.quantidade })
          .eq("id", it.produto_id);
        await sb.from("movimentacoes_estoque").insert({
          produto_id: it.produto_id,
          tipo: "estorno_reserva",
          quantidade: it.quantidade,
          pedido_id: pedido.id,
          observacao: `Cancelamento do pedido ${pedido.numero}`,
        });
      }
    }

    const { error } = await sb
      .from("pedidos")
      .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PRODUTOS ============
export const adminListarProdutos = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb
    .from("produtos")
    .select("id, codigo, nome, descricao, unidade, preco, foto_url, categoria_id, estoque_fisico, estoque_disponivel, estoque_minimo, ativo, categorias(nome)")
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminListarCategorias = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb.from("categorias").select("id, nome").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminSalvarProduto = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string | null;
    nome: string;
    codigo?: string | null;
    descricao?: string | null;
    categoria_id?: string | null;
    unidade: string;
    preco?: number;
    foto_url?: string | null;
    imagem?: { base64: string; contentType: string; nome: string } | null;
    estoque_minimo?: number;
    ativo?: boolean;
  }) => ({
    id: d.id || null,
    nome: z.string().min(1).max(200).parse(d.nome),
    codigo: d.codigo || null,
    descricao: d.descricao || null,
    categoria_id: d.categoria_id || null,
    unidade: z.string().min(1).max(20).parse(d.unidade),
    preco: z.number().min(0).parse(Number(d.preco ?? 0)),
    foto_url: d.foto_url || null,
    imagem: d.imagem ?? null,
    estoque_minimo: Number(d.estoque_minimo ?? 0),
    ativo: d.ativo ?? true,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    let produtoId = data.id;
    let foto_url = data.foto_url;

    const payload = {
      nome: data.nome,
      codigo: data.codigo,
      descricao: data.descricao,
      categoria_id: data.categoria_id,
      unidade: data.unidade,
      preco: data.preco,
      estoque_minimo: data.estoque_minimo,
      ativo: data.ativo,
    };

    if (produtoId) {
      const { error } = await sb.from("produtos").update(payload).eq("id", produtoId);
      if (error) throw new Error(error.message);
    } else {
      const { data: novo, error } = await sb.from("produtos").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      produtoId = novo.id;
    }

    if (data.imagem && produtoId) {
      const { base64, contentType, nome } = data.imagem;
      const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
      if (!allowed.includes(contentType)) throw new Error("Formato immagine non supportato");
      const bytes = Buffer.from(base64, "base64");
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Immagine più grande di 5 MB");
      const ext = (nome.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const { uploadFile } = await import("./google-drive.server");
      const uploaded = await uploadFile({
        name: `foto.${ext}`,
        buffer: bytes,
        mimeType: contentType,
        subfolders: ["produtos", produtoId],
      });
      foto_url = uploaded.viewUrl;
      const { error } = await sb.from("produtos").update({ foto_url }).eq("id", produtoId);
      if (error) throw new Error(error.message);
    }

    return { id: produtoId };
  });

export const adminCriarCategoria = createServerFn({ method: "POST" })
  .inputValidator((d: { nome: string }) => ({ nome: z.string().min(1).max(80).parse(d.nome) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: c, error } = await sb.from("categorias").insert({ nome: data.nome }).select("id, nome").single();
    if (error) throw new Error(error.message);
    return c;
  });

// ============ IGREJAS ============
export const adminListarIgrejas = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb.from("igrejas").select("*").order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminSalvarIgreja = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string | null;
    nome: string;
    cidade?: string | null;
    regiao?: string | null;
    responsavel?: string | null;
    telefone?: string | null;
    ativo?: boolean;
  }) => ({
    id: d.id || null,
    nome: z.string().min(1).max(200).parse(d.nome),
    cidade: d.cidade || null,
    regiao: d.regiao ? z.string().min(1).max(100).parse(d.regiao) : null,
    responsavel: d.responsavel || null,
    telefone: d.telefone || null,
    ativo: d.ativo ?? true,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const payload = {
      nome: data.nome,
      cidade: data.cidade,
      regiao: data.regiao,
      responsavel: data.responsavel,
      telefone: data.telefone,
      ativo: data.ativo,
    };
    if (data.id) {
      const { error } = await sb.from("igrejas").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: novo, error } = await sb.from("igrejas").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: novo.id };
    }
  });

// ============ ESTOQUE ============
export const adminEntradaEstoque = createServerFn({ method: "POST" })
  .inputValidator((d: { produto_id: string; quantidade: number; observacao?: string | null }) => ({
    produto_id: z.string().uuid().parse(d.produto_id),
    quantidade: z.number().int().positive().max(100000).parse(d.quantidade),
    observacao: d.observacao || null,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: p, error: pErr } = await sb
      .from("produtos")
      .select("id, estoque_fisico, estoque_disponivel")
      .eq("id", data.produto_id)
      .maybeSingle();
    if (pErr || !p) throw new Error("Prodotto non trovato");
    const { error: uErr } = await sb
      .from("produtos")
      .update({
        estoque_fisico: p.estoque_fisico + data.quantidade,
        estoque_disponivel: p.estoque_disponivel + data.quantidade,
      })
      .eq("id", data.produto_id);
    if (uErr) throw new Error(uErr.message);
    await sb.from("movimentacoes_estoque").insert({
      produto_id: data.produto_id,
      tipo: "entrada",
      quantidade: data.quantidade,
      observacao: data.observacao,
    });
    return { ok: true };
  });

export const adminListarMovimentacoes = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb
    .from("movimentacoes_estoque")
    .select("id, tipo, quantidade, observacao, created_at, produtos(nome), pedidos(numero)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});
