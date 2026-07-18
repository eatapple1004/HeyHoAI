# On Model faceswap 워커 — 운영 가이드

설계 정본: `docs/onmodel_faceswap_설계_2026-07-18.md`. 이 문서는 "실제로 어떻게 켜고 지키나".

## 지금 상태 (2026-07-18)
- ✅ 코드 배포됨(upstream/main, 카드 게이트=비노출).
- ✅ prod `faceswap_jobs` 테이블 생성됨.
- ✅ 워커↔prod DB 폴링 연결 확인됨(tick 빈 큐 정상).
- ⏳ 남은 것: **R2 creds를 이 Mac에 두기** → 워커 기동 → 카드 노출 → 실측 1건.

## 워커가 하는 일
`faceswap_jobs` 큐를 폴링 → stage-1 이미지(웹이 R2에 저장)를 받아 → facefusion으로 선택 로스터 얼굴로 스왑 → 결과를 R2에 저장 + `generation_results`에 삽입(needs_human_review). 자기청소(좀비파일 0)·실패 시 크레딧 환불.

## 1) R2 creds 파일 만들기 (사용자/개발자, 1회)
`~/.doppia-r2.env` 생성 후 아래 채우기 — 값은 **prod 서버 `.env`** 또는 **Cloudflare 대시보드 → R2 → API 토큰**에서:
```
MEDIA_S3_BUCKET=doppia-media
MEDIA_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
MEDIA_S3_PUBLIC_BASE=<공개 CDN base가 있으면. 없으면 이 줄 생략(프록시 서빙)>
AWS_ACCESS_KEY_ID=<R2 토큰 id>
AWS_SECRET_ACCESS_KEY=<R2 토큰 secret>
```
> DB·config(DATABASE_URL·ANTHROPIC 등)는 러너가 `~/HeyHoAI-launch/.env`를 재사용하므로 다시 안 넣어도 됨.

## 2) 워커 기동
```bash
# 단발 테스트
bash ~/doppia-underwear/scripts/run-faceswap-worker.sh

# 상시 기동(권장) — 자동재시작·부팅생존
pm2 start ~/doppia-underwear/scripts/run-faceswap-worker.sh --name faceswap-worker --interpreter bash
pm2 save
pm2 logs faceswap-worker   # 모니터링
```

## 3) 카드 노출 해제 (워커 기동 확인 후)
`public/js/themes.js` 2곳에 `bodywear-on-model` 추가 + `public/studio.html`의 `recipes.generated.js?v=`·`themes.js?v=` 갱신 → push → 자동배포 + CF Purge.
> 순서 중요: **워커가 돌고 있어야** 노출. 안 그러면 사용자가 On Model 눌러도 큐에 쌓이기만 함(스톨 → 회수 → 환불).

## 4) 실측 1건 (e2e)
On Model 카드 → 제품 이미지 업로드 + 모델 선택 → 생성 → 몇 초 뒤 Library에 스왑 결과 등장 확인. `pm2 logs`에 `job ... done` + 좀비파일 0 확인.

## 확장 (나중)
같은 러너를 GPU 박스에서 실행 + 같은 prod DB·R2 가리키면 끝(웹 코드 변경 0). `FACEFUSION_PROVIDERS=cuda`로 GPU. 워커 여러 대 = 큐(SKIP LOCKED)가 안전하게 분배.

## 트러블슈팅
- `job failed: source face not found` → 로스터 이미지 경로/파일 확인.
- `job failed: stage-1 not found` → R2 미설정 or 웹이 R2에 저장 안 함(MEDIA_S3 확인).
- 워커가 안 뜸 → `~/.doppia-r2.env`의 `MEDIA_S3_BUCKET` 확인. config 필수키(JWT_SECRET 등)는 `~/HeyHoAI-launch/.env`에 있어야.
