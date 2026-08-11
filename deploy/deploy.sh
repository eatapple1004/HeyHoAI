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

# dev는 NestJS(strangler)로 구동 → nest/*.ts를 dist/로 빌드해야 함(pm2가 dist/main.js 실행).
#   prod/staging은 src/index.js 직접 실행이라 빌드 불필요.
if [ "$ENVN" = "dev" ]; then
  echo "▶ 2.5/4  NestJS 빌드 (tsc → dist/)"
  npm run build
fi

echo "▶ 3/4  DB 마이그레이션 ($ENVN DB · idempotent)"
NODE_ENV="$NODE_ENV" npm run migrate

echo "▶ 4/4  서비스 재시작 (pm2 $APP)"
# ⚠️ pm2 restart는 **등록 당시의 script 경로를 그대로 유지**한다. ecosystem.config.js에서 script를
#   바꿔도(dev: src/index.js → dist/main.js) restart만으로는 반영되지 않아, dev가 NestJS가 아니라
#   레거시를 계속 돌리고 있는 걸 한참 못 알아챘다(2026-08-11 실측 — parity가 레거시끼리 비교되고 있었다).
#   그래서 매 배포마다 실제 script 경로를 확인하고, 어긋나면 등록을 다시 만든다.
WANT_SCRIPT=$(node -e "const a=require('./ecosystem.config.js').apps.find(x=>x.name==='$APP');process.stdout.write(a?a.script:'')")
CUR_SCRIPT=$(pm2 jlist 2>/dev/null | node -e "
  let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
    try { const a=JSON.parse(s).find(x=>x.name==='$APP'); process.stdout.write(a?a.pm2_env.pm_exec_path:''); } catch (_) {}
  });")
if [ -n "$CUR_SCRIPT" ] && [ "$CUR_SCRIPT" != "$(pwd)/$WANT_SCRIPT" ]; then
  echo "   ⚠️ script 경로 불일치 — 등록 재생성"
  echo "      현재: $CUR_SCRIPT"
  echo "      기대: $(pwd)/$WANT_SCRIPT"
  pm2 delete "$APP" || true
  pm2 start ecosystem.config.js --only "$APP"
else
  pm2 restart "$APP" --update-env || pm2 start ecosystem.config.js --only "$APP"
fi
pm2 save >/dev/null 2>&1 || true
echo "   실행 스크립트: $(pm2 jlist 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const a=JSON.parse(s).find(x=>x.name==='$APP');console.log(a?a.pm2_env.pm_exec_path:'?')}catch(_){console.log('?')}});")"

echo "✅ [$ENVN] 배포 완료 → $(git log --oneline -1)"
