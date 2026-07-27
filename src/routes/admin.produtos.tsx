import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminListarProdutos,
  adminListarCategorias,
  adminSalvarProduto,
  adminCriarCategoria,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, ImageIcon } from "lucide-react";
import { toast } from "sonner";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Impossibile leggere l'immagine"));
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/admin/produtos")({ component: ProdutosPage });

type Produto = {
  id: string;
  codigo: string | null;
  nome: string;
  descricao: string | null;
  unidade: string;
  preco: number;
  foto_url: string | null;
  categoria_id: string | null;
  estoque_fisico: number;
  estoque_disponivel: number;
  estoque_minimo: number;
  ativo: boolean;
  categorias: { nome: string } | null;
};

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
function formatPreco(value: number | null | undefined) {
  return currency.format(Number(value ?? 0));
}

function ProdutosPage() {
  const list = useServerFn(adminListarProdutos);
  const cats = useServerFn(adminListarCategorias);
  const { data: produtos, isLoading } = useQuery({ queryKey: ["admin-produtos"], queryFn: () => list() });
  const { data: categorias } = useQuery({ queryKey: ["admin-categorias"], queryFn: () => cats() });
  const [edit, setEdit] = useState<Produto | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl">Prodotti</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEdit(null)}><Plus className="mr-1 h-4 w-4" /> Nuovo</Button>
          </DialogTrigger>
          <ProdutoDialog produto={edit} categorias={categorias ?? []} onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="h-60 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Codice</th>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Prezzo</th>
                <th className="px-4 py-2 text-right">Fisico</th>
                <th className="px-4 py-2 text-right">disp.</th>
                <th className="px-4 py-2 text-right">Min.</th>
                <th className="px-4 py-2">Stato</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(produtos ?? []).map((p) => {
                const low = p.estoque_fisico <= p.estoque_minimo;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{p.codigo ?? "—"}</td>
                    <td className="px-4 py-2 font-medium">{p.nome}</td>
                    <td className="px-4 py-2 text-muted-foreground">{(p.categorias as { nome: string } | null)?.nome ?? "—"}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{formatPreco(p.preco)}</td>
                    <td className={`px-4 py-2 text-right ${low ? "text-destructive font-medium" : ""}`}>{p.estoque_fisico} {p.unidade}</td>
                    <td className="px-4 py-2 text-right">{p.estoque_disponivel}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{p.estoque_minimo}</td>
                    <td className="px-4 py-2 text-xs">{p.ativo ? "Attivo" : "Inattivo"}</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEdit(p as Produto); setOpen(true); }}>Modifica</Button>
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

function ProdutoDialog({
  produto,
  categorias,
  onClose,
}: {
  produto: Produto | null;
  categorias: { id: string; nome: string }[];
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    codigo: produto?.codigo ?? "",
    descricao: produto?.descricao ?? "",
    unidade: produto?.unidade ?? "un",
    preco: produto?.preco ?? 0,
    categoria_id: produto?.categoria_id ?? "",
    estoque_minimo: produto?.estoque_minimo ?? 0,
    ativo: produto?.ativo ?? true,
  });
  const [fotoPreview, setFotoPreview] = useState<string | null>(produto?.foto_url ?? null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [novaCat, setNovaCat] = useState("");
  const qc = useQueryClient();
  const salvar = useServerFn(adminSalvarProduto);
  const criarCat = useServerFn(adminCriarCategoria);

  const mut = useMutation({
    mutationFn: async () => {
      let imagem: { base64: string; contentType: string; nome: string } | null = null;
      if (fotoFile) {
        const base64 = await fileToBase64(fotoFile);
        imagem = { base64, contentType: fotoFile.type, nome: fotoFile.name };
      }
      return salvar({
        data: {
          id: produto?.id,
          nome: form.nome,
          codigo: form.codigo || null,
          descricao: form.descricao || null,
          categoria_id: form.categoria_id || null,
          unidade: form.unidade,
          preco: Number(form.preco) || 0,
          estoque_minimo: Number(form.estoque_minimo) || 0,
          ativo: form.ativo,
          imagem,
        },
      });
    },
    onSuccess: () => {
      toast.success("Prodotto salvato");
      qc.invalidateQueries({ queryKey: ["admin-produtos"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mCat = useMutation({
    mutationFn: () => criarCat({ data: { nome: novaCat } }),
    onSuccess: (c) => {
      toast.success("Categoria creata");
      setForm((f) => ({ ...f, categoria_id: c.id }));
      setNovaCat("");
      qc.invalidateQueries({ queryKey: ["admin-categorias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{produto ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Codice</Label>
            <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex.: B-3ITA" />
          </div>
          <div className="col-span-2">
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
        </div>
        <div>
          <Label>Descrizione</Label>
          <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
        </div>
        <div>
          <Label>Foto del prodotto</Label>
          <div className="mt-2 flex items-start gap-3">
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-md border border-dashed border-border bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error("Immagine più grande di 5 MB");
                    return;
                  }
                  setFotoFile(file);
                  setFotoPreview(URL.createObjectURL(file));
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WebP. Max. 5 MB. Salvato su Google Drive.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Unità</Label>
            <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} />
          </div>
          <div>
            <Label>Prezzo (€)</Label>
            <Input type="number" step="0.01" min="0" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Magazzino minimo</Label>
            <Input type="number" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
            <SelectContent>
              {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="mt-2 flex gap-2">
            <Input placeholder="Nuova categoria" value={novaCat} onChange={(e) => setNovaCat(e.target.value)} />
            <Button type="button" variant="outline" disabled={!novaCat || mCat.isPending} onClick={() => mCat.mutate()}>Aggiungi</Button>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label>Attivo</Label>
            <p className="text-xs text-muted-foreground">Se inattivo, non compare nel catalogo.</p>
          </div>
          <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Salvataggio..." : "Salva"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
