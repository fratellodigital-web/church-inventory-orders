// Public server functions for church saldo / deposits.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { roundMoney } from "./money";

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

function formatDateYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const obterSaldoIgreja = createServerFn({ method: "GET" })
  .inputValidator((d: { igreja_id: string }) => ({
    igreja_id: z.string().uuid().parse(d.igreja_id),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: igreja, error } = await supabaseAdmin
      .from("igrejas")
      .select("id, nome, saldo")
      .eq("id", data.igreja_id)
      .eq("ativo", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!igreja) throw new Error("Chiesa non valida");
    return { id: igreja.id, nome: igreja.nome, saldo: Number(igreja.saldo ?? 0) };
  });

export const listarDepositosIgreja = createServerFn({ method: "GET" })
  .inputValidator((d: { igreja_id: string }) => ({
    igreja_id: z.string().uuid().parse(d.igreja_id),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("depositos")
      .select(
        "id, valor, numero_transacao, imagem_url, status, observacao_admin, created_at, confirmado_em, rejeitado_em",
      )
      .eq("igreja_id", data.igreja_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  });

const criarDepositoSchema = z.object({
  igreja_id: z.string().uuid(),
  valor: z.number().positive().max(1_000_000),
  numero_transacao: z.string().min(1).max(100),
  imagem: z.object({
    base64: z.string().min(1),
    contentType: z.string(),
    nome: z.string(),
  }),
});

export const criarDeposito = createServerFn({ method: "POST" })
  .inputValidator((d) => criarDepositoSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: igreja, error: igErr } = await supabaseAdmin
      .from("igrejas")
      .select("id, nome, ativo")
      .eq("id", data.igreja_id)
      .maybeSingle();
    if (igErr) throw new Error(igErr.message);
    if (!igreja || !igreja.ativo) throw new Error("Chiesa non valida");

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowed.includes(data.imagem.contentType)) {
      throw new Error("Formato immagine non supportato");
    }
    const bytes = Buffer.from(data.imagem.base64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Immagine più grande di 5 MB");

    const ext = (data.imagem.nome.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const driveFileName = `${formatDateYmd()}_${sanitizeDriveFilePart(igreja.nome)}_deposito.${ext}`;

    const { uploadFile } = await import("./google-drive.server");
    const uploaded = await uploadFile({
      name: driveFileName,
      buffer: bytes,
      mimeType: data.imagem.contentType,
      subfolders: ["depositos", data.igreja_id],
    });

    const valor = roundMoney(data.valor);
    const { data: row, error } = await supabaseAdmin
      .from("depositos")
      .insert({
        igreja_id: data.igreja_id,
        valor,
        numero_transacao: data.numero_transacao.trim(),
        imagem_url: uploaded.viewUrl,
        drive_file_id: uploaded.fileId,
        status: "pendente",
      })
      .select("id, status")
      .single();
    if (error || !row) throw new Error(error?.message || "Errore nel deposito");

    return { id: row.id, status: row.status };
  });
