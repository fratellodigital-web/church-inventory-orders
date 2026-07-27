import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openPedidoWhatsApp } from "@/lib/share-pedido";
import { cn } from "@/lib/utils";

type SharePedidoButtonProps = {
  numero: string;
  igrejaNome?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  showLabel?: boolean;
};

export function SharePedidoButton({
  numero,
  igrejaNome,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true,
}: SharePedidoButtonProps) {
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openPedidoWhatsApp(numero, igrejaNome);
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(showLabel ? "" : "px-2", className)}
      onClick={handleShare}
      title="Invia tramite WhatsApp"
    >
      <MessageCircle className={cn("h-4 w-4", showLabel && "mr-1.5")} />
      {showLabel && "WhatsApp"}
    </Button>
  );
}
