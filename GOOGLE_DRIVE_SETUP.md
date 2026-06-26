# Configuração do Google Drive

O sistema armazena arquivos (comprovantes, PDFs de saída e fotos de produtos) no **Google Drive** via **Service Account** no servidor.

## Limitação importante (leia antes)

**Service accounts não têm espaço de armazenamento próprio no Google Drive.**

Isso significa:

- Não é possível gravar arquivos na “pasta da service account”.
- Os arquivos precisam ir para **uma pasta sua** (compartilhada com a service account) **ou** para um **Shared Drive** (Google Workspace).

Documentação Google: [Shared drives](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)

## Opção A — Gmail / conta pessoal (mais comum)

1. Crie uma pasta no **seu** Drive (ex.: `Fundo Bíblico - Arquivos`).
2. **Compartilhar** → adicione o e-mail da service account (`client_email` no JSON) como **Editor**.
3. Os arquivos usam **a sua cota** do Drive (15 GB no Gmail gratuito).
4. Copie o ID da pasta da URL e coloque em `GOOGLE_DRIVE_FOLDER_ID`.

## Opção B — Google Workspace (Shared Drive)

Se tiver Google Workspace:

1. Crie um **Drive compartilhado** (Shared Drive) ou use um existente.
2. Adicione `fondo-biblico-drive@....iam.gserviceaccount.com` como membro com **Gerenciador de conteúdo** ou **Editor**.
3. Crie a pasta `Fundo Bíblico - Arquivos` **dentro** desse Shared Drive.
4. Use o ID dessa pasta em `GOOGLE_DRIVE_FOLDER_ID`.

## Passo a passo técnico

### 1. Projeto no Google Cloud

1. [Google Cloud Console](https://console.cloud.google.com) → crie/use um projeto.
2. Ative a **Google Drive API**.

### 2. Service Account

1. **Credenciais → Criar credenciais → Conta de serviço**.
2. Baixe a chave JSON → salve em `secrets/google-service-account.json`.

### 3. Compartilhar a pasta

1. Abra a pasta no Drive.
2. **Compartilhar** → cole o e-mail da service account.
3. Permissão: **Editor**.
4. Confirme (ignore aviso de “conta externa”).
5. Teste: `node scripts/test-google-drive-folder.mjs` → deve mostrar `OK — upload funcionaria`.

### 4. Variáveis no `.env`

Copie `.env.example` para `.env` (nunca commite o `.env`).

```env
GOOGLE_DRIVE_FOLDER_ID="id_da_pasta_compartilhada"
# Recomendado para deploy — JSON minificado em uma linha:
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Para gerar o valor a partir do arquivo local:

```bash
node -e "console.log(JSON.stringify(require('./secrets/google-service-account.json')))"
```

Alternativa só para dev local:

```env
GOOGLE_APPLICATION_CREDENTIALS="secrets/google-service-account.json"
```

### 5. Reiniciar

```bash
pnpm dev
```

## Estrutura criada automaticamente

```
Sua pasta compartilhada/
├── comprovantes/{pedido_id}/
├── documentos/
└── produtos/
```

## Solução de problemas

| Erro | Solução |
|------|---------|
| `Service Accounts do not have storage quota` | Normal se tentar gravar na SA. Compartilhe **sua** pasta como Editor (Opção A) ou use Shared Drive (Opção B). |
| `File not found` | Pasta não compartilhada com a service account, ou ID errado. |
| `ENOTFOUND oauth2.googleapis.com` | Problema de internet/DNS. Reinicie o servidor. |
| Teste falha no `create` | Compartilhe a pasta com `fondo-biblico-drive@projetoscci.iam.gserviceaccount.com` como **Editor**. |
