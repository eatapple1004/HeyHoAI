# 환경 분리 런북 — dev / staging / prod (전부 AWS)

목표: **dev / staging / prod** 3환경을 **AWS EC2에 각각 빌드**, **브랜치도 환경별로 분리**.
방식: 3환경 모두 현재 EC2 한 대에 공존(포트/DB/서브도메인/클론 분리) · 자체관리 Postgres에 DB만 분리(RDS 미사용) · pg_dump 백업 cron.

```
브랜치     환경     PM2 앱            포트   도메인               DB              클론 디렉터리
main    →  prod     heyhoai          3000   doppia.ai           (현행)          ~/HeyHoAI
staging →  stg      heyhoai-staging  3001   staging.doppia.ai   doppia_staging  ~/HeyHoAI-staging
develop →  dev      heyhoai-dev      3002   dev.doppia.ai       doppia_dev      ~/HeyHoAI-dev
```

환경은 **`NODE_ENV`** 로 결정되고 앱은 `.env.<NODE_ENV>` → `.env` 순으로 설정 로드(`src/config/index.js`). prod는 `.env.production`이 없으면 기존 `.env` 폴백 → **무변경**.

핵심 원리: **각 환경 = 자기 브랜치를 체크아웃한 독립 git 클론.** 그래서 dev/stg/prod가 서로 다른 코드 버전을 동시에 돌릴 수 있다(같은 EC2, 다른 폴더·포트·DB).

---

## 0. 브랜치 만들기 (로컬 또는 아무 데서나, 1회)
```bash
git checkout main && git pull
git branch develop && git push -u origin develop
git branch staging && git push -u origin staging
```
> 이후 흐름: `feature/*` → PR → **develop**(dev 배포) → PR → **staging**(stg 배포) → PR → **main**(prod 배포).

---

## 1. DB 3개 생성 (EC2에서, 1회)
```bash
sudo -u postgres psql
  CREATE DATABASE doppia_staging;
  CREATE DATABASE doppia_dev;
  GRANT ALL PRIVILEGES ON DATABASE doppia_staging TO <db_user>;
  GRANT ALL PRIVILEGES ON DATABASE doppia_dev     TO <db_user>;
  \q
```
> `<db_user>` = 현재 prod `DATABASE_URL`의 유저. prod DB는 그대로 둔다(변경 불필요).

---

## 2. dev / staging 클론 + 기동 (EC2에서, 각 1회)

### dev
```bash
cd ~
git clone <저장소 URL> HeyHoAI-dev
cd HeyHoAI-dev
git checkout develop
cp .env.development.example .env.development
#   .env.development 편집: DATABASE_URL=doppia_dev, PORT=3002, PUBLIC_URL=https://dev.doppia.ai,
#   COOKIE_SECURE=true, JWT_SECRET(고유), 결제 테스트키, 프로바이더 키.
npm ci
npm run migrate:dev
pm2 start ecosystem.config.js --only heyhoai-dev   # 포트 3002
pm2 save
```

### staging
```bash
cd ~
git clone <저장소 URL> HeyHoAI-staging
cd HeyHoAI-staging
git checkout staging
cp .env.staging.example .env.staging
#   .env.staging 편집: DATABASE_URL=doppia_staging, PORT=3001, PUBLIC_URL=https://staging.doppia.ai, ...
npm ci
npm run migrate:staging
pm2 start ecosystem.config.js --only heyhoai-staging   # 포트 3001
pm2 save
```

---

## 3. 서브도메인 + nginx (1회)
1. **Cloudflare DNS**: `dev`, `staging` A레코드 → EC2 퍼블릭 IP (Proxied, prod와 동일).
2. **nginx**:
   ```bash
   sudo cp ~/HeyHoAI-dev/deploy/nginx-dev-doppia.conf         /etc/nginx/sites-available/doppia-dev
   sudo cp ~/HeyHoAI-staging/deploy/nginx-staging-doppia.conf /etc/nginx/sites-available/doppia-staging
   sudo ln -s /etc/nginx/sites-available/doppia-dev     /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/doppia-staging /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   인증서는 prod의 `*.doppia.ai` 와일드카드가 `dev.`/`staging.`도 커버(재사용).

→ 확인: `https://dev.doppia.ai`, `https://staging.doppia.ai`.

---

## 4. 배포 (환경별)
각 클론 디렉터리에서 그 환경 명령만 실행:
```bash
cd ~/HeyHoAI-dev     && npm run deploy:dev        # git pull(develop) → npm ci → migrate:dev → pm2 restart heyhoai-dev
cd ~/HeyHoAI-staging && npm run deploy:staging    # (staging)
cd ~/HeyHoAI         && npm run deploy            # (main, prod)
```
> `deploy.sh`는 현재 클론의 체크아웃 브랜치를 `git pull`한다 — 각 클론이 자기 브랜치에 고정돼 있어야 함.

---

## 5. DB 백업 (자체관리라 필수)
```bash
chmod +x ~/HeyHoAI/deploy/backup-db.sh
crontab -e
#   매일 04:10, prod+staging+dev 덤프, 14일 보관
10 4 * * * /home/ubuntu/HeyHoAI/deploy/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```
> backup-db.sh는 prod+staging+dev 3개를 덤프(없는 DB는 건너뜀). DB 이름이 다르면 `PROD_DB/STAGING_DB/DEV_DB` env로 지정. 복원: `gunzip -c <파일>.sql.gz | psql <대상DB>`.

---

## 6. 환경별 값 요약

| 항목 | dev | staging | prod |
|---|---|---|---|
| 브랜치 | develop | staging | main |
| NODE_ENV | development | staging | production |
| PORT | 3002 | 3001 | 3000 |
| DB | doppia_dev | doppia_staging | 현행 |
| 도메인 | dev.doppia.ai | staging.doppia.ai | doppia.ai |
| 클론 | ~/HeyHoAI-dev | ~/HeyHoAI-staging | ~/HeyHoAI |
| 결제 | 테스트 | 테스트 | 라이브 |
| COOKIE_SECURE | true | true | true |

---

## 7. 리소스 주의 (같은 EC2 3환경)
- 현재 EC2 RAM ≈1GB + 스왑 2GB. 앱 3개 + creatorlink(8080)까지면 메모리 빠듯 → PM2 `max_memory_restart`로 dev/staging는 350M 제한. OOM 잦으면 인스턴스 상향 검토.
- (선택) 로컬 개발도 하려면 `npm run db:up`(docker Postgres) + `.env.development`을 로컬용으로.

## 8. 향후
- 트래픽/매출 커지면 DB를 **AWS RDS**로, dev/stg를 별 인스턴스로 격리.
- NestJS 점진 이관 시 `.env.<env>`는 그대로 재사용(= Spring `application-{profile}.yml`).
