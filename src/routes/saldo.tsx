import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { criarDeposito, listarDepositosIgreja, obterSaldoIgreja } from "@/lib/saldo.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIgrejaSelecionada } from "@/lib/cart-store";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/saldo")({
  head: () => ({ meta: [{ title: "Saldo — Fondo Biblico" }] }),
  component: SaldoPage,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "In attesa di conferma",
  confirmado: "Confermato",
  rejeitado: "Rifiutato",
};

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine"));
    reader.readAsDataURL(file);
  });
}

function SaldoPage() {
  const { igreja } = useIgrejaSelecionada();
  const qc = useQueryClient();
  const getSaldo = useServerFn(obterSaldoIgreja);
  const listDepositos = useServerFn(listarDepositosIgreja);
  const criar = useServerFn(criarDeposito);

  const [valor, setValor] = useState("");
  const [numero, setNumero] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: saldoData, isLoading: loadingSaldo } = useQuery({
    queryKey: ["saldo-igreja", igreja?.id],
    queryFn: () => getSaldo({ data: { igreja_id: igreja!.id } }),
    enabled: !!igreja,
  });

  const { data: depositos, isLoading: loadingDeps } = useQuery({
    queryKey: ["depositos-igreja", igreja?.id],
    queryFn: () => listDepositos({ data: { igreja_id: igreja!.id } }),
    enabled: !!igreja,
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!igreja) throw new Error("Seleziona una chiesa");
      if (!file) throw new Error("Allega l'immagine del bonifico");
      const v = Number(valor.replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Importo non valido");
      const base64 = await fileToBase64(file);
      return criar({
        data: {
          igreja_id: igreja.id,
          valor: v,
          numero_transacao: numero.trim(),
          imagem: { base64, contentType: file.type || "image/jpeg", nome: file.name },
        },
      });
    },
    onSuccess: () => {
      toast.success("Deposito inviato. In attesa di conferma.");
      setValor("");
      setNumero("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["depositos-igreja", igreja?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (typeof window !== "undefined" && !igreja) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        rightSlot={
          <div className="flex gap-2">
            <Link to="/meus-pedidos">
              <Button variant="outline" size="sm">Ordini</Button>
            </Link>
            <Link to="/catalogo">
              <Button variant="outline" size="sm">Nuovo ordine</Button>
            </Link>
          </div>
        }
      />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Saldo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {igreja?.nome} · depositi anticipati in attesa di conferma
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Saldo disponibile
          </div>
          <div className="mt-2 font-display text-3xl">
            {loadingSaldo ? "…" : currency.format(saldoData?.saldo ?? 0)}
          </div>
        </div>

        <form
          className="mt-8 space-y-4 rounded-lg border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
        >
          <h2 className="text-sm font-medium">Nuovo deposito</h2>
          <div className="space-y-1.5">
            <Label htmlFor="valor">Importo (€)</Label>
            <Input
              id="valor"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numero">Nº transazione</Label>
            <Input
              id="numero"
              required
              maxLength={100}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="CRO / riferimento bonifico"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img">Immagine del bonifico</Label>
            <Input
              id="img"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PNG, JPEG, WebP o GIF · max 5 MB</p>
          </div>
          <Button type="submit" className="w-full" disabled={mut.isPending}>
            {mut.isPending ? "Invio in corso..." : "Invia deposito"}
          </Button>
        </form>

        <h2 className="mt-10 text-xs uppercase tracking-widest text-muted-foreground">Storico</h2>
        {loadingDeps ? (
          <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted" />
        ) : !depositos || depositos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nessun deposito ancora.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {depositos.map((d) => (
              <li key={d.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{currency.format(d.valor)}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {d.numero_transacao} · {new Date(d.created_at).toLocaleString("it-IT")}
                    </div>
                    {d.observacao_admin && (
                      <p className="mt-1 text-xs text-muted-foreground">{d.observacao_admin}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </div>
                {d.imagem_url && (
                  <a
                    href={d.imagem_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs underline"
                  >
                    Vedi immagine
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
