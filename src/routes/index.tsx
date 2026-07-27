import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listarIgrejas } from "@/lib/orders.functions";
import { AppHeader } from "@/components/AppHeader";
import { useIgrejaSelecionada } from "@/lib/cart-store";
import { ChevronRight, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fondo Biblico - CCI" },
      { name: "description", content: "Seleziona la località e la chiesa per avviare un ordine sul Fondo Biblico - CCI." },
    ],
  }),
  component: IndexPage,
});

function formatLocalidade(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s|')\p{L}/gu, (m) => m.toUpperCase());
}

function IndexPage() {
  const fetcher = useServerFn(listarIgrejas);
  const { data: igrejas, isLoading } = useQuery({ queryKey: ["igrejas-publicas"], queryFn: () => fetcher() });
  const { select } = useIgrejaSelecionada();
  const router = useRouter();
  const [localidade, setLocalidade] = useState<string | null>(null);

  const localidades = useMemo(() => {
    const set = new Set<string>();
    for (const ig of igrejas ?? []) {
      if (ig.regiao) set.add(ig.regiao);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [igrejas]);

  const filtradas = useMemo(
    () => (igrejas ?? []).filter((ig) => (localidade ? ig.regiao === localidade : false)),
    [igrejas, localidade],
  );

  const semLocalidade = useMemo(() => (igrejas ?? []).filter((ig) => !ig.regiao), [igrejas]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Benvenuto/a</p>
          <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">
            {localidade ? "Seleziona la tua chiesa" : "Seleziona la località"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {localidade
              ? "Scegli la chiesa per cui farai l'ordine."
              : "Prima scegli la località della chiesa."}
          </p>
        </div>

        {isLoading && !igrejas ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : localidades.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nessuna chiesa registrata ancora.
          </p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              {localidades.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocalidade((cur) => (cur === loc ? null : loc))}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    localidade === loc
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {formatLocalidade(loc)}
                </button>
              ))}
            </div>

            {!localidade ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Tocca una località sopra per vedere le chiese.
              </p>
            ) : filtradas.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nessuna chiesa registrata in questa località.
              </p>
            ) : (
              <ul className="space-y-2">
                {filtradas.map((ig) => (
                  <li key={ig.id}>
                    <button
                      onClick={() => {
                        select({ id: ig.id, nome: ig.nome, cidade: ig.cidade ?? null });
                        router.navigate({ to: "/catalogo" });
                      }}
                      className="group flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition hover:border-foreground hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{ig.nome}</div>
                          {ig.cidade && <div className="text-xs text-muted-foreground">{ig.cidade}</div>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {semLocalidade.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ci sono {semLocalidade.length} chiesa/e senza località. Imposta la località nel pannello admin.
          </p>
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Amministratore? <a href="/admin" className="underline hover:text-foreground">Accedi al pannello</a>
        </p>
      </main>
    </div>
  );
}
