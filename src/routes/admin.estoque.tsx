import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListarProdutos,
  adminEntradaEstoque,
  adminListarMovimentacoes,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Lock, Undo2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/estoque")({ component: EstoquePage });

const TIPO_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  entrada: { label: "Entrata", icon: <ArrowUp className="h-3 w-3 text-foreground" /> },
  saida: { label: "Uscita", icon: <ArrowDown className="h-3 w-3 text-destructive" /> },
  reserva: { label: "Riserva", icon: <Lock className="h-3 w-3 text-muted-foreground" /> },
  estorno_reserva: { label: "Storno", icon: <Undo2 className="h-3 w-3 text-muted-foreground" /> },
  ajuste: { label: "Adeguamento", icon: <ArrowUp className="h-3 w-3" /> },
};

function EstoquePage() {
  const listProd = useServerFn(adminListarProdutos);
  const listMov = useServerFn(adminListarMovimentacoes);
  const { data: produtos } = useQuery({ queryKey: ["admin-produtos"], queryFn: () => listProd() });
  const { data: movs, isLoading } = useQuery({ queryKey: ["admin-movs"], queryFn: () => listMov() });
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl">Magazzino</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><ArrowUp className="mr-1 h-4 w-4" /> Registra entrata</Button>
          </DialogTrigger>
          <EntradaDialog produtos={produtos ?? []} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <h2 className="mb-2 mt-6 text-xs uppercase tracking-widest text-muted-foreground">Cronologia movimenti</h2>
      {isLoading ? (
        <div className="h-60 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Prodotto</th>
                <th className="px-4 py-2 text-right">Qtà</th>
                <th className="px-4 py-2">Ordine</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(movs ?? []).map((m) => {
                const t = TIPO_LABELS[m.tipo] ?? { label: m.tipo, icon: null };
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5">{t.icon} {t.label}</span></td>
                    <td className="px-4 py-2">{(m.produtos as { nome: string } | null)?.nome ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono">{m.quantidade}</td>
                    <td className="px-4 py-2 text-muted-foreground">{(m.pedidos as { numero: string } | null)?.numero ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString("it-IT")}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{m.observacao ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EntradaDialog({
  produtos,
  onClose,
}: {
  produtos: { id: string; nome: string; unidade: string }[];
  onClose: () => void;
}) {
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const qc = useQueryClient();
  const entrada = useServerFn(adminEntradaEstoque);
  const mut = useMutation({
    mutationFn: () => entrada({ data: { produto_id: produtoId, quantidade: Number(qtd), observacao: obs || null } }),
    onSuccess: () => {
      toast.success("Entrata registrata");
      qc.invalidateQueries({ queryKey: ["admin-produtos"] });
      qc.invalidateQueries({ queryKey: ["admin-movs"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registra entrata di magazzino</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
        <div>
          <Label>Prodotto</Label>
          <Select value={produtoId} onValueChange={setProdutoId}>
            <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
            <SelectContent>
              {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantità</Label>
          <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} required />
        </div>
        <div>
          <Label>Nota</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Es: donazione, acquisto, adeguamento" />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!produtoId || mut.isPending}>{mut.isPending ? "Salvataggio..." : "Registra"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
