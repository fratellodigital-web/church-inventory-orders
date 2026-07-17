import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { buscarPedido } from "@/lib/orders.functions";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { SharePedidoButton } from "@/components/SharePedidoButton";

export const Route = createFileRoute("/pedido/$numero")({
  head: ({ params }) => ({ meta: [{ title: `Ordine ${params.numero} — Fondo Biblico` }] }),
  component: PedidoPage,
});

function PedidoPage() {
  const { numero } = Route.useParams();
  const fetcher = useServerFn(buscarPedido);
  const { data: pedido, isLoading } = useQuery({
    queryKey: ["pedido", numero],
    queryFn: () => fetcher({ data: { numero } }),
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : !pedido ? (
          <div className="text-center">
            <h1 className="font-display text-3xl">Ordine non trovato</h1>
            <Link to="/" className="mt-4 inline-block text-sm underline">Torna all&apos;inizio</Link>
          </div>
        ) : (
          <article className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Ordine</div>
                <h1 className="font-display text-3xl text-foreground">{pedido.numero}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(pedido.igrejas as { nome: string } | null)?.nome ?? "—"} ·{" "}
                  {new Date(pedido.created_at).toLocaleString("it-IT")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={pedido.status} />
                <SharePedidoButton
                  numero={pedido.numero}
                  igrejaNome={(pedido.igrejas as { nome: string } | null)?.nome}
                />
              </div>
            </div>

            {pedido.solicitante_nome && (
              <p className="mt-4 text-sm text-muted-foreground">
                Richiedente: <span className="text-foreground">{pedido.solicitante_nome}</span>
              </p>
            )}

            <h2 className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Articoli</h2>
            <ul className="mt-2 divide-y divide-border">
              {(pedido.pedido_itens as { quantidade: number; snapshot_nome: string; snapshot_unidade: string }[]).map((it, idx) => (
                <li key={idx} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{it.snapshot_nome}</span>
                  <span className="text-muted-foreground">
                    {it.quantidade} {it.snapshot_unidade}
                  </span>
                </li>
              ))}
            </ul>

            {"total_valor" in pedido && pedido.total_valor != null && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Totale</span>
                <span className="text-lg font-semibold text-foreground">
                  {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(pedido.total_valor)}
                </span>
              </div>
            )}

            {pedido.observacao && (
              <>
                <h2 className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Nota</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{pedido.observacao}</p>
              </>
            )}

            {Array.isArray(pedido.documentos_saida) && pedido.documentos_saida.length > 0 && (
              <div className="mt-6 rounded-md border border-border bg-secondary p-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Documento di uscita</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-medium">{(pedido.documentos_saida as { numero: string }[])[0].numero}</span>
                  <a
                    href={`/api/public/documento/${(pedido.documentos_saida as { numero: string }[])[0].numero}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline">Apri PDF</Button>
                  </a>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Questa pagina si aggiorna automaticamente. Conserva il numero <strong className="text-foreground">{pedido.numero}</strong>.
            </p>
          </article>
        )}
      </main>
    </div>
  );
}
