const labels: Record<string, { text: string; cls: string }> = {
  pendente: { text: "Pendente", cls: "bg-secondary text-secondary-foreground" },
  pago: { text: "Pago", cls: "bg-foreground text-background" },
  em_separacao: { text: "Em separação", cls: "bg-accent text-accent-foreground" },
  entregue: { text: "Entregue", cls: "bg-foreground text-background" },
  cancelado: { text: "Cancelado", cls: "bg-destructive text-destructive-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = labels[status] ?? { text: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.text}</span>
  );
}
