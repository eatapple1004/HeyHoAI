# 환경 분리 런북 — dev / staging / prod

목표: **로컬(dev) / 스테이징(staging) / 운영(prod)** 3환경 분리. 지금은 로컬이 운영 DB를 그대로 써서 위험 → 완전 분리한다.
방식(선택 결과): **staging은 현재 EC2에 함께**(포트 3001) · **자체관리 Postgres에 DB만 분리**(RDS 미사용) · pg_dump 백업 cron.

```
dev(로컬)      localhost:3000  · Postgres(docker) doppia_dev       · .env.development
staging(sta)   staging.doppia.ai → 3001 · Postgres doppia_staging  · .env.staging   · PM2 heyhoai-staging
prod           doppia.ai → 3000         · Postgres doppia_prod(현행)· .env(또는 .env.production) · PM2 heyhoai
```

환경 선택은 **`NODE_ENV`** 로 결정되고, 앱은 시작 시 `.env.<NODE_ENV>` → `.env` 순으로 설정을 로드한다(`src/config/index.js`). prod에 `.env.production`이 없으면 기존처럼 `.env`만 로드 → **prod 무변경**.

---

## 1. dev(로컬) — 오늘 바로, 무료 · 운영DB 분리 ⚠️최우선

```bash
# 1) 로컬 Postgres 기동 (Docker Desktop 필요)
npm run db:up                    # docker compose up -d  → localhost:5432 / doppia_dev

# 2) 로컬 환경파일 생성
cp .env.development.example .env.development
#   DATABASE_URL 은 이미 로컬 DB로 채워져 있음. ANTHROPIC_API_KEY 등 필요한 키만 추가.

# 3) 스키마 생성 + 실행
npm run migrate                  # NODE_ENV=development → .env.development 의 로컬 DB에 스키마
npm run dev                      # NODE_ENV=development 로 로컬 기동
```
이제 로컬은 **운영 DB를 절대 건드리지 않는다.** (`.env.development`, `.env.staging`는 git 무시됨)

---

## 2. staging(sta) — 현재 EC2에 추가

핵심: prod와 staging이 **다른 코드 버전**을 돌리려면 **git 클론을 하나 더** 둔다(같은 EC2, 같은 Postgres 서버, 다른 DB·포트·디렉터리).

### 2-1. staging DB 생성 (EC2에서, 1회)
```bash
sudo -u postgres psql
  CREATE DATABASE doppia_staging;
  -- 기존 앱 DB유저에 권한 부여(유저명은 현재 prod DATABASE_URL 참고)
  GRANT ALL PRIVILEGES ON DATABASE doppia_staging TO <db_user>;
  \q
```
> (참고) 현재 운영 DB 이름이 `doppia_prod`가 아니라면 그대로 둬도 됨 — prod는 기존 `.env`를 계속 쓰므로 변경 불필요.

### 2-2. staging 코드 클론 (EC2에서, 1회)
```bash
cd ~
git clone <이 저장소 URL> HeyHoAI-staging
cd HeyHoAI-staging
git checkout develop            # staging은 develop 브랜치 배포(아래 4번 흐름). 없으면 main으로 시작.
cp .env.staging.example .env.staging
#   .env.staging 편집: DATABASE_URL(doppia_staging), JWT_SECRET(prod와 다르게),
#   결제 테스트키(EXIMBAY_ENV=test, PORTONE_ENABLED=false), 프로바이더 키.
```

### 2-3. staging 앱 기동 (EC2에서)
```bash
cd ~/HeyHoAI-staging
npm ci
npm run migrate:staging         # doppia_staging 에 스키마
pm2 start ecosystem.config.js --only heyhoai-staging   # 포트 3001
pm2 save
```

### 2-4. 서브도메인 + nginx (1회)
1. **Cloudflare DNS**: `staging` A레코드 → EC2 퍼블릭 IP (Proxied 주황구름 ON, prod와 동일).
2. **nginx**:
   ```bash
   sudo cp ~/HeyHoAI-staging/deploy/nginx-staging-doppia.conf /etc/nginx/sites-available/doppia-staging
   sudo ln -s /etc/nginx/sites-available/doppia-staging /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
   Origin 인증서는 prod의 `*.doppia.ai` 와일드카드가 `staging.doppia.ai`를 커버(재사용).

→ 확인: `https://staging.doppia.ai` 접속.

---

## 3. prod — 변경 없음(안전)

prod는 기존 `~/HeyHoAI` · `.env` · PM2 `heyhoai` 그대로. 배포 명령만 환경 인자가 붙었다:
```bash
cd ~/HeyHoAI
npm run deploy            # = bash deploy/deploy.sh prod  (git pull → npm ci → migrate → pm2 restart heyhoai)
```
> (선택) prod 설정을 명시적으로 `.env.production`으로 옮겨도 됨 — 안 옮기면 `.env` 폴백으로 동일 동작.

---

## 4. 배포 흐름 (권장)

```
feature/* ──PR──▶ develop ──(staging 클론에서 npm run deploy:staging)──▶ staging.doppia.ai 에서 검증
                    │
                    └──PR──▶ main ──(prod 클론에서 npm run deploy)──▶ doppia.ai
```
- staging 배포: `cd ~/HeyHoAI-staging && git checkout develop && npm run deploy:staging`
- prod 배포:    `cd ~/HeyHoAI && git checkout main && npm run deploy`
- `develop` 브랜치는 최초 1회 `git branch develop && git push -u origin develop` 로 만들면 됨.

---

## 5. DB 백업 (자체관리라 필수)

```bash
chmod +x ~/HeyHoAI/deploy/backup-db.sh
crontab -e
#   매일 04:10 prod+staging 덤프, 14일 보관
10 4 * * * /home/ubuntu/HeyHoAI/deploy/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```
복원: `gunzip -c ~/db-backups/<파일>.sql.gz | psql <대상DB>`

---

## 6. 환경별 값 차이 요약

| 항목 | dev | staging | prod |
|---|---|---|---|
| NODE_ENV | development | staging | production |
| PORT | 3000 | 3001 | 3000 |
| DB | doppia_dev(docker) | doppia_staging | 현행(doppia_prod) |
| 도메인 | localhost | staging.doppia.ai | doppia.ai |
| 결제 | 미사용 | **테스트/sandbox** | 라이브 |
| COOKIE_SECURE | false | true | true |
| 폴러 | OFF | ON | ON |
| 설정파일 | .env.development | .env.staging | .env(또는 .env.production) |

---

## 7. 향후 (지금은 안 함)
- 트래픽/매출 커지면 DB를 **AWS RDS**(자동백업·스냅샷)로 이전, staging도 별도 인스턴스로 격리.
- NestJS 이관 시 `.env.<env>`는 그대로 재사용(= Spring `application-{profile}.yml`, NestJS ConfigModule).
