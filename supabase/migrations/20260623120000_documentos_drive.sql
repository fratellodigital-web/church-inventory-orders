-- URLs e IDs dos arquivos no Google Drive (PDFs de saída).
ALTER TABLE public.documentos_saida ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.documentos_saida ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
