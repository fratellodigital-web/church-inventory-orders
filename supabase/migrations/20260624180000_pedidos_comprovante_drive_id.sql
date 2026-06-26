-- ID do arquivo no Google Drive (para preview via proxy da API).
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS comprovante_drive_file_id TEXT;
