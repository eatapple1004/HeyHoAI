#!/usr/bin/env bash
#
# Doppia 배포 스크립트 — npm ci로 고정.
#   npm install 대신 npm ci를 쓰는 이유:
#     · npm ci는 package-lock.json을 "읽기만" 함(수정 안 함) → 서버에서 lock이 dirty해져
#       git pull이 "local changes would be overwritten"으로 막히던 문제 재발 방지.
#     · node_modules를 지우고 lock 그대로 재현 → 매 배포가 결정적(deterministic).
#   전제: package.json ↔ package-lock.json 동기화 상태(어긋나면 npm ci가 즉시 실패로 알려줌).
#
# 사용: bash deploy/deploy.sh   (또는  npm run deploy)
set -euo pipefail

cd "$(dirname "$0")/.."   # 레포 루트로 이동
APP="heyhoai"            # ecosystem.config.js의 pm2 앱명

echo "▶ 1/4  최신 코드 가져오기 (git pull)"
# package-lock.json은 자동생성물 — 서버 로컬에 잔여 변경이 남아 있으면 버리고 커밋본을 사용.
# (npm ci로 전환하면 이 dirty는 더 안 생기지만, 과거 잔여분 안전 처리를 위한 1회성 가드)
git checkout -- package-lock.json 2>/dev/null || true
git pull --ff-only

echo "▶ 2/4  의존성 설치 (npm ci — lock 그대로, node_modules 재현)"
npm ci   # 이 레포는 devDependencies가 없어 별도 --omit 불필요

echo "▶ 3/4  DB 마이그레이션 (idempotent — IF NOT EXISTS)"
npm run migrate

echo "▶ 4/4  서비스 재시작 (pm2)"
pm2 restart "$APP" --update-env || pm2 start ecosystem.config.js

echo "✅ 배포 완료 → $(git log --oneline -1)"
