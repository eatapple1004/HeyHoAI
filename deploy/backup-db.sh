#!/usr/bin/env bash
#
# 자체관리 Postgres 백업 — prod + staging DB를 pg_dump로 덤프하고 N일치만 보관.
#   자체관리 DB엔 RDS 같은 자동백업이 없으므로 이 스크립트를 cron으로 매일 돌린다.
#
# cron 등록 예 (매일 04:10):
#   crontab -e
#   10 4 * * * /home/ubuntu/HeyHoAI/deploy/backup-db.sh >> /home/ubuntu/backup.log 2>&1
#
# 환경변수(선택): BACKUP_DIR(기본 ~/db-backups), RETAIN_DAYS(기본 14),
#   PROD_DB(기본 doppia_prod), STAGING_DB(기본 doppia_staging), DEV_DB(기본 doppia_dev),
#   PGUSER 등 표준 libpq 변수. (없는 DB는 dump 실패해도 스크립트는 계속)
set -uo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/db-backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
PROD_DB="${PROD_DB:-doppia_prod}"
STAGING_DB="${STAGING_DB:-doppia_staging}"
DEV_DB="${DEV_DB:-doppia_dev}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

dump() {
  local db="$1"
  [ -z "$db" ] && return 0
  local out="$BACKUP_DIR/${db}_${STAMP}.sql.gz"
  echo "▶ dump $db → $out"
  # -Fc(커스텀) 대신 평문+gzip: 이식성↑, 어디서든 gunzip|psql 복원 가능.
  # 존재하지 않는 DB는 건너뜀(다른 환경 미구성 시에도 나머지는 백업되게).
  if pg_dump "$db" 2>/dev/null | gzip > "$out"; then :; else
    echo "  ⚠ $db 덤프 실패(미존재?) — 건너뜀"; rm -f "$out"
  fi
}

dump "$PROD_DB"
dump "$STAGING_DB"
dump "$DEV_DB"

# 보관기간 지난 덤프 삭제
find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+$RETAIN_DAYS" -delete 2>/dev/null || true
echo "✅ 백업 완료 ($STAMP). 보관 $RETAIN_DAYS일. 위치: $BACKUP_DIR"
echo "   복원 예:  gunzip -c <파일>.sql.gz | psql <대상DB>"
