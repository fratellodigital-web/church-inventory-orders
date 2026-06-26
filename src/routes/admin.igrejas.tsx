import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListarIgrejas, adminSalvarIgreja } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/igrejas")({ component: IgrejasPage });

type Igreja = {
  id: string;
  nome: string;
  cidade: string | null;
  regiao: string | null;
  responsavel: string | null;
  telefone: string | null;
  ativo: boolean;
};

function formatLocalidade(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|\s|')\p{L}/gu, (m) => m.toUpperCase());
}

function IgrejasPage() {
  const list = useServerFn(adminListarIgrejas);
  const { data, isLoading } = useQuery({ queryKey: ["admin-igrejas"], queryFn: () => list() });
  const [edit, setEdit] = useState<Igreja | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl">Igrejas</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit(null)}><Plus className="mr-1 h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <IgrejaDialog igreja={edit} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Localidade</th>
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Responsável</th>
                <th className="px-4 py-2">Telefone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((ig) => {
                const igreja = ig as Igreja;
                return (
                  <tr key={igreja.id}>
                    <td className="px-4 py-2 font-medium">{igreja.nome}</td>
                    <td className="px-4 py-2 text-muted-foreground">{igreja.regiao ? formatLocalidade(igreja.regiao) : "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{igreja.cidade ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{igreja.responsavel ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{igreja.telefone ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{igreja.ativo ? "Ativa" : "Inativa"}</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEdit(igreja); setOpen(true); }}>Editar</Button>
                    </td>
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

function IgrejaDialog({ igreja, onClose }: { igreja: Igreja | null; onClose: () => void }) {
  const [form, setForm] = useState({
    nome: igreja?.nome ?? "",
    cidade: igreja?.cidade ?? "",
    regiao: igreja?.regiao ?? "",
    responsavel: igreja?.responsavel ?? "",
    telefone: igreja?.telefone ?? "",
    ativo: igreja?.ativo ?? true,
  });
  const qc = useQueryClient();
  const salvar = useServerFn(adminSalvarIgreja);
  const mut = useMutation({
    mutationFn: () => salvar({
      data: {
        id: igreja?.id,
        nome: form.nome,
        cidade: form.cidade || null,
        regiao: form.regiao || null,
        responsavel: form.responsavel || null,
        telefone: form.telefone || null,
        ativo: form.ativo,
      },
    }),
    onSuccess: () => { toast.success("Igreja salva"); qc.invalidateQueries({ queryKey: ["admin-igrejas"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{igreja ? "Editar igreja" : "Nova igreja"}</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
        <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
        <div><Label>Localidade</Label><Input value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} placeholder="Ex.: Belvedere, Codogno..." /></div>
        <div><Label>Código</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <Label>Ativa</Label>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
