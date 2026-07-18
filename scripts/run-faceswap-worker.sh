#!/usr/bin/env bash
# On Model faceswap 워커 실행기 (이 Mac = v1 워커박스).
#   설계: docs/onmodel_faceswap_설계_2026-07-18.md · 운영: docs/faceswap_worker_운영.md
#
# env 소스 2개(시크릿을 이 저장소에 복사하지 않기 위해 분리):
#   1) DB + config       = ${WORKER_BASE_ENV:-$HOME/HeyHoAI-launch/.env}   (기존 prod 접속 .env 재사용)
#   2) R2(오브젝트 스토리지) = ${WORKER_R2_ENV:-$HOME/.doppia-r2.env}         (사용자가 채우는 R2 creds)
#
# 실행: bash scripts/run-faceswap-worker.sh
#   또는 상시 기동: pm2 start scripts/run-faceswap-worker.sh --name faceswap-worker --interpreter bash
set -euo pipefail

BASE_ENV="${WORKER_BASE_ENV:-$HOME/HeyHoAI-launch/.env}"
R2_ENV="${WORKER_R2_ENV:-$HOME/.doppia-r2.env}"
WORKTREE="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$BASE_ENV" ]; then
  echo "❌ DB/config env 없음: $BASE_ENV (WORKER_BASE_ENV로 경로 지정 가능)"; exit 1
fi
if [ ! -f "$R2_ENV" ]; then
  echo "❌ R2 creds 없음: $R2_ENV"
  echo "   → $HOME/.doppia-r2.env 를 만들고 아래 값을 채우세요 (prod .env 또는 Cloudflare R2에서):"
  echo "     MEDIA_S3_BUCKET=doppia-media"
  echo "     MEDIA_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com"
  echo "     MEDIA_S3_PUBLIC_BASE=<있으면 공개 CDN base, 없으면 이 줄 생략>"
  echo "     AWS_ACCESS_KEY_ID=<R2 토큰 id>"
  echo "     AWS_SECRET_ACCESS_KEY=<R2 토큰 secret>"
  exit 1
fi

# env 주입 (값은 화면에 안 찍힘). config의 dotenv는 이미 있는 process.env를 덮지 않음.
set -a
# shellcheck disable=SC1090
. "$BASE_ENV"
. "$R2_ENV"
set +a

if [ -z "${MEDIA_S3_BUCKET:-}" ]; then
  echo "❌ MEDIA_S3_BUCKET 미설정 — R2 creds 파일($R2_ENV)을 확인하세요."; exit 1
fi

echo "▶ faceswap 워커 시작 (버킷=$MEDIA_S3_BUCKET, worktree=$WORKTREE)"
cd "$WORKTREE"
exec node src/workers/faceswapWorker.js
