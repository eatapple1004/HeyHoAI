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

# ⚠️ 이 스크립트는 **실행 도중 자기 자신을 덮어쓴다** — git pull이 deploy.sh를 갱신할 수 있기 때문.
#   bash는 스크립트를 통째로 읽지 않고 **파일 오프셋을 기억하며 이어 읽는다.** pull로 파일 길이가
#   달라지면 다음 명령을 엉뚱한 위치에서 읽어 블록을 통째로 건너뛴다.
#   2026-08-14 실제 사고: staging 배포에서 "2.5/4 NestJS 빌드"가 조용히 스킵돼 dist/main.js가
#   없는 채로 pm2 delete→start 가 돌았고, 앱이 내려갔다(Script not found).
#   → pull은 여기서 끝내고, **갱신된 내용으로 스크립트를 다시 실행(exec)** 한 뒤 나머지를 진행한다.
#     재실행분은 DEPLOY_REEXECED로 구분해 pull을 반복하지 않는다(무한루프 방지).
if [ -z "${DEPLOY_REEXECED:-}" ]; then
  echo "▶ 배포 대상: $ENVN  (PM2=$APP, NODE_ENV=$NODE_ENV)"
  echo "▶ 1/4  최신 코드 가져오기 (git pull)"
  # package-lock.json은 자동생성물 — 잔여 로컬 변경이 있으면 버리고 커밋본 사용(pull 충돌 방지)
  git checkout -- package-lock.json 2>/dev/null || true
  git pull --ff-only

  # $0가 상대경로여도 안전하도록 절대경로로 굳혀서 재실행한다.
  SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  export DEPLOY_REEXECED=1
  exec bash "$SELF" "$@"
fi

echo "▶ 2/4  의존성 설치 (npm ci)"
npm ci

# 세 환경 모두 NestJS(strangler)로 구동 → nest/*.ts를 dist/로 빌드해야 함(pm2가 dist/main.js 실행).
#   dist/는 .gitignore라 git pull로 안 따라온다 — 여기서 만들지 않으면 pm2가 없는 파일을 실행한다.
echo "▶ 2.5/4  NestJS 빌드 (tsc → dist/)"
npm run build

echo "▶ 3/4  DB 마이그레이션 ($ENVN DB · idempotent)"
NODE_ENV="$NODE_ENV" npm run migrate

echo "▶ 4/4  서비스 재시작 (pm2 $APP)"
# ⚠️ pm2 restart는 **등록 당시의 script 경로를 그대로 유지**한다. ecosystem.config.js에서 script를
#   바꿔도(dev: src/index.js → dist/main.js) restart만으로는 반영되지 않아, dev가 NestJS가 아니라
#   레거시를 계속 돌리고 있는 걸 한참 못 알아챘다(2026-08-11 실측 — parity가 레거시끼리 비교되고 있었다).
#   그래서 매 배포마다 실제 script 경로를 확인하고, 어긋나면 등록을 다시 만든다.
WANT_SCRIPT=$(node -e "const a=require('./ecosystem.config.js').apps.find(x=>x.name==='$APP');process.stdout.write(a?a.script:'')")
# pm2 delete 는 되돌릴 수 없다 — 지운 뒤 start가 실패하면 앱이 내려간 채로 남는다.
#   (2026-08-14 staging: 빌드가 스킵돼 dist/main.js가 없는 상태로 delete→start 하다 서비스 중단)
#   그래서 실행할 파일이 실제로 있는지 **먼저** 확인하고, 없으면 손대지 않고 멈춘다.
if [ ! -f "$WANT_SCRIPT" ]; then
  echo "❌ 실행 파일이 없습니다: $WANT_SCRIPT"
  echo "   빌드가 실패했거나 건너뛰어졌습니다. 현재 프로세스는 그대로 두고 중단합니다."
  echo "   복구: npm run build && pm2 start ecosystem.config.js --only $APP"
  exit 1
fi
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
