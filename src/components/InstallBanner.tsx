import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Aparece sempre que a página é carregada/acessada. O "X" só esconde
  // durante a visita atual (estado em memória); ao acessar de novo, reaparece.
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };

    // Se já está instalado/rodando como app, não mostra.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) return;

    const ua = nav.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Mostra o banner em todo acesso (não depende do prompt nativo).
    setVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setVisible(false);
      return;
    }
    // Sem prompt nativo (ex.: já visto, dev, ou navegador sem suporte direto):
    // mostra instruções manuais.
    setShowHint(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <img src="/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">Installa Fondo Biblico</div>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tocca <Share className="inline h-3 w-3" /> Condividi e poi{" "}
              <span className="font-medium">“Aggiungi a Home”</span>.
            </p>
          ) : showHint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nel menu del browser, scegli{" "}
              <span className="font-medium">“Installa app”</span> oppure{" "}
              <span className="font-medium">“Aggiungi alla schermata Home”</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Accedi più velocemente installando l&apos;app sul dispositivo.
            </p>
          )}
        </div>
        {!isIOS && (
          <Button size="sm" onClick={install}>
            <Download className="mr-1 h-3.5 w-3.5" /> Installa
          </Button>
        )}
        <button
          onClick={dismiss}
          aria-label="Chiudi"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
