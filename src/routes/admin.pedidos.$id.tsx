import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  adminGetPedido,
  adminAprovarPedido,
  adminMarcarPago,
  adminAplicarSaldoPedido,
  adminMudarStatus,
  adminCancelarPedido,
  adminSalvarComprovante,
  adminEditarPedido,
  adminListarProdutos,
} from "@/lib/admin.functions";
import { pedidoMostraPreco } from "@/lib/pedido-status";
import { rimanentePedido, roundMoney } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileText, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SharePedidoButton } from "@/components/SharePedidoButton";
import { Checkbox } from "@/components/ui/checkbox";
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine"));
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/admin/pedidos/$id")({
  component: PedidoDetalhe,
});

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetcher = useServerFn(adminGetPedido);
  const aprovar = useServerFn(adminAprovarPedido);
  const pagar = useServerFn(adminMarcarPago);
  const aplicarSaldo = useServerFn(adminAplicarSaldoPedido);
  const mudar = useServerFn(adminMudarStatus);
  const cancelar = useServerFn(adminCancelarPedido);
  const { data: p, isLoading } = useQuery({ queryKey: ["admin-pedido", id], queryFn: () => fetcher({ data: { id } }) });

  const [confirmaBonifico, setConfirmaBonifico] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-pedido", id] });
    qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
    qc.invalidateQueries({ queryKey: ["admin-igrejas"] });
  };

  const mAprovar = useMutation({
    mutationFn: () => aprovar({ data: { id } }),
    onSuccess: () => {
      toast.success("Ordine approvato");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mPagar = useMutation({
    mutationFn: () => pagar({ data: { id, pagar_bonifico_restante: confirmaBonifico } }),
    onSuccess: (res) => {
      toast.success(`Pagato. Documento ${res.documento_numero} generato.`);
      setConfirmaBonifico(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mAplicarSaldo = useMutation({
    mutationFn: (valor: number) => aplicarSaldo({ data: { id, valor } }),
    onSuccess: (res) => {
      toast.success(
        res.rimanente > 0
          ? `Saldo applicato. Rimanente: ${new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(res.rimanente)}`
          : "Saldo applicato. Totale coperto — puoi segnare come pagato.",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEntregue = useMutation({
    mutationFn: () => mudar({ data: { id, status: "entregue" } }),
    onSuccess: () => { toast.success("Segnato come consegnato"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mSeparacao = useMutation({
    mutationFn: () => mudar({ data: { id, status: "em_separacao" } }),
    onSuccess: () => { toast.success("In preparazione"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mCancelar = useMutation({
    mutationFn: () => cancelar({ data: { id } }),
    onSuccess: () => { toast.success("Ordine annullato"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="h-60 animate-pulse rounded-lg bg-muted" />;
  if (!p) return <p>Non trovato</p>;

  const igreja = p.igrejas as {
    nome: string;
    cidade: string | null;
    responsavel: string | null;
    telefone: string | null;
    saldo: number;
  } | null;
  const itens = p.pedido_itens as {
    id: string;
    produto_id: string;
    quantidade: number;
    snapshot_nome: string;
    snapshot_unidade: string;
    snapshot_preco: number | null;
  }[];
  const docs = (p.documentos_saida ?? []) as { numero: string }[];
  const isPendente = p.status === "pendente";
  const isAprovado = p.status === "aprovado";
  const mostraPreco = pedidoMostraPreco(p.status);
  const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const totalValor = mostraPreco
    ? itens.reduce((s, it) => s + Number(it.snapshot_preco ?? 0) * it.quantidade, 0)
    : 0;
  const valorPagoSaldo = Number(p.valor_pago_saldo ?? 0);
  const valorPagoBonifico = Number(p.valor_pago_bonifico ?? 0);
  const rimanente = mostraPreco
    ? rimanentePedido({
        total: totalValor,
        valor_pago_saldo: valorPagoSaldo,
        valor_pago_bonifico: valorPagoBonifico,
      })
    : 0;
  const saldoIgreja = Number(igreja?.saldo ?? 0);
  const maxSaldoAplicavel = roundMoney(Math.min(saldoIgreja, rimanente));
  const rimanenteDopoSaldo = roundMoney(rimanente - maxSaldoAplicavel);

  return (
    <div>
      <Link to="/admin/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Indietro
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <article className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Ordine</div>
              <h1 className="font-display text-3xl">{p.numero}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleString("it-IT")}</p>
            </div>
            <StatusBadge status={p.status} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Chiesa</div>
              <div className="font-medium">{igreja?.nome}</div>
              {igreja?.cidade && <div className="text-muted-foreground">{igreja.cidade}</div>}
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">Saldo disponibile</div>
              <div className="font-semibold">{currency.format(saldoIgreja)}</div>
            </div>
            {igreja?.responsavel && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Responsabile</div>
                <div className="font-medium">{igreja.responsavel}</div>
                {igreja.telefone && <div className="text-muted-foreground">{igreja.telefone}</div>}
              </div>
            )}
            {p.solicitante_nome && !isPendente && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Richiedente</div>
                <div className="font-medium">{p.solicitante_nome}</div>
              </div>
            )}
          </div>

          {isPendente ? (
            <EditarPedidoForm
              pedidoId={p.id}
              solicitante={p.solicitante_nome}
              observacao={p.observacao}
              itens={itens}
              saldoIgreja={saldoIgreja}
              onSaved={refresh}
            />
          ) : (
            <>
              <h2 className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Articoli</h2>
              <ul className="mt-3 divide-y divide-border">
                {itens.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0 pr-0 font-medium sm:pr-3">{it.snapshot_nome}</span>
                    <span className="shrink-0 text-muted-foreground sm:text-right">
                      <span className="font-medium text-foreground">{it.quantidade}</span>{" "}
                      {it.snapshot_unidade}
                    </span>
                  </li>
                ))}
              </ul>

              {p.observacao && (
                <>
                  <h2 className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Nota</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.observacao}</p>
                </>
              )}

              {mostraPreco && (
                <div className="mt-6 space-y-1.5 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Totale</span>
                    <span className="text-lg font-semibold">{currency.format(totalValor)}</span>
                  </div>
                  {(valorPagoSaldo > 0 || p.status === "pago" || isAprovado) && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Dal saldo</span>
                      <span>− {currency.format(valorPagoSaldo)}</span>
                    </div>
                  )}
                  {valorPagoBonifico > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Da bonifico</span>
                      <span>− {currency.format(valorPagoBonifico)}</span>
                    </div>
                  )}
                  {isAprovado && (
                    <div className="flex items-center justify-between font-medium">
                      <span>Rimanente</span>
                      <span>{currency.format(rimanente)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </article>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Saldo chiesa</div>
            <div className="mt-1 text-xl font-semibold">{currency.format(saldoIgreja)}</div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Azioni</h3>
            <div className="mt-3 flex flex-col gap-2">
              <SharePedidoButton numero={p.numero} igrejaNome={igreja?.nome} className="w-full" />
              {p.status === "pendente" && (
                <>
                  <Button onClick={() => mAprovar.mutate()} disabled={mAprovar.isPending}>
                    {mAprovar.isPending ? "Elaborazione..." : "Approva ordine"}
                  </Button>
                  <Button variant="outline" onClick={() => mCancelar.mutate()} disabled={mCancelar.isPending}>
                    Annulla ordine
                  </Button>
                </>
              )}
              {isAprovado && (
                <>
                  <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm space-y-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Totale</span>
                      <span>{currency.format(totalValor)}</span>
                    </div>
                    {valorPagoSaldo > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Già dal saldo</span>
                        <span>− {currency.format(valorPagoSaldo)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>Rimanente</span>
                      <span>{currency.format(rimanente)}</span>
                    </div>
                    {maxSaldoAplicavel > 0 && (
                      <>
                        <div className="flex justify-between font-medium">
                          <span>Applicabile ora</span>
                          <span>{currency.format(maxSaldoAplicavel)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Rimanente dopo</span>
                          <span>{currency.format(rimanenteDopoSaldo)}</span>
                        </div>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={mAplicarSaldo.isPending || maxSaldoAplicavel <= 0}
                      onClick={() => mAplicarSaldo.mutate(maxSaldoAplicavel)}
                    >
                      {mAplicarSaldo.isPending
                        ? "..."
                        : maxSaldoAplicavel > 0
                          ? `Applica saldo (${currency.format(maxSaldoAplicavel)})`
                          : "Nessun saldo da applicare"}
                    </Button>
                    {maxSaldoAplicavel <= 0 && (
                      <p className="text-xs text-muted-foreground">
                        {rimanente <= 0
                          ? "Totale già coperto dal saldo."
                          : "Nessun saldo disponibile."}
                      </p>
                    )}
                  </div>

                  {rimanente > 0 && (
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        checked={confirmaBonifico}
                        onCheckedChange={(v) => setConfirmaBonifico(v === true)}
                        className="mt-0.5"
                      />
                      <span>
                        Conferma bonifico del rimanente ({currency.format(rimanente)}) e segna come pagato
                      </span>
                    </label>
                  )}

                  <Button
                    onClick={() => mPagar.mutate()}
                    disabled={mPagar.isPending || (rimanente > 0 && !confirmaBonifico)}
                  >
                    {mPagar.isPending ? "Elaborazione..." : "Segna come pagato"}
                  </Button>
                  <Button variant="outline" onClick={() => mCancelar.mutate()} disabled={mCancelar.isPending}>
                    Annulla ordine
                  </Button>
                </>
              )}
              {p.status === "pago" && (
                <>
                  <Button onClick={() => mSeparacao.mutate()} disabled={mSeparacao.isPending}>In preparazione</Button>
                  <Button variant="outline" onClick={() => mEntregue.mutate()} disabled={mEntregue.isPending}>Segna come consegnato</Button>
                </>
              )}
              {p.status === "em_separacao" && (
                <Button onClick={() => mEntregue.mutate()} disabled={mEntregue.isPending}>Segna come consegnato</Button>
              )}
            </div>
          </div>

          <ComprovanteCard
            id={p.id}
            comprovanteUrl={p.comprovante_url}
            comprovanteNumero={p.comprovante_numero}
            onSaved={refresh}
          />

          {docs.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Documento di uscita</h3>
              <div className="mt-2 font-medium">{docs[0].numero}</div>
              <a href={`/api/public/documento/${docs[0].numero}`} target="_blank" rel="noreferrer" className="mt-3 block">
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="mr-2 h-3.5 w-3.5" /> Apri PDF
                </Button>
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type ItemEdit = {
  produto_id: string;
  nome: string;
  unidade: string;
  preco: number;
  quantidade: number;
  estoque_disponivel: number;
};

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function EditarPedidoForm({
  pedidoId,
  solicitante,
  observacao,
  itens,
  saldoIgreja,
  onSaved,
}: {
  pedidoId: string;
  solicitante: string | null;
  observacao: string | null;
  itens: { produto_id: string; quantidade: number; snapshot_nome: string; snapshot_unidade: string }[];
  saldoIgreja: number;
  onSaved: () => void;
}) {
  const listProdutos = useServerFn(adminListarProdutos);
  const salvar = useServerFn(adminEditarPedido);
  const { data: produtos } = useQuery({ queryKey: ["admin-produtos"], queryFn: () => listProdutos() });

  const [solicitanteNome, setSolicitanteNome] = useState(solicitante ?? "");
  const [obs, setObs] = useState(observacao ?? "");
  const [linhas, setLinhas] = useState<ItemEdit[]>([]);
  const [addProdutoId, setAddProdutoId] = useState("");

  useEffect(() => {
    const pm = new Map((produtos ?? []).map((p) => [p.id, p]));
    setSolicitanteNome(solicitante ?? "");
    setObs(observacao ?? "");
    setLinhas(
      itens.map((it) => {
        const p = pm.get(it.produto_id);
        return {
          produto_id: it.produto_id,
          nome: it.snapshot_nome,
          unidade: it.snapshot_unidade,
          preco: Number(p?.preco ?? 0),
          quantidade: it.quantidade,
          estoque_disponivel: Number(p?.estoque_disponivel ?? 0) + it.quantidade,
        };
      }),
    );
  }, [itens, solicitante, observacao, produtos]);

  const total = useMemo(
    () => roundMoney(linhas.reduce((s, l) => s + l.preco * l.quantidade, 0)),
    [linhas],
  );
  const dalSaldo = roundMoney(Math.min(saldoIgreja, total));
  const daBonifico = roundMoney(total - dalSaldo);

  const produtosParaAdd = (produtos ?? []).filter(
    (p) => p.ativo && !linhas.some((l) => l.produto_id === p.id),
  );

  const setQty = (produto_id: string, quantidade: number) => {
    setLinhas((rows) =>
      rows.map((r) =>
        r.produto_id === produto_id
          ? { ...r, quantidade: Math.max(1, Math.min(quantidade, r.estoque_disponivel)) }
          : r,
      ),
    );
  };

  const remove = (produto_id: string) => {
    setLinhas((rows) => rows.filter((r) => r.produto_id !== produto_id));
  };

  const addProduto = () => {
    if (!addProdutoId) return;
    const p = produtos?.find((x) => x.id === addProdutoId);
    if (!p) return;
    setLinhas((rows) => [
      ...rows,
      {
        produto_id: p.id,
        nome: p.nome,
        unidade: p.unidade,
        preco: Number(p.preco ?? 0),
        quantidade: 1,
        estoque_disponivel: p.estoque_disponivel,
      },
    ]);
    setAddProdutoId("");
  };

  const mut = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          id: pedidoId,
          solicitante_nome: solicitanteNome || null,
          observacao: obs || null,
          itens: linhas.map((l) => ({ produto_id: l.produto_id, quantidade: l.quantidade })),
        },
      }),
    onSuccess: () => {
      toast.success("Ordine aggiornato");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-6">
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Modifica ordine</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Richiedente</Label>
          <Input value={solicitanteNome} onChange={(e) => setSolicitanteNome(e.target.value)} placeholder="Nome (opzionale)" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nota</Label>
        <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Nota (opzionale)" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Articoli</Label>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aggiungi almeno un prodotto.</p>
        ) : (
          <ul className="space-y-3">
            {linhas.map((it) => (
              <li
                key={it.produto_id}
                className="space-y-3 rounded-md border border-border p-4 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{it.nome}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {currency.format(it.preco)} · max. {it.estoque_disponivel} {it.unidade}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={() => remove(it.produto_id)}
                    aria-label="Rimuovi articolo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Quantità</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => setQty(it.produto_id, it.quantidade - 1)}
                        aria-label="Diminuisci quantità"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={it.estoque_disponivel}
                        value={it.quantidade}
                        onChange={(e) => setQty(it.produto_id, Number(e.target.value) || 1)}
                        className="h-9 w-16 text-center"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-9 w-9"
                        onClick={() => setQty(it.produto_id, it.quantidade + 1)}
                        aria-label="Aumenta quantità"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-end">
                    <span className="text-xs text-muted-foreground">Subtotale</span>
                    <span className="font-medium">{currency.format(it.preco * it.quantidade)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Select value={addProdutoId} onValueChange={setAddProdutoId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Aggiungi prodotto..." />
            </SelectTrigger>
            <SelectContent>
              {produtosParaAdd.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} ({p.estoque_disponivel} disp.)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" disabled={!addProdutoId} onClick={addProduto}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Aggiungi
          </Button>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Totale</span>
          <span className="text-lg font-semibold">{currency.format(total)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Saldo disponibile</span>
          <span>{currency.format(saldoIgreja)}</span>
        </div>
        {total <= 0 ? null : total <= saldoIgreja ? (
          <p className="text-xs text-muted-foreground">Copribile interamente dal saldo</p>
        ) : (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Dal saldo</span>
              <span>{currency.format(dalSaldo)}</span>
            </div>
            <div className="flex justify-between">
              <span>Da bonifico</span>
              <span>{currency.format(daBonifico)}</span>
            </div>
          </div>
        )}
      </div>

      <Button className="w-full sm:w-auto" disabled={linhas.length === 0 || mut.isPending} onClick={() => mut.mutate()}>
        {mut.isPending ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </div>
  );
}

function ComprovanteCard({
  id,
  comprovanteUrl,
  comprovanteNumero,
  onSaved,
}: {
  id: string;
  comprovanteUrl: string | null;
  comprovanteNumero: string | null;
  onSaved: () => void;
}) {
  const [numero, setNumero] = useState(comprovanteNumero ?? "");
  const [file, setFile] = useState<File | null>(null);
  const salvar = useServerFn(adminSalvarComprovante);

  const mut = useMutation({
    mutationFn: async () => {
      let imagem: { base64: string; contentType: string; nome: string } | null = null;
      if (file) {
        const base64 = await fileToBase64(file);
        imagem = { base64, contentType: file.type, nome: file.name };
      }
      return salvar({ data: { id, comprovante_numero: numero || null, imagem } });
    },
    onSuccess: () => {
      toast.success("Ricevuta salvata");
      setFile(null);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Ricevuta (bonifico)</h3>
      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Numero della ricevuta</Label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº del bonifico" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Immagine della ricevuta</Label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {(comprovanteUrl || file) && (
          <div className="space-y-2">
            {file ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(file)}
                alt="Anteprima della ricevuta"
                className="max-h-48 w-full rounded-md border border-border object-contain"
              />
            ) : comprovanteUrl ? (
              <a href={`/api/admin/comprovante/${id}`} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/comprovante/${id}`}
                  alt="Ricevuta di pagamento"
                  className="max-h-48 w-full rounded-md border border-border object-contain bg-secondary"
                />
              </a>
            ) : null}
            {comprovanteUrl && !file && (
              <p className="text-center text-xs text-muted-foreground">
                <a href={`/api/admin/comprovante/${id}`} target="_blank" rel="noreferrer" className="underline">
                  Apri immagine in una nuova scheda
                </a>
              </p>
            )}
          </div>
        )}
        <Button className="w-full" size="sm" disabled={mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Salvataggio..." : "Salva ricevuta"}
        </Button>
      </div>
    </div>
  );
}
