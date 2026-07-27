---
name: Traduzir app italiano
overview: Substituir todos os textos visíveis ao usuário (UI, toasts, erros de servidor, PDF, WhatsApp, PWA) e a marca “Fundo Bíblico” → “Fondo Biblico” do português para o italiano, sem framework de i18n. Manter CCI, rotas e enums do banco.
todos:
  - id: shared-it
    content: Traduzir componentes compartilhados (StatusBadge, header, PWA, share, marca) + lang/it-IT
    status: pending
  - id: public-it
    content: Traduzir rotas públicas (index, catalogo, meus-pedidos, pedido)
    status: pending
  - id: admin-it
    content: Traduzir rotas admin (shell, pedidos, produtos, estoque, igrejas)
    status: pending
  - id: server-pdf-it
    content: Traduzir erros de servidor, labels do PDF e marca no PDF
    status: pending
isProject: false
---

# Traduzir o sistema para italiano

## Abordagem

Não há i18n hoje. A tradução será **substituição direta** PT → IT em strings de interface e mensagens ao usuário.

**Mantido sem traduzir:**
- Sigla **CCI**
- Rotas (`/admin/pedidos`, `/meus-pedidos`, …)
- Nomes de variáveis, arquivos e enums do banco (`pendente`, `pago`, `em_separacao`, …)
- Docs de setup (`GOOGLE_DRIVE_SETUP.md`) e erros técnicos internos do Drive (só se o admin não os vê no UI)

**Alterado (inclui a marca):**
- **Fundo Bíblico** → **Fondo Biblico** em toda a UI, titles, PWA e PDF
- `lang="pt-BR"` → `lang="it"` em [`src/routes/__root.tsx`](src/routes/__root.tsx)
- Datas: `toLocaleString("pt-BR")` → `"it-IT"` em todas as rotas/PDF
- Labels de status em [`StatusBadge`](src/components/StatusBadge.tsx) e filtros/colunas do Kanban

### Marca

| PT | IT |
|----|-----|
| Fundo Bíblico | Fondo Biblico |
| Fundo Bíblico - CCI | Fondo Biblico - CCI |

Ocorrências a trocar (app):
- [`src/components/AppHeader.tsx`](src/components/AppHeader.tsx)
- [`src/components/InstallBanner.tsx`](src/components/InstallBanner.tsx)
- [`src/routes/__root.tsx`](src/routes/__root.tsx) — title, description, apple-mobile-web-app-title
- [`src/routes/index.tsx`](src/routes/index.tsx), [`catalogo.tsx`](src/routes/catalogo.tsx), [`meus-pedidos.tsx`](src/routes/meus-pedidos.tsx), [`pedido.$numero.tsx`](src/routes/pedido.$numero.tsx)
- [`src/routes/admin.tsx`](src/routes/admin.tsx)
- [`src/lib/pdf.server.ts`](src/lib/pdf.server.ts) — cabeçalho do PDF
- [`public/manifest.webmanifest`](public/manifest.webmanifest) — `name`, `short_name`, `description`

Glossário base (UI):

| PT | IT |
|----|-----|
| Pedido / Pedidos | Ordine / Ordini |
| Igreja / Igrejas | Chiesa / Chiese |
| Produto / Produtos | Prodotto / Prodotti |
| Estoque | Magazzino |
| Pendente | In attesa |
| Pago | Pagato |
| Em separação | In preparazione |
| Entregue | Consegnato |
| Cancelado | Annullato |
| Solicitante | Richiedente |
| Observação | Nota |
| Comprovante | Ricevuta |
| Documento de saída | Documento di uscita |
| Carrinho / Catálogo | Carrello / Catalogo |
| Senha | Password |
| Salvar / Editar / Abrir | Salva / Modifica / Apri |
| Quantidade / Subtotal / Total | Quantità / Subtotale / Totale |

## Arquivos a atualizar

### Público
- [`src/routes/index.tsx`](src/routes/index.tsx) — home / seleção de chiesa
- [`src/routes/catalogo.tsx`](src/routes/catalogo.tsx) — catalogo e carrello
- [`src/routes/meus-pedidos.tsx`](src/routes/meus-pedidos.tsx)
- [`src/routes/pedido.$numero.tsx`](src/routes/pedido.$numero.tsx)
- [`src/components/AppHeader.tsx`](src/components/AppHeader.tsx)
- [`src/components/InstallBanner.tsx`](src/components/InstallBanner.tsx)
- [`src/components/SharePedidoButton.tsx`](src/components/SharePedidoButton.tsx) + [`src/lib/share-pedido.ts`](src/lib/share-pedido.ts)
- [`src/components/StatusBadge.tsx`](src/components/StatusBadge.tsx)
- [`public/manifest.webmanifest`](public/manifest.webmanifest)

### Admin
- [`src/routes/admin.tsx`](src/routes/admin.tsx) — login e nav
- [`src/routes/admin.index.tsx`](src/routes/admin.index.tsx)
- [`src/routes/admin.pedidos.index.tsx`](src/routes/admin.pedidos.index.tsx)
- [`src/routes/admin.pedidos.$id.tsx`](src/routes/admin.pedidos.$id.tsx)
- [`src/routes/admin.produtos.tsx`](src/routes/admin.produtos.tsx)
- [`src/routes/admin.estoque.tsx`](src/routes/admin.estoque.tsx)
- [`src/routes/admin.igrejas.tsx`](src/routes/admin.igrejas.tsx)

### Servidor / PDF
- [`src/lib/orders.functions.ts`](src/lib/orders.functions.ts)
- [`src/lib/admin.functions.ts`](src/lib/admin.functions.ts)
- [`src/lib/pdf.server.ts`](src/lib/pdf.server.ts)

### Globais
- [`src/routes/__root.tsx`](src/routes/__root.tsx) — 404, erro, `lang`, meta

## Fora de escopo

- Traduzir comentários de código
- Renomear rotas ou tabelas do Supabase
- Framework i18n (pt/it lado a lado)
- Dados já cadastrados (nomes de igrejas/produtos no banco)
- Renomear pasta no Google Drive (manual, se existir “Fundo Bíblico - Arquivos”)

## Verificação

Percorrer home → catalogo → checkout → ordini; admin → ordini/detalhe/prodotti/magazzino/chiese; confirmar marca **Fondo Biblico** no header, titles, PWA, PDF e WhatsApp.
