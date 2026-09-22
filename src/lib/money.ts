/** Arredonda valor monetário para 2 casas. */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function totalPedidoFromItens(
  itens: { quantidade: number; snapshot_preco: number | null }[],
): number {
  return roundMoney(
    itens.reduce((s, it) => s + Number(it.snapshot_preco ?? 0) * it.quantidade, 0),
  );
}

export function rimanentePedido(opts: {
  total: number;
  valor_pago_saldo: number;
  valor_pago_bonifico: number;
}): number {
  return roundMoney(
    opts.total - Number(opts.valor_pago_saldo ?? 0) - Number(opts.valor_pago_bonifico ?? 0),
  );
}
