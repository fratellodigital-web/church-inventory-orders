import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListarDepositos,
  adminConfirmarDeposito,
  adminRejeitarDeposito,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/depositos")({
  component: DepositosPage,
});

const FILTROS = [
  { label: "In attesa", value: "pendente" },
  { label: "Confermati", value: "confirmado" },
  { label: "Rifiutati", value: "rejeitado" },
  { label: "Tutti", value: "" },
];

const STATUS_LABEL: Record<string, string> = {
  pendente: "In attesa",
  confirmado: "Confermato",
  rejeitado: "Rifiutato",
};

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function DepositosPage() {
  const [status, setStatus] = useState("pendente");
  const list = useServerFn(adminListarDepositos);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-depositos", status],
    queryFn: () => list({ data: { status: status || null } }),
  });

  return (
    <div>
      <h1 className="mb-4 font-display text-3xl">Depositi</h1>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={status === f.value ? "default" : "outline"}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : !data || data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nessun deposito.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => (
            <DepositoCard key={d.id} deposito={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

type DepositoRow = {
  id: string;
  valor: number;
  numero_transacao: string;
  imagem_url: string | null;
  status: string;
  observacao_admin: string | null;
  created_at: string;
  igrejas: { id: string; nome: string; cidade: string | null } | null;
};

function DepositoCard({ deposito }: { deposito: DepositoRow }) {
  const qc = useQueryClient();
  const confirmar = useServerFn(adminConfirmarDeposito);
  const rejeitar = useServerFn(adminRejeitarDeposito);
  const [nota, setNota] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-depositos"] });
    qc.invalidateQueries({ queryKey: ["admin-igrejas"] });
  };

  const mOk = useMutation({
    mutationFn: () => confirmar({ data: { id: deposito.id, observacao_admin: nota || null } }),
    onSuccess: () => {
      toast.success("Deposito confermato · saldo aggiornato");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mNo = useMutation({
    mutationFn: () => rejeitar({ data: { id: deposito.id, observacao_admin: nota || null } }),
    onSuccess: () => {
      toast.success("Deposito rifiutato");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const igreja = deposito.igrejas;

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">{igreja?.nome ?? "—"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {igreja?.cidade ?? ""} · {new Date(deposito.created_at).toLocaleString("it-IT")}
          </div>
          <div className="mt-2 text-lg font-semibold">{currency.format(deposito.valor)}</div>
          <div className="text-sm text-muted-foreground">Nº {deposito.numero_transacao}</div>
        </div>
        <span className="text-xs text-muted-foreground">
          {STATUS_LABEL[deposito.status] ?? deposito.status}
        </span>
      </div>

      {deposito.imagem_url && (
        <a
          href={deposito.imagem_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm underline"
        >
          Vedi immagine
        </a>
      )}

      {deposito.observacao_admin && (
        <p className="mt-2 text-xs text-muted-foreground">{deposito.observacao_admin}</p>
      )}

      {deposito.status === "pendente" && (
        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={`nota-${deposito.id}`} className="text-xs">
              Nota (opzionale)
            </Label>
            <Input
              id={`nota-${deposito.id}`}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota per la chiesa"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => mOk.mutate()} disabled={mOk.isPending || mNo.isPending}>
              {mOk.isPending ? "..." : "Conferma"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => mNo.mutate()}
              disabled={mOk.isPending || mNo.isPending}
            >
              Rifiuta
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
