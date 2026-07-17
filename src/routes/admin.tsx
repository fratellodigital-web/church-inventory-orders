import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminCheck, adminLogin, adminLogout } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, ClipboardList, Package, Church, Boxes } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Fondo Biblico" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const check = useServerFn(adminCheck);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-check"],
    queryFn: () => check(),
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Caricamento...</div>;
  if (!data?.isAdmin) return <LoginScreen onLogin={() => refetch()} />;
  return <AuthedShell />;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pwd, setPwd] = useState("");
  const login = useServerFn(adminLogin);
  const mut = useMutation({
    mutationFn: () => login({ data: { password: pwd } }),
    onSuccess: () => {
      toast.success("Benvenuto/a");
      onLogin();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
      >
        <Link to="/" className="font-display text-2xl">Fondo Biblico</Link>
        <h1 className="mt-4 text-lg font-medium">Pannello amministrativo</h1>
        <p className="mt-1 text-xs text-muted-foreground">Inserisci la password per continuare.</p>
        <div className="mt-6 space-y-2">
          <Label htmlFor="pwd">Password</Label>
          <Input
            id="pwd"
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoFocus
            required
          />
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={mut.isPending}>
          {mut.isPending ? "Accesso in corso..." : "Accedi"}
        </Button>
      </form>
    </div>
  );
}

function AuthedShell() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useServerFn(adminLogout);
  const mut = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      qc.clear();
      router.navigate({ to: "/" });
    },
  });
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-display text-xl">Fondo Biblico</span>
            <span className="rounded bg-foreground px-1.5 py-0.5 text-xs font-medium uppercase tracking-wider text-background">
              Admin
            </span>
          </Link>
          <Button size="sm" variant="outline" onClick={() => mut.mutate()}>
            <LogOut className="mr-2 h-3.5 w-3.5" /> Esci
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm sm:px-6">
          <NavTab to="/admin/pedidos" icon={<ClipboardList className="h-3.5 w-3.5" />} label="Ordini" />
          <NavTab to="/admin/produtos" icon={<Package className="h-3.5 w-3.5" />} label="Prodotti" />
          <NavTab to="/admin/estoque" icon={<Boxes className="h-3.5 w-3.5" />} label="Magazzino" />
          <NavTab to="/admin/igrejas" icon={<Church className="h-3.5 w-3.5" />} label="Chiese" />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-foreground text-background" }}
      inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
      className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition"
    >
      {icon}
      {label}
    </Link>
  );
}
