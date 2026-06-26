import { createFileRoute } from "@tanstack/react-router";
import { extractDriveFileId } from "@/lib/google-drive.server";

export const Route = createFileRoute("/api/admin/comprovante/$pedidoId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { isAdmin } = await import("@/lib/admin-session.server");
        if (!isAdmin()) {
          return new Response("Unauthorized", { status: 401 });
        }

        const pedidoId = String(params.pedidoId);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: pedido, error } = await supabaseAdmin
            .from("pedidos")
            .select("comprovante_url, comprovante_drive_file_id")
            .eq("id", pedidoId)
            .maybeSingle();

          if (error) throw new Error(error.message);
          if (!pedido?.comprovante_url && !pedido?.comprovante_drive_file_id) {
            return new Response("Comprovante não encontrado", { status: 404 });
          }

          const fileId =
            pedido.comprovante_drive_file_id ??
            (pedido.comprovante_url ? extractDriveFileId(pedido.comprovante_url) : null);

          // Arquivo no Google Drive — proxy via service account (preview em <img>).
          if (fileId) {
            const { downloadFileWithMeta } = await import("@/lib/google-drive.server");
            const { buffer, mimeType } = await downloadFileWithMeta(fileId);
            return new Response(new Uint8Array(buffer), {
              status: 200,
              headers: {
                "Content-Type": mimeType,
                "Cache-Control": "private, max-age=300",
              },
            });
          }

          // URL legada (ex.: Supabase Storage) — redireciona.
          if (pedido.comprovante_url) {
            return Response.redirect(pedido.comprovante_url, 302);
          }

          return new Response("Comprovante não encontrado", { status: 404 });
        } catch (e) {
          return new Response((e as Error).message || "Erro", { status: 500 });
        }
      },
    },
  },
});
