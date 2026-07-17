export function pedidoShareUrl(numero: string): string {
  const path = `/pedido/${encodeURIComponent(numero)}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function pedidoShareMessage(numero: string, igrejaNome?: string): string {
  const url = pedidoShareUrl(numero);
  const header = igrejaNome ? `Ordine ${numero} — ${igrejaNome}` : `Ordine ${numero}`;
  return `${header}\n\nSegui lo stato dell'ordine:\n${url}`;
}

export function openPedidoWhatsApp(numero: string, igrejaNome?: string): void {
  const text = pedidoShareMessage(numero, igrejaNome);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
