#!/usr/bin/env bash
#
# Doppia 배포 스크립트 — 환경별(prod/staging), npm ci로 고정.
#   사용:  bash deploy/deploy.sh [prod|staging|dev]   (기본 prod)
#          npm run deploy           # = prod   (~/HeyHoAI,        main)
#          npm run deploy:staging   # = staging (~/HeyHoAI-staging, staging)
#          npm run deploy:dev       # = dev     (~/HeyHoAI-dev,     develop)
#
#   npm ci를 쓰는 이유: package-lock.json을 "읽기만" 함 → 서버에서 lock이 dirty해져
#     git pull이 막히던 문제 재발 방지 + 매 배포 결정적(node_modules 재현).
#   prod/staging은 같은 EC2에서 PM2 앱(heyhoai / heyhoai-staging) + 별도 DB로 분리 동작.
set -euo pipefail

ENVN="${1:-prod}"
cd "$(dirname "$0")/.."   # 레포 루트

case "$ENVN" in
  prod)     APP="heyhoai";          NODE_ENV="production"  ;;
  staging)  APP="heyhoai-staging";  NODE_ENV="staging"     ;;
  dev)      APP="heyhoai-dev";      NODE_ENV="development" ;;
  *) echo "❌ 알 수 없는 환경: $ENVN (prod|staging|dev)"; exit 1 ;;
esac
echo "▶ 배포 대상: $ENVN  (PM2=$APP, NODE_ENV=$NODE_ENV)"

echo "▶ 1/4  최신 코드 가져오기 (git pull)"
# package-lock.json은 자동생성물 — 잔여 로컬 변경이 있으면 버리고 커밋본 사용(pull 충돌 방지)
git checkout -- package-lock.json 2>/dev/null || true
git pull --ff-only

echo "▶ 2/4  의존성 설치 (npm ci)"
npm ci

echo "▶ 3/4  DB 마이그레이션 ($ENVN DB · idempotent)"
NODE_ENV="$NODE_ENV" npm run migrate

echo "▶ 4/4  서비스 재시작 (pm2 $APP)"
pm2 restart "$APP" --update-env || pm2 start ecosystem.config.js --only "$APP"

echo "✅ [$ENVN] 배포 완료 → $(git log --oneline -1)"
