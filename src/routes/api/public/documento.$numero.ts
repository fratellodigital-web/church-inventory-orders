import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/documento/$numero")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const numero = String(params.numero);
        const headers = {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${numero}.pdf"`,
          "Cache-Control": "private, no-store",
        };

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: doc } = await supabaseAdmin
            .from("documentos_saida")
            .select("drive_file_id")
            .eq("numero", numero)
            .maybeSingle();

          if (doc?.drive_file_id) {
            const { downloadFile } = await import("@/lib/google-drive.server");
            const bytes = await downloadFile(doc.drive_file_id);
            return new Response(new Uint8Array(bytes), { status: 200, headers });
          }

          const { gerarDocumentoSaidaPDF } = await import("@/lib/pdf.server");
          const bytes = await gerarDocumentoSaidaPDF(numero);
          return new Response(new Uint8Array(bytes), { status: 200, headers });
        } catch (e) {
          return new Response((e as Error).message || "Erro", { status: 404 });
        }
      },
    },
  },
});
