#!/usr/bin/env bash
# Abre OrbStack, espera o Docker, sobe o Supabase local e inicia o Vite.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[dev] Abrindo OrbStack..."
if ! open -a OrbStack 2>/dev/null; then
  echo "[dev] OrbStack não encontrado."
  echo "      Instale em https://orbstack.dev/ (requer macOS Sonoma 14+) ou via:"
  echo "      brew install --cask orbstack"
  echo "      Depois abra o app e rode de novo: pnpm dev"
  exit 1
fi

echo "[dev] Aguardando Docker ficar pronto..."
ready=0
for i in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "[dev] Timeout: Docker não respondeu em 60s."
  echo "      Confirme que o OrbStack está Running e tente de novo."
  exit 1
fi

echo "[dev] Subindo Supabase local..."
supabase start

echo "[dev] Iniciando Vite..."
exec pnpm exec vite dev
