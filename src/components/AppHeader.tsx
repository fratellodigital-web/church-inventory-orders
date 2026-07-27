import { Link, useRouter } from "@tanstack/react-router";
import { useIgrejaSelecionada } from "@/lib/cart-store";

export function AppHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { igreja, select } = useIgrejaSelecionada();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl leading-none text-foreground sm:text-2xl">Fondo Biblico</span>
          <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">— CCI</span>
        </Link>

        <div className="flex items-center gap-3">
          {igreja && (
            <button
              onClick={() => {
                select(null);
                router.navigate({ to: "/" });
              }}
              className="hidden text-right text-xs leading-tight text-muted-foreground transition hover:text-foreground sm:block"
              title="Cambia chiesa"
            >
              <div className="font-medium text-foreground">{igreja.nome}</div>
              <div>cambia chiesa</div>
            </button>
          )}
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
