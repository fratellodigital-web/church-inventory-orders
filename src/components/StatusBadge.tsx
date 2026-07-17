const labels: Record<string, { text: string; cls: string }> = {
  pendente: { text: "In attesa", cls: "bg-secondary text-secondary-foreground" },
  pago: { text: "Pagato", cls: "bg-foreground text-background" },
  em_separacao: { text: "In preparazione", cls: "bg-accent text-accent-foreground" },
  entregue: { text: "Consegnato", cls: "bg-foreground text-background" },
  cancelado: { text: "Annullato", cls: "bg-destructive text-destructive-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = labels[status] ?? { text: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.text}</span>
  );
}
