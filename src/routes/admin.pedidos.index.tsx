import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListarPedidos,
  adminAprovarPedido,
  adminMarcarPago,
  adminMudarStatus,
  adminCancelarPedido,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsDesktop } from "@/lib/use-media-query";
import { toast } from "sonner";
import { SharePedidoButton } from "@/components/SharePedidoButton";

export const Route = createFileRoute("/admin/pedidos/")({
  component: PedidosPage,
});

type Pedido = {
  id: string;
  numero: string;
  status: string;
  created_at: string;
  igrejas: { nome: string } | null;
};

const FILTROS = [
  { label: "Tutti", value: "" },
  { label: "In attesa", value: "pendente" },
  { label: "Approvati", value: "aprovado" },
  { label: "Pagati", value: "pago" },
  { label: "In preparazione", value: "em_separacao" },
  { label: "Consegnati", value: "entregue" },
  { label: "Annullati", value: "cancelado" },
];

const STATUS_LABEL: Record<string, string> = {
  pendente: "In attesa",
  aprovado: "Approvato",
  pago: "Pagato",
  em_separacao: "In preparazione",
  entregue: "Consegnato",
  cancelado: "Annullato",
};

// Colunas do kanban (ordem do fluxo).
const COLUNAS = ["pendente", "aprovado", "pago", "em_separacao", "entregue", "cancelado"] as const;

// Próximas transições permitidas para cada status.
const TRANSICOES: Record<string, string[]> = {
  pendente: ["aprovado", "cancelado"],
  aprovado: ["pago", "cancelado"],
  pago: ["em_separacao", "entregue", "cancelado"],
  em_separacao: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

function PedidosPage() {
  const isDesktop = useIsDesktop();
  const [status, setStatus] = useState("");
  const fetcher = useServerFn(adminListarPedidos);
  // No desktop (kanban) buscamos todos os pedidos; no celular respeitamos o filtro.
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pedidos", isDesktop ? "__kanban__" : status],
    queryFn: () => fetcher({ data: { status: isDesktop ? null : status || null } }),
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <h1 className="font-display text-3xl">Ordini</h1>
        {!isDesktop && (
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="flex w-max flex-nowrap gap-1.5 pb-1">
              {FILTROS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={status === f.value ? "default" : "outline"}
                  className="shrink-0"
                  onClick={() => setStatus(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        isDesktop ? (
          <div className="h-60 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )
      ) : isDesktop ? (
        <KanbanBoard pedidos={(data ?? []) as Pedido[]} />
      ) : !data || data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nessun ordine.</p>
      ) : (
        <ListaMobile pedidos={data as Pedido[]} />
      )}
    </div>
  );
}

/* ============================ DESKTOP: KANBAN ============================ */

function KanbanBoard({ pedidos }: { pedidos: Pedido[] }) {
  const qc = useQueryClient();
  const aprovar = useServerFn(adminAprovarPedido);
  const pagar = useServerFn(adminMarcarPago);
  const mudar = useServerFn(adminMudarStatus);
  const cancelar = useServerFn(adminCancelarPedido);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async ({ id, target }: { id: string; target: string }) => {
      if (target === "aprovado") {
        await aprovar({ data: { id } });
        return "Ordine approvato";
      }
      if (target === "pago") {
        const r = await pagar({ data: { id } });
        return `Pagato. Documento ${r.documento_numero} generato.`;
      }
      if (target === "em_separacao" || target === "entregue") {
        await mudar({ data: { id, status: target } });
        return `Spostato a ${STATUS_LABEL[target]}`;
      }
      if (target === "cancelado") {
        await cancelar({ data: { id } });
        return "Ordine annullato";
      }
      throw new Error("Transizione non valida");
    },
    onSuccess: (msg) => {
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
    },
  });

  const porColuna = (col: string) => pedidos.filter((p) => p.status === col);

  const handleDrop = (target: string) => {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido || pedido.status === target) return;
    if (!(TRANSICOES[pedido.status] ?? []).includes(target)) {
      toast.error(`Non è possibile spostare da ${STATUS_LABEL[pedido.status]} a ${STATUS_LABEL[target]}`);
      return;
    }
    mut.mutate({ id, target });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUNAS.map((col) => {
        const itens = porColuna(col);
        const isOver = overCol === col;
        const canDrop = dragId
          ? (() => {
              const p = pedidos.find((x) => x.id === dragId);
              return !!p && (p.status === col || (TRANSICOES[p.status] ?? []).includes(col));
            })()
          : false;
        return (
          <div
            key={col}
            onDragOver={(e) => {
              e.preventDefault();
              if (overCol !== col) setOverCol(col);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setOverCol(null);
            }}
            onDrop={() => handleDrop(col)}
            className={`flex w-72 shrink-0 flex-col rounded-lg border bg-secondary/40 transition ${
              isOver && canDrop
                ? "border-foreground ring-2 ring-foreground/20"
                : isOver
                  ? "border-destructive/50"
                  : "border-border"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {STATUS_LABEL[col]}
              </span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                {itens.length}
              </span>
            </div>
            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {itens.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">—</p>
              ) : (
                itens.map((p) => (
                  <KanbanCard
                    key={p.id}
                    pedido={p}
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  pedido,
  onDragStart,
  onDragEnd,
}: {
  pedido: Pedido;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", pedido.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-md border border-border bg-card p-3 shadow-sm transition hover:border-foreground/40 active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{pedido.numero}</span>
        <div className="flex items-center gap-0.5">
          <SharePedidoButton
            numero={pedido.numero}
            igrejaNome={pedido.igrejas?.nome}
            variant="ghost"
            size="icon"
            showLabel={false}
            className="h-6 w-6"
          />
          <Link to="/admin/pedidos/$id" params={{ id: pedido.id }} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
              Apri
            </Button>
          </Link>
        </div>
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{pedido.igrejas?.nome ?? "—"}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {new Date(pedido.created_at).toLocaleString("it-IT")}
      </div>
    </div>
  );
}

/* ============================ MOBILE: LISTA ============================ */

function ListaMobile({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <ul className="space-y-3">
      {pedidos.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-foreground">{p.numero}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {p.igrejas?.nome ?? "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString("it-IT")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SharePedidoButton
                numero={p.numero}
                igrejaNome={p.igrejas?.nome}
                variant="ghost"
                size="icon"
                showLabel={false}
                className="h-9 w-9"
              />
              <Link to="/admin/pedidos/$id" params={{ id: p.id }}>
                <Button size="sm" variant="outline">
                  Apri
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <StatusSelect id={p.id} numero={p.numero} status={p.status} fullWidth />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusSelect({
  id,
  numero,
  status,
  fullWidth = false,
}: {
  id: string;
  numero: string;
  status: string;
  fullWidth?: boolean;
}) {
  const qc = useQueryClient();
  const aprovar = useServerFn(adminAprovarPedido);
  const pagar = useServerFn(adminMarcarPago);
  const mudar = useServerFn(adminMudarStatus);
  const cancelar = useServerFn(adminCancelarPedido);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-pedidos"] });
    qc.invalidateQueries({ queryKey: ["admin-pedido", id] });
  };

  const mut = useMutation({
    mutationFn: async (novo: string) => {
      if (novo === "aprovado") {
        await aprovar({ data: { id } });
        return { msg: `${numero}: approvato` };
      }
      if (novo === "pago") {
        const r = await pagar({ data: { id } });
        return { msg: `Pagato. Documento ${r.documento_numero} generato.` };
      }
      if (novo === "em_separacao" || novo === "entregue") {
        await mudar({ data: { id, status: novo } });
        return { msg: `${numero}: ${STATUS_LABEL[novo]}` };
      }
      if (novo === "cancelado") {
        await cancelar({ data: { id } });
        return { msg: `${numero}: annullato` };
      }
      throw new Error("Transizione non valida");
    },
    onSuccess: (r) => { toast.success(r.msg); refresh(); },
    onError: (e: Error) => { toast.error(e.message); refresh(); },
  });

  const proximos = TRANSICOES[status] ?? [];
  const disabled = proximos.length === 0 || mut.isPending;

  return (
    <Select
      value={status}
      disabled={disabled}
      onValueChange={(v) => { if (v !== status) mut.mutate(v); }}
    >
      <SelectTrigger
        className={`h-9 text-xs ${fullWidth ? "w-full" : "w-[150px]"}`}
        aria-label="Cambia stato"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} disabled>
          {STATUS_LABEL[status] ?? status}
        </SelectItem>
        {proximos.map((s) => (
          <SelectItem key={s} value={s}>
            → {STATUS_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
