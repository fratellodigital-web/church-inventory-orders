export const STATUS_COM_PRECO = ["aprovado", "pago", "em_separacao", "entregue"] as const;

export function pedidoMostraPreco(status: string) {
  return STATUS_COM_PRECO.includes(status as (typeof STATUS_COM_PRECO)[number]);
}
