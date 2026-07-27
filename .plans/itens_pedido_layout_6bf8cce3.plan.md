---
name: Itens pedido layout
overview: "Afrouxar o layout dos itens em `/admin/pedidos/$id`: no modo edição, cada produto vira um card empilhado (nome → quantidade → total); no modo leitura, mais espaço e quantidade alinhada sem apertar o nome."
todos:
  - id: edit-item-cards
    content: "EditarPedidoForm: cards empilhados com stepper maior e subtotal"
    status: pending
  - id: readonly-items
    content: Lista somente leitura com mais padding e hierarquia
    status: pending
  - id: article-padding
    content: Padding do article responsivo (p-4 sm:p-6)
    status: pending
isProject: false
---

# Ajustar layout dos itens do pedido

## Problema

Em [`src/routes/admin.pedidos.$id.tsx`](src/routes/admin.pedidos.$id.tsx), as linhas de `EditarPedidoForm` usam `flex flex-wrap` com nome + stepper (− / input / +) + subtotal + lixeira na mesma faixa (`h-7`, `w-14`). No celular isso quebra de forma irregular e fica apertado.

A lista somente leitura (`py-2`, nome e quantidade numa linha) também fica estreita com nomes longos.

## Disposição escolhida

**Cards empilhados** (melhor para toque no celular; no desktop continua limpo):

```
┌─────────────────────────────┐
│ Nome do produto          🗑 │
│ €12,00 · máx. 10 un         │
│                             │
│ Quantidade                  │
│ [ − ]  [  2  ]  [ + ]       │
│                             │
│ Subtotal            €24,00  │
└─────────────────────────────┘
```

No desktop (`sm:`), manter o stepper e o subtotal na mesma linha inferior (nome em cima, controles embaixo) — evita voltar ao layout “tudo numa linha”.

## Mudanças (só UI neste arquivo)

### 1. `EditarPedidoForm` — cada item

Trocar o `<li className="flex flex-wrap ...">` por:

- Bloco superior: nome (`font-medium`) + botão excluir à direita; abaixo, preço e estoque máx.
- Bloco inferior: label “Qtd” + stepper com botões maiores (`h-9 w-9`) e input (`h-9 w-16`)
- Subtotal em linha própria (`flex justify-between`) ou à direita do stepper em `sm:flex-row`
- Mais padding (`p-4`) e `space-y-3` entre seções do card; lista com `space-y-3` em vez de `divide-y` apertado

### 2. Lista somente leitura (pedido não pendente)

- Mais padding vertical (`py-3`)
- Nome com `min-w-0` / `pr-3`; quantidade em `shrink-0` com texto um pouco mais destacado (`font-medium`)
- Em telas estreitas, empilhar: nome em cima, “N un” embaixo à direita (ou manter lado a lado se o nome truncar com `truncate`)

### 3. Contêiner do artigo

- `p-6` → `p-4 sm:p-6` para dar mais margem útil no celular

## Fora de escopo

- Lógica de `adminEditarPedido` / estoque
- Página pública `/pedido/$numero` (só se quiser o mesmo tratamento depois)
- Lista mobile de `/admin/pedidos` (já feita)

## Verificação

Abrir um pedido **pendente** no celular: cada item legível, stepper fácil de tocar, sem wrap caótico. Abrir um pedido **pago**: lista de itens com respiro.