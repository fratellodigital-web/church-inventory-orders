import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listarPedidosIgreja } from "@/lib/orders.functions";
import { AppHeader } from "@/components/AppHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useIgrejaSelecionada } from "@/lib/cart-store";
import { ChevronRight, RefreshCw, ClipboardList } from "lucide-react";
import { SharePedidoButton } from "@/components/SharePedidoButton";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({ meta: [{ title: "Ordini — Fondo Biblico" }] }),
  component: MeusPedidosPage,
});

function MeusPedidosPage() {
  const { igreja } = useIgrejaSelecionada();
  const fetcher = useServerFn(listarPedidosIgreja);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["meus-pedidos", igreja?.id],
    queryFn: () => fetcher({ data: { igreja_id: igreja!.id } }),
    enabled: !!igreja,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  if (typeof window !== "undefined" && !igreja) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        rightSlot={
          <Link to="/catalogo">
            <Button variant="outline" size="sm">Nuovo ordine</Button>
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">Ordini</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {igreja?.nome} · lo stato viene aggiornato dall&apos;amministrazione
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Aggiorna"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="ml-1 hidden sm:inline">Aggiorna</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Nessun ordine ancora.</p>
            <Link to="/catalogo" className="mt-4 inline-block">
              <Button size="sm">Effettua un ordine</Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 transition hover:border-foreground/40"
              >
                <Link
                  to="/pedido/$numero"
                  params={{ numero: p.numero }}
                  className="flex min-w-0 flex-1 items-center gap-3 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.numero}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("it-IT")} · {p.total_itens}{" "}
                      {p.total_itens === 1 ? "articolo" : "articoli"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                <SharePedidoButton
                  numero={p.numero}
                  variant="ghost"
                  size="icon"
                  showLabel={false}
                  className="shrink-0"
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
