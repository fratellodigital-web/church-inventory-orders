// PDF generation for documento de saída using pdf-lib.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function gerarDocumentoSaidaPDF(numero: string): Promise<Uint8Array> {
  const { data: doc, error } = await supabaseAdmin
    .from("documentos_saida")
    .select(
      "numero, created_at, pedidos(numero, observacao, solicitante_nome, igrejas(nome, cidade, responsavel, telefone), pedido_itens(quantidade, snapshot_nome, snapshot_unidade))",
    )
    .eq("numero", numero)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!doc || !doc.pedidos) throw new Error("Documento non trovato");

  const pedido = doc.pedidos as {
    numero: string;
    observacao: string | null;
    solicitante_nome: string | null;
    igrejas: { nome: string; cidade: string | null; responsavel: string | null; telefone: string | null } | null;
    pedido_itens: { quantidade: number; snapshot_nome: string; snapshot_unidade: string }[];
  };

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);

  let y = 800;
  const x = 50;

  page.drawText("Fondo Biblico - CCI", { x, y, size: 18, font: bold, color: black });
  y -= 22;
  page.drawText("Documento di uscita", { x, y, size: 11, font, color: gray });

  y -= 30;
  page.drawText(`Nº ${doc.numero}`, { x, y, size: 14, font: bold, color: black });
  page.drawText(
    `Emesso il ${new Date(doc.created_at).toLocaleString("it-IT")}`,
    { x: 320, y, size: 10, font, color: gray },
  );

  y -= 30;
  page.drawLine({ start: { x, y }, end: { x: 545, y }, thickness: 0.5, color: gray });

  y -= 24;
  page.drawText("Ordine:", { x, y, size: 10, font: bold, color: black });
  page.drawText(pedido.numero, { x: x + 60, y, size: 10, font, color: black });

  y -= 18;
  page.drawText("Chiesa:", { x, y, size: 10, font: bold, color: black });
  page.drawText(pedido.igrejas?.nome ?? "—", { x: x + 60, y, size: 10, font, color: black });

  if (pedido.igrejas?.cidade) {
    y -= 16;
    page.drawText("Città:", { x, y, size: 10, font: bold, color: black });
    page.drawText(pedido.igrejas.cidade, { x: x + 60, y, size: 10, font, color: black });
  }
  if (pedido.igrejas?.responsavel) {
    y -= 16;
    page.drawText("Responsabile:", { x, y, size: 10, font: bold, color: black });
    page.drawText(pedido.igrejas.responsavel, { x: x + 90, y, size: 10, font, color: black });
  }
  if (pedido.solicitante_nome) {
    y -= 16;
    page.drawText("Richiedente:", { x, y, size: 10, font: bold, color: black });
    page.drawText(pedido.solicitante_nome, { x: x + 90, y, size: 10, font, color: black });
  }

  y -= 30;
  page.drawText("Articoli", { x, y, size: 12, font: bold, color: black });
  y -= 8;
  page.drawLine({ start: { x, y }, end: { x: 545, y }, thickness: 0.5, color: gray });

  y -= 16;
  page.drawText("Qtà", { x, y, size: 10, font: bold, color: black });
  page.drawText("Un", { x: x + 50, y, size: 10, font: bold, color: black });
  page.drawText("Prodotto", { x: x + 90, y, size: 10, font: bold, color: black });

  y -= 6;
  page.drawLine({ start: { x, y }, end: { x: 545, y }, thickness: 0.3, color: gray });

  for (const it of pedido.pedido_itens) {
    y -= 18;
    page.drawText(String(it.quantidade), { x, y, size: 10, font, color: black });
    page.drawText(it.snapshot_unidade, { x: x + 50, y, size: 10, font, color: black });
    page.drawText(it.snapshot_nome.slice(0, 60), { x: x + 90, y, size: 10, font, color: black });
  }

  if (pedido.observacao) {
    y -= 30;
    page.drawText("Nota:", { x, y, size: 10, font: bold, color: black });
    y -= 14;
    const lines = wrap(pedido.observacao, 90);
    for (const ln of lines) {
      page.drawText(ln, { x, y, size: 10, font, color: black });
      y -= 14;
    }
  }

  y -= 60;
  page.drawLine({ start: { x, y }, end: { x: 260, y }, thickness: 0.5, color: black });
  page.drawText("Consegnato da", { x, y: y - 14, size: 9, font, color: gray });

  page.drawLine({ start: { x: 310, y }, end: { x: 545, y }, thickness: 0.5, color: black });
  page.drawText("Ricevuto da", { x: 310, y: y - 14, size: 9, font, color: gray });

  return await pdf.save();
}

function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if ((line + " " + word).length > max) {
        out.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}
