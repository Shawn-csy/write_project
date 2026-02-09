#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 找不到 $ENV_FILE，請先建立正式環境變數檔"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 找不到 docker，請先安裝 Docker"
  exit 1
fi

echo "🧹 Stopping existing containers"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo "🔨 Building and starting containers"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "✅ Deploy complete"
