import { createFileRoute, useRouter, Navigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { listarProdutos, criarPedido } from "@/lib/orders.functions";
import { AppHeader } from "@/components/AppHeader";
import { useCart, useIgrejaSelecionada } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2, Search, Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo — Fundo Bíblico" }] }),
  component: CatalogoPage,
});

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
function formatPreco(value: number | null | undefined) {
  return currency.format(Number(value ?? 0));
}

function CatalogoPage() {
  const { igreja } = useIgrejaSelecionada();
  const fetcher = useServerFn(listarProdutos);
  const { data: produtos, isLoading } = useQuery({ queryKey: ["produtos"], queryFn: () => fetcher() });
  const { add, items, totalItens } = useCart();
  const [q, setQ] = useState("");

  if (typeof window !== "undefined" && !igreja) return <Navigate to="/" />;

  const filtered = (produtos ?? []).filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        rightSlot={
          <div className="flex items-center gap-2">
            <Link to="/meus-pedidos">
              <Button variant="outline" size="sm">
                <ClipboardList className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Pedidos</span>
              </Button>
            </Link>
            <CartButton total={totalItens} />
          </div>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">Catálogo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido para <span className="font-medium text-foreground">{igreja?.nome}</span>
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const inCart = items.find((c) => c.produto_id === p.id);
              const remaining = p.estoque_disponivel - (inCart?.quantidade ?? 0);
              return (
                <article
                  key={p.id}
                  className="flex flex-col rounded-lg border border-border bg-card p-4 transition hover:border-foreground/40"
                >
                  <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-md bg-secondary">
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.categoria ?? "—"}</div>
                    <h3 className="mt-1 font-medium text-foreground">{p.nome}</h3>
                    {p.descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{formatPreco(p.preco)}</div>
                      <span className="text-xs text-muted-foreground">
                        {p.estoque_disponivel} {p.unidade} disp.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      disabled={remaining <= 0}
                      onClick={() => {
                        add({
                          produto_id: p.id,
                          nome: p.nome,
                          unidade: p.unidade,
                          preco: p.preco,
                          estoque_disponivel: p.estoque_disponivel,
                        });
                        toast.success(`${p.nome} adicionado`);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function CartButton({ total }: { total: number }) {
  const [open, setOpen] = useState(false);
  const { items, setQty, remove, clear, totalValor } = useCart();
  const { igreja } = useIgrejaSelecionada();
  const [solicitante, setSolicitante] = useState("");
  const [obs, setObs] = useState("");
  const router = useRouter();
  const criar = useServerFn(criarPedido);
  const mut = useMutation({
    mutationFn: () =>
      criar({
        data: {
          igreja_id: igreja!.id,
          solicitante_nome: solicitante || null,
          observacao: obs || null,
          itens: items.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
        },
      }),
    onSuccess: (res) => {
      toast.success(`Pedido ${res.numero} criado!`);
      clear();
      setOpen(false);
      router.navigate({ to: "/pedido/$numero", params: { numero: res.numero } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Carrinho</span>
          {total > 0 && (
            <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
              {total}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Seu pedido</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carrinho vazio.</p>
          ) : (
            <ul className="space-y-3 py-2">
              {items.map((it) => (
                <li key={it.produto_id} className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{it.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPreco(it.preco)} × {it.quantidade} = {formatPreco(it.preco * it.quantidade)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.produto_id, it.quantidade - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      value={it.quantidade}
                      onChange={(e) => setQty(it.produto_id, Number(e.target.value) || 0)}
                      className="h-7 w-12 rounded border border-input bg-background text-center text-sm"
                    />
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(it.produto_id, it.quantidade + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => remove(it.produto_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <div className="space-y-3 py-4">
              <Input placeholder="Seu nome (opcional)" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} />
              <Textarea placeholder="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            </div>
          )}
        </div>
        <SheetFooter className="flex-col gap-3 border-t border-border pt-4">
          {items.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold text-foreground">{formatPreco(totalValor)}</span>
            </div>
          )}
          <Button className="w-full" disabled={items.length === 0 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Enviando..." : "Enviar pedido"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
